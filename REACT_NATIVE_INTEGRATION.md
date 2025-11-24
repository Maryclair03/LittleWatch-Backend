# React Native App Integration Guide

This guide shows you exactly how to connect your existing LittleWatch React Native app to the backend.

## 📦 Step 1: Install Required Packages

```bash
cd final_MobileApp-main
npm install axios socket.io-client @react-native-async-storage/async-storage
```

## 📁 Step 2: Create API Service Files

### Create `services/api.js`

```javascript
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// IMPORTANT: Replace with your computer's IP address
// Find it with: ipconfig (Windows) or ifconfig (Mac/Linux)
const API_BASE_URL = 'http://192.168.1.XXX:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Add token to all requests
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');
      // Navigate to login screen
    }
    return Promise.reject(error);
  }
);

// Authentication APIs
export const authAPI = {
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
};

// Device APIs
export const deviceAPI = {
  register: (data) => api.post('/devices/register', data),
  getAll: () => api.get('/devices'),
  getDetails: (deviceId) => api.get(`/devices/${deviceId}`),
  update: (deviceId, data) => api.put(`/devices/${deviceId}`, data),
  delete: (deviceId) => api.delete(`/devices/${deviceId}`),
  updateThresholds: (deviceId, data) => 
    api.put(`/devices/${deviceId}/thresholds`, data),
};

// Vital Signs APIs
export const vitalsAPI = {
  getLatest: (deviceId) => api.get(`/vitals/latest/${deviceId}`),
  getHistory: (deviceId, params) => 
    api.get(`/vitals/history/${deviceId}`, { params }),
  getDailyAverage: (deviceId, days = 7) => 
    api.get(`/vitals/daily-average/${deviceId}`, { params: { days } }),
};

// Notifications APIs
export const notificationsAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  markAsRead: (notificationId) => 
    api.put(`/notifications/${notificationId}/read`),
  markAllAsRead: () => api.put('/notifications/mark-all-read'),
  clearAll: () => api.delete('/notifications/clear-all'),
};

// User Profile APIs
export const userAPI = {
  getProfile: () => api.get('/user/profile'),
  updateProfile: (data) => api.put('/user/profile', data),
  changePassword: (data) => api.put('/user/change-password', data),
  getActivity: (limit = 50) => 
    api.get('/user/activity', { params: { limit } }),
};

export default api;
```

### Create `services/socket.js`

```javascript
import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

// IMPORTANT: Replace with your computer's IP address
const SOCKET_URL = 'http://192.168.1.XXX:3000';

class SocketService {
  constructor() {
    this.socket = null;
    this.userId = null;
    this.listeners = {};
  }

  async connect() {
    try {
      // Get user ID from storage
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        this.userId = user.userId;
      }

      if (!this.userId) {
        console.log('No user ID found, cannot connect socket');
        return;
      }

      // Connect to socket
      this.socket = io(SOCKET_URL, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      });

      // Setup event listeners
      this.socket.on('connect', () => {
        console.log('✅ Socket connected');
        this.socket.emit('join_user_room', this.userId);
      });

      this.socket.on('disconnect', () => {
        console.log('❌ Socket disconnected');
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
      });

      // Listen for vital alerts
      this.socket.on('vital_alert', (data) => {
        console.log('🚨 Vital alert received:', data);
        
        // Trigger all registered alert listeners
        if (this.listeners.vital_alert) {
          this.listeners.vital_alert.forEach(callback => callback(data));
        }
      });

    } catch (error) {
      console.error('Error connecting socket:', error);
    }
  }

  disconnect() {
    if (this.socket) {
      if (this.userId) {
        this.socket.emit('leave_user_room', this.userId);
      }
      this.socket.disconnect();
      this.socket = null;
      console.log('Socket disconnected');
    }
  }

  // Add listener for vital alerts
  onVitalAlert(callback) {
    if (!this.listeners.vital_alert) {
      this.listeners.vital_alert = [];
    }
    this.listeners.vital_alert.push(callback);
  }

  // Remove all listeners
  removeAllListeners() {
    this.listeners = {};
  }
}

export default new SocketService();
```

## 🔄 Step 3: Update Your Screens

### Update `LoginScreen.js`

```javascript
import { authAPI } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import socketService from '../services/socket';

// In your handleLogin function:
const handleLogin = async () => {
  try {
    setLoading(true);
    
    const response = await authAPI.login({
      email,
      password
    });

    const { data } = response.data;
    
    // Save token and user data
    await AsyncStorage.setItem('userToken', data.token);
    await AsyncStorage.setItem('userData', JSON.stringify(data));

    // Connect socket for real-time updates
    await socketService.connect();

    // Navigate to home
    navigation.replace('Home');
    
  } catch (error) {
    const message = error.response?.data?.message || 'Login failed';
    Alert.alert('Error', message);
  } finally {
    setLoading(false);
  }
};
```

### Update `SignupScreen.js`

```javascript
import { authAPI } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// In your handleNext function:
const handleNext = async () => {
  try {
    setLoading(true);
    
    const response = await authAPI.signup({
      name,
      email,
      password,
      phoneNumber,
      countryCode,
      dateOfBirth,
      gender,
      country,
      address
    });

    const { data } = response.data;
    
    // Save token and user data
    await AsyncStorage.setItem('userToken', data.token);
    await AsyncStorage.setItem('userData', JSON.stringify(data));

    // Navigate to success screen
    navigation.navigate('SuccessModal');
    
  } catch (error) {
    const message = error.response?.data?.message || 'Signup failed';
    Alert.alert('Error', message);
  } finally {
    setLoading(false);
  }
};
```

### Update `HomeScreen.js`

```javascript
import { useState, useEffect } from 'react';
import { deviceAPI, vitalsAPI } from '../services/api';
import socketService from '../services/socket';

export default function HomeScreen({ navigation }) {
  const [heartRate, setHeartRate] = useState(0);
  const [temperature, setTemperature] = useState(0);
  const [oxygenSaturation, setOxygenSaturation] = useState(0);
  const [movement, setMovement] = useState('Normal');
  const [batteryLevel, setBatteryLevel] = useState(100);
  const [deviceConnected, setDeviceConnected] = useState(false);
  const [deviceId, setDeviceId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch device and latest vitals on mount
  useEffect(() => {
    fetchDeviceAndVitals();
    
    // Setup socket listener for real-time alerts
    socketService.onVitalAlert(handleVitalAlert);
    
    // Refresh vitals every 5 seconds
    const interval = setInterval(fetchLatestVitals, 5000);
    
    return () => {
      clearInterval(interval);
      socketService.removeAllListeners();
    };
  }, []);

  const fetchDeviceAndVitals = async () => {
    try {
      // Get user's devices
      const devicesResponse = await deviceAPI.getAll();
      const devices = devicesResponse.data.data;
      
      if (devices.length > 0) {
        const device = devices[0]; // Use first device
        setDeviceId(device.device_id);
        setBatteryLevel(device.battery_level);
        setDeviceConnected(device.is_connected);
        
        // Get latest vitals
        await fetchLatestVitals(device.device_id);
      }
    } catch (error) {
      console.error('Error fetching device:', error);
      Alert.alert('Error', 'Failed to fetch device data');
    } finally {
      setLoading(false);
    }
  };

  const fetchLatestVitals = async (devId = deviceId) => {
    if (!devId) return;
    
    try {
      const response = await vitalsAPI.getLatest(devId);
      const { vitals, device } = response.data.data;
      
      setHeartRate(vitals.heart_rate || 0);
      setTemperature(vitals.temperature || 0);
      setOxygenSaturation(vitals.oxygen_saturation || 0);
      setMovement(vitals.movement_status || 'Normal');
      setBatteryLevel(device.battery_level || 100);
      setDeviceConnected(device.is_connected || false);
      
    } catch (error) {
      console.error('Error fetching vitals:', error);
    }
  };

  const handleVitalAlert = (alertData) => {
    // Show alert notification
    const { alerts, vitals } = alertData;
    
    if (alerts && alerts.length > 0) {
      const firstAlert = alerts[0];
      Alert.alert(
        firstAlert.title,
        firstAlert.message,
        [{ text: 'OK' }]
      );
      
      // Update vitals with latest data
      setHeartRate(vitals.heartRate);
      setTemperature(vitals.temperature);
      setOxygenSaturation(vitals.oxygenSaturation);
      setMovement(vitals.movementStatus);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0091EA" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // ... rest of your HomeScreen component
}
```

### Update `NotificationsScreen.js`

```javascript
import { notificationsAPI } from '../services/api';

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await notificationsAPI.getAll();
      setNotifications(response.data.data.notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      Alert.alert('Error', 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await notificationsAPI.markAsRead(notificationId);
      
      // Update local state
      setNotifications(notifications.map(notif => 
        notif.notification_id === notificationId 
          ? { ...notif, is_read: true } 
          : notif
      ));
    } catch (error) {
      console.error('Error marking notification:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications(notifications.map(notif => ({ ...notif, is_read: true })));
      Alert.alert('Success', 'All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
      Alert.alert('Error', 'Failed to mark notifications as read');
    }
  };

  const clearAll = async () => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await notificationsAPI.clearAll();
              setNotifications([]);
            } catch (error) {
              console.error('Error clearing notifications:', error);
              Alert.alert('Error', 'Failed to clear notifications');
            }
          },
        },
      ]
    );
  };

  // ... rest of your NotificationsScreen component
}
```

### Update `VitalsTimelineScreen.js`

```javascript
import { vitalsAPI } from '../services/api';

export default function VitalsTimelineScreen({ navigation, route }) {
  const { deviceId } = route.params; // Pass deviceId from HomeScreen
  const [selectedPeriod, setSelectedPeriod] = useState('24H');
  const [timelineData, setTimelineData] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [selectedPeriod]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await vitalsAPI.getHistory(deviceId, {
        period: selectedPeriod,
        limit: 100
      });
      
      const { readings, summary } = response.data.data;
      
      // Format data for display
      const formattedData = readings.map(reading => ({
        time: new Date(reading.timestamp).toLocaleTimeString(),
        date: new Date(reading.timestamp).toLocaleDateString(),
        vitals: {
          heartRate: reading.heart_rate,
          temperature: reading.temperature,
          oxygen: reading.oxygen_saturation,
          movement: reading.movement_status
        }
      }));
      
      setTimelineData(formattedData);
      setSummary(summary);
      
    } catch (error) {
      console.error('Error fetching history:', error);
      Alert.alert('Error', 'Failed to fetch history');
    } finally {
      setLoading(false);
    }
  };

  // ... rest of your VitalsTimelineScreen component
}
```

## 🔧 Step 4: Update App.js

Add socket connection on app start:

```javascript
import { useEffect } from 'react';
import socketService from './services/socket';

export default function App() {
  useEffect(() => {
    // Connect socket when app starts
    socketService.connect();
    
    // Cleanup on app close
    return () => {
      socketService.disconnect();
    };
  }, []);

  // ... rest of your App component
}
```

## 📝 Step 5: Configure Backend URL

**IMPORTANT:** Find your computer's IP address:

**Windows:**
```bash
ipconfig
# Look for IPv4 Address under your active network
```

**Mac/Linux:**
```bash
ifconfig
# or
ip addr show
# Look for inet address
```

Then update BOTH:
1. `services/api.js` - Update `API_BASE_URL`
2. `services/socket.js` - Update `SOCKET_URL`

Example: If your IP is `192.168.1.105`:
```javascript
const API_BASE_URL = 'http://192.168.1.105:3000/api';
const SOCKET_URL = 'http://192.168.1.105:3000';
```

## ✅ Testing Checklist

Before building APK:

1. **Backend Running**
   - [ ] MySQL server running
   - [ ] Node.js server running (`npm run dev`)
   - [ ] Test data seeded (`npm run seed`)

2. **Mobile App**
   - [ ] Dependencies installed
   - [ ] API URL configured with correct IP
   - [ ] Socket URL configured
   - [ ] App running (`npx expo start`)

3. **Test Flow**
   - [ ] Login with test@example.com / test123
   - [ ] See device connected
   - [ ] View latest vitals
   - [ ] Check notifications
   - [ ] View history timeline

4. **ESP32 (Optional for now)**
   - [ ] Can test without ESP32 using test data
   - [ ] For real data: ESP32 configured and running

## 🐛 Troubleshooting

### "Network request failed"
- ✅ Check API_BASE_URL has correct IP
- ✅ Ensure backend server is running
- ✅ Both devices on same WiFi network
- ✅ Disable VPN if active

### "401 Unauthorized"
- ✅ Token may be expired (logout and login again)
- ✅ Check AsyncStorage has valid token

### No real-time alerts
- ✅ Check socket connection in console
- ✅ Verify SOCKET_URL is correct
- ✅ Ensure socketService.connect() is called

### "Device not found"
- ✅ Run seed script to create test device
- ✅ Or register device via API

## 📱 Building APK

Once everything works:

```bash
# For Android
eas build --platform android

# Or using Expo
expo build:android
```

## 🎉 You're Done!

Your React Native app is now fully connected to the backend and ready to:
- ✅ Authenticate users
- ✅ Display real-time vitals
- ✅ Show notifications
- ✅ Track history
- ✅ Receive real-time alerts

---

**Need Help?** Check the main README.md or API_DOCUMENTATION.md
