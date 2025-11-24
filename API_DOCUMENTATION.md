# LittleWatch API Documentation

## Base URL
```
http://localhost:3000/api
```

## Authentication
Most endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 🔐 Authentication Endpoints

### 1. Register New User

**Endpoint:** `POST /auth/signup`

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phoneNumber": "9123456789",
  "countryCode": "+63",
  "dateOfBirth": "1990-01-01",
  "gender": "Male",
  "country": "Philippines",
  "address": "123 Main Street"
}
```

**Response (201):**
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

### 2. Login

**Endpoint:** `POST /auth/login`

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "userId": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

## 📱 Device Management Endpoints

### 1. Register New Device

**Endpoint:** `POST /devices/register`
**Auth Required:** Yes

**Request Body:**
```json
{
  "deviceSerial": "LITTLEWATCH_001",
  "deviceName": "Baby's Watch"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Device registered successfully",
  "data": {
    "deviceId": 1,
    "deviceSerial": "LITTLEWATCH_001",
    "deviceName": "Baby's Watch"
  }
}
```

### 2. Get User's Devices

**Endpoint:** `GET /devices`
**Auth Required:** Yes

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "device_id": 1,
      "device_serial": "LITTLEWATCH_001",
      "user_id": 1,
      "device_name": "Baby's Watch",
      "firmware_version": null,
      "is_connected": true,
      "battery_level": 85,
      "last_sync": "2025-01-01T12:00:00.000Z",
      "total_readings": 1234,
      "last_reading": "2025-01-01T12:00:00.000Z"
    }
  ]
}
```

### 3. Get Device Details

**Endpoint:** `GET /devices/:deviceId`
**Auth Required:** Yes

**Response (200):**
```json
{
  "success": true,
  "data": {
    "device": {
      "device_id": 1,
      "device_serial": "LITTLEWATCH_001",
      "device_name": "Baby's Watch",
      "is_connected": true,
      "battery_level": 85,
      "last_sync": "2025-01-01T12:00:00.000Z"
    },
    "thresholds": {
      "heart_rate_min": 80,
      "heart_rate_max": 140,
      "temperature_min": 36.0,
      "temperature_max": 37.8,
      "oxygen_min": 90,
      "movement_alert_enabled": true
    }
  }
}
```

### 4. Update Device Name

**Endpoint:** `PUT /devices/:deviceId`
**Auth Required:** Yes

**Request Body:**
```json
{
  "deviceName": "New Device Name"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Device updated successfully"
}
```

### 5. Update Alert Thresholds

**Endpoint:** `PUT /devices/:deviceId/thresholds`
**Auth Required:** Yes

**Request Body:**
```json
{
  "heartRateMin": 85,
  "heartRateMax": 145,
  "temperatureMin": 36.0,
  "temperatureMax": 38.0,
  "oxygenMin": 92,
  "movementAlertEnabled": true
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Thresholds updated successfully"
}
```

### 6. Delete Device

**Endpoint:** `DELETE /devices/:deviceId`
**Auth Required:** Yes

**Response (200):**
```json
{
  "success": true,
  "message": "Device removed successfully"
}
```

---

## 💓 Vital Signs Endpoints

### 1. Record Vital Signs (from ESP32)

**Endpoint:** `POST /vitals/record`
**Auth Required:** No (device serial verification)

**Request Body:**
```json
{
  "deviceSerial": "LITTLEWATCH_001",
  "heartRate": 120,
  "temperature": 36.8,
  "oxygenSaturation": 98,
  "movementStatus": "Normal",
  "movementIntensity": 0.15,
  "batteryLevel": 85
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Vital signs recorded",
  "isAlert": false,
  "alertCount": 0
}
```

**Response with Alert (200):**
```json
{
  "success": true,
  "message": "Vital signs recorded",
  "isAlert": true,
  "alertCount": 1
}
```

### 2. Get Latest Vital Signs

**Endpoint:** `GET /vitals/latest/:deviceId`
**Auth Required:** Yes

**Response (200):**
```json
{
  "success": true,
  "data": {
    "vitals": {
      "heart_rate": 120,
      "temperature": 36.8,
      "oxygen_saturation": 98,
      "movement_status": "Normal",
      "movement_intensity": 0.15,
      "timestamp": "2025-01-01T12:00:00.000Z",
      "is_alert": false
    },
    "device": {
      "battery_level": 85,
      "is_connected": true,
      "last_sync": "2025-01-01T12:00:00.000Z"
    }
  }
}
```

### 3. Get Vital Signs History

**Endpoint:** `GET /vitals/history/:deviceId`
**Auth Required:** Yes

**Query Parameters:**
- `period` - Time period: "24H", "1W", "1M" (default: "24H")
- `limit` - Maximum records (default: 100)

**Example:** `GET /vitals/history/1?period=24H&limit=50`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "readings": [
      {
        "heart_rate": 120,
        "temperature": 36.8,
        "oxygen_saturation": 98,
        "movement_status": "Normal",
        "movement_intensity": 0.15,
        "timestamp": "2025-01-01T12:00:00.000Z",
        "is_alert": false
      }
    ],
    "summary": {
      "avgHeartRate": 118,
      "avgTemperature": "36.7",
      "avgOxygen": 97,
      "totalReadings": 50
    }
  }
}
```

### 4. Get Daily Averages

**Endpoint:** `GET /vitals/daily-average/:deviceId`
**Auth Required:** Yes

**Query Parameters:**
- `days` - Number of days (default: 7)

**Example:** `GET /vitals/daily-average/1?days=7`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "device_id": 1,
      "date": "2025-01-01",
      "avg_heart_rate": 118.5,
      "avg_temperature": 36.7,
      "avg_oxygen": 97.2,
      "min_heart_rate": 90,
      "max_heart_rate": 140,
      "reading_count": 288
    }
  ]
}
```

---

## 🔔 Notification Endpoints

### 1. Get All Notifications

**Endpoint:** `GET /notifications`
**Auth Required:** Yes

**Query Parameters:**
- `limit` - Maximum notifications (default: 50)
- `unreadOnly` - Filter unread only: "true" or "false" (default: false)

**Example:** `GET /notifications?limit=20&unreadOnly=true`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "notification_id": 1,
        "user_id": 1,
        "device_id": 1,
        "type": "warning",
        "title": "Temperature Alert",
        "message": "Baby's temperature is above normal (37.8°C)",
        "icon": "thermometer",
        "color": "#FF9800",
        "is_read": false,
        "created_at": "2025-01-01T12:00:00.000Z",
        "device_name": "Baby's Watch"
      }
    ],
    "unreadCount": 3
  }
}
```

### 2. Mark Notification as Read

**Endpoint:** `PUT /notifications/:notificationId/read`
**Auth Required:** Yes

**Response (200):**
```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

### 3. Mark All as Read

**Endpoint:** `PUT /notifications/mark-all-read`
**Auth Required:** Yes

**Response (200):**
```json
{
  "success": true,
  "message": "All notifications marked as read"
}
```

### 4. Clear All Notifications

**Endpoint:** `DELETE /notifications/clear-all`
**Auth Required:** Yes

**Response (200):**
```json
{
  "success": true,
  "message": "All notifications cleared"
}
```

---

## 👤 User Profile Endpoints

### 1. Get User Profile

**Endpoint:** `GET /user/profile`
**Auth Required:** Yes

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user_id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "phone_number": "9123456789",
    "country_code": "+63",
    "date_of_birth": "1990-01-01",
    "gender": "Male",
    "country": "Philippines",
    "address": "123 Main Street",
    "created_at": "2025-01-01T00:00:00.000Z",
    "last_login": "2025-01-01T12:00:00.000Z"
  }
}
```

### 2. Update Profile

**Endpoint:** `PUT /user/profile`
**Auth Required:** Yes

**Request Body:**
```json
{
  "name": "John Updated",
  "phoneNumber": "9876543210",
  "address": "456 New Street"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Profile updated successfully"
}
```

### 3. Change Password

**Endpoint:** `PUT /user/change-password`
**Auth Required:** Yes

**Request Body:**
```json
{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword456"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

### 4. Get Activity Log

**Endpoint:** `GET /user/activity`
**Auth Required:** Yes

**Query Parameters:**
- `limit` - Maximum records (default: 50)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "action": "USER_LOGIN",
      "details": "User logged in: john@example.com",
      "ip_address": "192.168.1.100",
      "created_at": "2025-01-01T12:00:00.000Z"
    }
  ]
}
```

---

## 🏥 Health Check

**Endpoint:** `GET /health`
**Auth Required:** No

**Response (200):**
```json
{
  "status": "OK",
  "timestamp": "2025-01-01T12:00:00.000Z",
  "uptime": 3456.789
}
```

---

## ❌ Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "field": "email",
      "message": "Valid email is required"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Access token required"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

## 🔌 Socket.IO Events

### Client → Server

**Join User Room:**
```javascript
socket.emit('join_user_room', userId);
```

**Leave User Room:**
```javascript
socket.emit('leave_user_room', userId);
```

### Server → Client

**Vital Alert:**
```javascript
socket.on('vital_alert', (data) => {
  console.log(data);
  /*
  {
    deviceId: 1,
    alerts: [
      {
        type: 'critical',
        title: 'High Heart Rate',
        message: 'Heart rate is above normal (145 BPM)',
        icon: 'heart',
        color: '#FF5252'
      }
    ],
    vitals: {
      heartRate: 145,
      temperature: 36.8,
      oxygenSaturation: 98,
      movementStatus: 'Active'
    }
  }
  */
});
```

---

## 📝 Notes

- All timestamps are in ISO 8601 format (UTC)
- JWT tokens expire after 7 days (configurable)
- Rate limiting is recommended for production
- Use HTTPS in production environments
- Device serial must be unique across all devices

---

**API Version:** 1.0.0
**Last Updated:** January 2025
