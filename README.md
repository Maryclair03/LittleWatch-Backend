# LittleWatch Backend System

Complete backend system for LittleWatch IoT-based infant vital signs monitoring system.

## 📋 Table of Contents
- [System Overview](#system-overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Database Setup](#database-setup)
- [Configuration](#configuration)
- [Running the Server](#running-the-server)
- [Arduino/ESP32 Setup](#arduinoesp32-setup)
- [API Documentation](#api-documentation)
- [Mobile App Integration](#mobile-app-integration)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

## 🎯 System Overview

LittleWatch is an IoT-based infant monitoring system that tracks:
- **Heart Rate** (using MAX30102)
- **Oxygen Saturation (SpO2)** (using MAX30102)
- **Body Temperature** (using MAX30205)
- **Movement/Activity** (using MPU6050)

The system sends real-time alerts when vital signs exceed safe thresholds.

## ✨ Features

- ✅ User authentication (signup/login with JWT)
- ✅ Real-time vital signs monitoring
- ✅ Smart alert system with customizable thresholds
- ✅ Historical data tracking and analytics
- ✅ Push notifications via Socket.IO
- ✅ Device management
- ✅ Multi-device support per user
- ✅ Activity logging
- ✅ RESTful API

## 🛠 Technology Stack

**Backend:**
- Node.js (Express.js)
- MySQL Database
- Socket.IO (real-time communication)
- JWT (authentication)
- bcrypt (password hashing)

**Hardware:**
- ESP32-C3 Super Mini
- MAX30102 (Heart Rate & SpO2)
- MAX30205 (Temperature)
- MPU6050 (Movement)

## 📦 Prerequisites

Before installation, ensure you have:

1. **Node.js** (v14 or higher)
   ```bash
   node --version
   ```

2. **MySQL** (v8.0 or higher)
   ```bash
   mysql --version
   ```

3. **npm** or **yarn**
   ```bash
   npm --version
   ```

4. **Arduino IDE** (for ESP32 programming)
   - Download from: https://www.arduino.cc/en/software

5. **ESP32 Board Support** in Arduino IDE

## 🚀 Installation

### 1. Clone or Download the Backend

```bash
cd littlewatch-backend
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages listed in `package.json`.

## 🗄 Database Setup

### 1. Start MySQL Server

**Windows:**
```bash
net start MySQL80
```

**Mac/Linux:**
```bash
sudo systemctl start mysql
# or
sudo service mysql start
```

### 2. Login to MySQL

```bash
mysql -u root -p
```

### 3. Create Database and Tables

```bash
mysql -u root -p < database/schema.sql
```

Or manually:
```sql
source /path/to/littlewatch-backend/database/schema.sql
```

### 4. Verify Database Creation

```sql
USE littlewatch_db;
SHOW TABLES;
```

You should see:
- users
- devices
- vital_readings
- notifications
- sleep_sessions
- threshold_settings
- activity_log

## ⚙️ Configuration

### 1. Create Environment File

Copy the example environment file:

```bash
cp .env.example .env
```

### 2. Edit `.env` File

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password_here
DB_NAME=littlewatch_db
DB_PORT=3306

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_EXPIRE=7d

# CORS Configuration (for React Native)
ALLOWED_ORIGINS=http://localhost:19000,http://localhost:19001,http://192.168.1.100:19000

# Alert Thresholds (Default values)
HEART_RATE_MIN=80
HEART_RATE_MAX=140
TEMPERATURE_MIN=36.0
TEMPERATURE_MAX=37.8
OXYGEN_MIN=90
```

**Important:** 
- Replace `your_mysql_password_here` with your actual MySQL password
- Change `JWT_SECRET` to a strong random string
- Update `ALLOWED_ORIGINS` with your React Native dev server IP

## ▶️ Running the Server

### Development Mode (with auto-restart)

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

You should see:
```
=================================
🚀 LittleWatch Backend Server
📡 Server running on port 3000
🌍 Environment: development
🔌 Socket.IO enabled
✅ Database connected successfully
=================================
```

### Test the Server

Open browser or use curl:
```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "OK",
  "timestamp": "2025-01-01T12:00:00.000Z",
  "uptime": 45.123
}
```

## 🔌 Arduino/ESP32 Setup

### 1. Install Required Libraries

In Arduino IDE, go to **Tools > Manage Libraries** and install:

- `Adafruit MAX30105` (for MAX30102)
- `MAX30205 by Alhajhassan` (for temperature sensor)
- `MPU6050 by Electronic Cats`
- `ArduinoJson` by Benoit Blanchon
- `WiFi` (built-in for ESP32)
- `HTTPClient` (built-in for ESP32)

### 2. Configure ESP32 Board

1. Go to **File > Preferences**
2. Add to **Additional Board Manager URLs**:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
3. Go to **Tools > Board > Board Manager**
4. Search for "esp32" and install

### 3. Edit Arduino Code

Open `arduino/littlewatch_esp32/littlewatch_esp32.ino` and update:

```cpp
// WiFi credentials
const char* WIFI_SSID = "Your_WiFi_Name";
const char* WIFI_PASSWORD = "Your_WiFi_Password";

// Server URL (your computer's IP address)
const char* SERVER_URL = "http://192.168.1.100:3000/api/vitals/record";

// Unique device identifier
const char* DEVICE_SERIAL = "LITTLEWATCH_001";
```

**To find your IP address:**
- Windows: `ipconfig`
- Mac/Linux: `ifconfig` or `ip addr show`

### 4. Wiring Diagram

```
ESP32-C3 Connections:
├── MAX30102 (Heart Rate & SpO2)
│   ├── VIN  → 3.3V
│   ├── GND  → GND
│   ├── SDA  → GPIO 8 (SDA)
│   └── SCL  → GPIO 9 (SCL)
│
├── MAX30205 (Temperature)
│   ├── VIN  → 3.3V
│   ├── GND  → GND
│   ├── SDA  → GPIO 8 (SDA)
│   └── SCL  → GPIO 9 (SCL)
│
└── MPU6050 (Movement)
    ├── VCC  → 3.3V
    ├── GND  → GND
    ├── SDA  → GPIO 8 (SDA)
    └── SCL  → GPIO 9 (SCL)
```

### 5. Upload Code

1. Connect ESP32-C3 via USB
2. Select **Tools > Board > ESP32C3 Dev Module**
3. Select the correct **Port**
4. Click **Upload** button

### 6. Monitor Serial Output

Open **Tools > Serial Monitor** (115200 baud) to see:
```
LittleWatch - Initializing...
Connecting to WiFi...
✅ WiFi Connected!
IP Address: 192.168.1.105
✅ MAX30102 initialized
✅ MAX30205 initialized
✅ MPU6050 initialized
✅ System Ready!
```

## 📡 API Documentation

### Base URL
```
http://localhost:3000/api
```

### Authentication Endpoints

#### 1. Register User
```http
POST /auth/signup
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phoneNumber": "9123456789",
  "countryCode": "+63",
  "dateOfBirth": "1990-01-01",
  "gender": "Male",
  "country": "Philippines",
  "address": "123 Main St"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "userId": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### 2. Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

### Device Endpoints

#### Register Device
```http
POST /devices/register
Authorization: Bearer {token}
Content-Type: application/json

{
  "deviceSerial": "LITTLEWATCH_001",
  "deviceName": "Baby's Watch"
}
```

### Vital Signs Endpoints

#### Get Latest Vitals
```http
GET /vitals/latest/{deviceId}
Authorization: Bearer {token}
```

#### Get Vitals History
```http
GET /vitals/history/{deviceId}?period=24H&limit=100
Authorization: Bearer {token}
```

### Notifications Endpoints

#### Get Notifications
```http
GET /notifications
Authorization: Bearer {token}
```

#### Mark as Read
```http
PUT /notifications/{notificationId}/read
Authorization: Bearer {token}
```

## 📱 Mobile App Integration

### 1. Install axios in React Native

```bash
npm install axios socket.io-client
```

### 2. Create API Service

```javascript
// services/api.js
import axios from 'axios';

const API_BASE_URL = 'http://192.168.1.100:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = // get token from storage
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
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

### 3. Setup Socket.IO for Real-time Updates

```javascript
// services/socket.js
import io from 'socket.io-client';

const SOCKET_URL = 'http://192.168.1.100:3000';

class SocketService {
  constructor() {
    this.socket = null;
  }

  connect(userId) {
    this.socket = io(SOCKET_URL);
    
    this.socket.on('connect', () => {
      console.log('Socket connected');
      this.socket.emit('join_user_room', userId);
    });

    this.socket.on('vital_alert', (data) => {
      // Handle real-time alerts
      console.log('Alert received:', data);
      // Show notification to user
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

## 🧪 Testing

### Test User Registration
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "test123"
  }'
```

### Test Device Data Submission (ESP32 simulation)
```bash
curl -X POST http://localhost:3000/api/vitals/record \
  -H "Content-Type: application/json" \
  -d '{
    "deviceSerial": "LITTLEWATCH_001",
    "heartRate": 120,
    "temperature": 36.8,
    "oxygenSaturation": 98,
    "movementStatus": "Normal",
    "movementIntensity": 0.15,
    "batteryLevel": 85
  }'
```

## 🔧 Troubleshooting

### Database Connection Issues

**Error:** "Access denied for user 'root'@'localhost'"
```bash
# Reset MySQL root password
mysql -u root
ALTER USER 'root'@'localhost' IDENTIFIED BY 'new_password';
FLUSH PRIVILEGES;
```

### ESP32 Not Connecting to WiFi

1. Check WiFi credentials in code
2. Ensure WiFi is 2.4GHz (ESP32 doesn't support 5GHz)
3. Check Serial Monitor for error messages

### Sensors Not Reading

1. Verify I2C connections
2. Use I2C scanner sketch to detect devices
3. Check power supply (3.3V)

### Port Already in Use

```bash
# Kill process using port 3000
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:3000 | xargs kill -9
```

## 📝 Notes

- Always use `.env` for sensitive data
- Never commit `.env` to version control
- Change default JWT secret in production
- Use HTTPS in production
- Implement rate limiting for production
- Regular database backups recommended

## 🆘 Support

For issues or questions:
1. Check the troubleshooting section
2. Review server logs
3. Check Serial Monitor for ESP32 issues
4. Verify all environment variables

## 📄 License

MIT License - See LICENSE file for details

---

**Made for LittleWatch Project** 🍼👶
