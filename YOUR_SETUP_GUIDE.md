# 🎯 Your Personalized LittleWatch Setup Guide
## For IP Address: 192.168.18.180

This guide is customized for YOUR specific network configuration!

---

## ✅ STEP 1: Backend Setup (XAMPP)

### 1.1 Start XAMPP MySQL
- Open **XAMPP Control Panel**
- Click **Start** next to **MySQL** (should turn green)

### 1.2 Create Database in phpMyAdmin
1. Open browser → http://localhost/phpmyadmin
2. Click **"New"** in left sidebar
3. Database name: `littlewatch_db`
4. Click **"Create"**
5. Click on `littlewatch_db`
6. Click **"Import"** tab
7. Choose file: `database/schema.sql`
8. Click **"Go"**
9. ✅ Success! Should see 7 tables created

### 1.3 Install Backend Dependencies
```bash
cd littlewatch-backend
npm install
```

### 1.4 Use Your Pre-Configured .env File
✅ **Good news!** Your `.env` file is already configured with:
- Your IP: `192.168.18.180`
- XAMPP MySQL settings
- CORS for React Native

Just verify the file exists and you're good to go!

### 1.5 Start Backend Server
```bash
npm run dev
```

**You should see:**
```
🚀 LittleWatch Backend Server
📡 Server running on port 3000
✅ Database connected successfully
```

### 1.6 Add Test Data
```bash
npm run seed
```

### 1.7 Test Everything
```bash
npm test
```

All tests should pass! ✅

---

## ✅ STEP 2: React Native App Configuration

### 2.1 Update API Service

In your React Native project, create/update `services/api.js`:

```javascript
import axios from 'axios';

// ✅ YOUR PERSONALIZED API URL
const API_BASE_URL = 'http://192.168.18.180:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Add token to requests
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  }
);

export const authAPI = {
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
};

export const deviceAPI = {
  getAll: () => api.get('/devices'),
};

export const vitalsAPI = {
  getLatest: (deviceId) => api.get(`/vitals/latest/${deviceId}`),
  getHistory: (deviceId, params) => api.get(`/vitals/history/${deviceId}`, { params }),
};

export const notificationsAPI = {
  getAll: () => api.get('/notifications'),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
};

export default api;
```

### 2.2 Update Socket Service

Create/update `services/socket.js`:

```javascript
import io from 'socket.io-client';

// ✅ YOUR PERSONALIZED SOCKET URL
const SOCKET_URL = 'http://192.168.18.180:3000';

class SocketService {
  constructor() {
    this.socket = null;
  }

  connect(userId) {
    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
    });
    
    this.socket.on('connect', () => {
      console.log('✅ Socket connected');
      this.socket.emit('join_user_room', userId);
    });

    this.socket.on('vital_alert', (data) => {
      console.log('🚨 Alert received:', data);
      // Handle alert in your app
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}

export default new SocketService();
```

### 2.3 Install Required Packages

```bash
cd final_MobileApp-main
npm install axios socket.io-client @react-native-async-storage/async-storage
```

---

## ✅ STEP 3: ESP32 Configuration

Update your Arduino code (`arduino/littlewatch_esp32/littlewatch_esp32.ino`):

```cpp
// WiFi Configuration
const char* WIFI_SSID = "YOUR_WIFI_NAME_HERE";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD_HERE";

// ✅ YOUR PERSONALIZED SERVER URL
const char* SERVER_URL = "http://192.168.18.180:3000/api/vitals/record";

// Device Identifier
const char* DEVICE_SERIAL = "LITTLEWATCH_001";
```

**Important:** 
- Replace `YOUR_WIFI_NAME_HERE` with your actual WiFi name
- Replace `YOUR_WIFI_PASSWORD_HERE` with your actual WiFi password
- Make sure it's the SAME WiFi network as your computer (192.168.18.x)

---

## ✅ STEP 4: Testing Everything

### 4.1 Test Backend API
Open browser or use curl:

```bash
# Health Check
http://192.168.18.180:3000/health

# Or with curl
curl http://192.168.18.180:3000/health
```

Should return:
```json
{
  "status": "OK",
  "timestamp": "2025-01-01T12:00:00.000Z",
  "uptime": 45.123
}
```

### 4.2 Test Login
```bash
curl -X POST http://192.168.18.180:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

### 4.3 Test Mobile App
1. Make sure your phone is on the SAME WiFi (should have IP like 192.168.18.x)
2. Run your app: `npx expo start`
3. Try to login with:
   - Email: `test@example.com`
   - Password: `test123`

---

## 🔧 Your Network Configuration Summary

```
┌─────────────────────────────────────────┐
│  YOUR LITTLEWATCH NETWORK SETUP         │
├─────────────────────────────────────────┤
│                                         │
│  Computer IP:    192.168.18.180        │
│  Backend Port:   3000                   │
│  Database:       XAMPP MySQL            │
│                                         │
│  Full API URL:                          │
│  http://192.168.18.180:3000/api        │
│                                         │
│  Socket.IO URL:                         │
│  http://192.168.18.180:3000            │
│                                         │
│  Test Account:                          │
│  Email:    test@example.com            │
│  Password: test123                      │
│                                         │
└─────────────────────────────────────────┘
```

---

## ✅ Quick Test Checklist

Run through this checklist:

- [ ] XAMPP MySQL is running (green in control panel)
- [ ] phpMyAdmin opens (http://localhost/phpmyadmin)
- [ ] Database `littlewatch_db` exists with 7 tables
- [ ] Backend server running (`npm run dev`)
- [ ] Test data loaded (`npm run seed`)
- [ ] Health check works (http://192.168.18.180:3000/health)
- [ ] API tests pass (`npm test`)
- [ ] Mobile app has correct IP in api.js
- [ ] Mobile app has correct IP in socket.js
- [ ] Phone is on same WiFi network

---

## 📱 URLs to Use in Your Apps

### React Native App:
```javascript
API_BASE_URL = 'http://192.168.18.180:3000/api'
SOCKET_URL = 'http://192.168.18.180:3000'
```

### ESP32 Arduino:
```cpp
SERVER_URL = "http://192.168.18.180:3000/api/vitals/record"
```

### Browser Testing:
```
http://192.168.18.180:3000/health
http://localhost/phpmyadmin
```

---

## 🆘 Troubleshooting

### Problem: "Network request failed" in mobile app
✅ **Check:**
1. Phone on same WiFi? (Should be 192.168.18.x)
2. Backend server running?
3. IP address correct in api.js and socket.js?
4. Computer firewall blocking port 3000?

### Problem: "Cannot connect to database"
✅ **Check:**
1. XAMPP MySQL running (green)?
2. .env has `DB_PASSWORD=` (empty)
3. Database `littlewatch_db` exists?

### Problem: ESP32 can't connect
✅ **Check:**
1. WiFi credentials correct in code?
2. Same WiFi as computer?
3. Server URL has correct IP (192.168.18.180)?
4. Serial Monitor shows connection attempts?

---

## 🎉 You're Ready!

Everything is configured for YOUR network (192.168.18.180)!

### Next Steps:
1. ✅ Backend running with XAMPP
2. ✅ Test data loaded
3. ✅ Mobile app configured with your IP
4. ✅ Test login works
5. ✅ Build your APK!

---

## 📚 Need More Help?

- **XAMPP issues?** → See XAMPP_SETUP.md
- **API questions?** → See API_DOCUMENTATION.md
- **Mobile app integration?** → See REACT_NATIVE_INTEGRATION.md
- **General help?** → See README.md

---

**Your Backend is Ready at:** `http://192.168.18.180:3000` 🚀

**Made for LittleWatch Project** 👶💙
