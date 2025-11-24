# LittleWatch - Quick Start Guide 🚀

This guide will get you up and running in **5 minutes**!

## Prerequisites Checklist

Before starting, make sure you have:
- [ ] Node.js installed (`node --version`)
- [ ] MySQL installed and running
- [ ] Arduino IDE (for ESP32 programming)
- [ ] ESP32-C3 board and sensors

## Step-by-Step Setup

### 1️⃣ Database Setup (2 minutes)

```bash
# Login to MySQL
mysql -u root -p

# Create database and tables
source database/schema.sql

# Verify (should show 7 tables)
USE littlewatch_db;
SHOW TABLES;
```

### 2️⃣ Backend Setup (2 minutes)

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env - Change these lines:
# DB_PASSWORD=your_actual_mysql_password
# JWT_SECRET=some_random_secret_string_here
```

### 3️⃣ Start the Server

```bash
# Start in development mode
npm run dev

# You should see:
# ✅ Database connected successfully
# 🚀 Server running on port 3000
```

### 4️⃣ Add Test Data (Optional)

```bash
# In a new terminal
node seed.js

# This creates:
# - Test user (email: test@example.com, password: test123)
# - Test device with sample data
```

### 5️⃣ Test the API

```bash
# In a new terminal
node test-api.js

# Should see all tests passing ✅
```

## 🔌 ESP32 Setup (5 minutes)

### Install Arduino Libraries

In Arduino IDE:
1. Go to **Tools > Manage Libraries**
2. Install these libraries:
   - `Adafruit MAX30105`
   - `MAX30205 by Alhajhassan`
   - `MPU6050 by Electronic Cats`
   - `ArduinoJson`

### Configure and Upload

1. Open `arduino/littlewatch_esp32/littlewatch_esp32.ino`
2. Update WiFi credentials:
   ```cpp
   const char* WIFI_SSID = "YourWiFiName";
   const char* WIFI_PASSWORD = "YourWiFiPassword";
   ```
3. Update server URL (use your computer's IP):
   ```cpp
   const char* SERVER_URL = "http://192.168.1.XXX:3000/api/vitals/record";
   ```
4. Connect ESP32-C3 via USB
5. Select board: **Tools > Board > ESP32C3 Dev Module**
6. Click **Upload**
7. Open **Serial Monitor** (115200 baud)

## 📱 Mobile App Integration

### Update API Endpoint

In your React Native app, find where the API base URL is defined and update it:

```javascript
const API_BASE_URL = 'http://YOUR_COMPUTER_IP:3000/api';
// Example: 'http://192.168.1.105:3000/api'
```

### Find Your Computer's IP

**Windows:**
```bash
ipconfig
# Look for "IPv4 Address"
```

**Mac/Linux:**
```bash
ifconfig
# or
ip addr show
# Look for "inet" under your network interface
```

## ✅ Verify Everything Works

### Test 1: Server Health Check
Open browser: `http://localhost:3000/health`

Should see:
```json
{
  "status": "OK",
  "timestamp": "2025-...",
  "uptime": 123.45
}
```

### Test 2: ESP32 Sending Data
Check Serial Monitor - should see:
```
✅ Data sent successfully
--- Vital Signs ---
Heart Rate: 120 BPM
SpO2: 98%
Temperature: 36.7°C
Movement: Normal
Battery: 85%
```

### Test 3: Mobile App
1. Run your React Native app
2. Login with: `test@example.com` / `test123`
3. You should see:
   - Device connected
   - Latest vital signs
   - Notifications (if any)

## 🎯 Common Issues & Solutions

### "Database connection failed"
- ✅ Make sure MySQL is running
- ✅ Check DB_PASSWORD in .env
- ✅ Verify database exists: `USE littlewatch_db;`

### "WiFi connection failed" (ESP32)
- ✅ Check WiFi credentials
- ✅ Ensure 2.4GHz WiFi (ESP32 doesn't support 5GHz)
- ✅ Check Serial Monitor for errors

### "Cannot connect from mobile app"
- ✅ Ensure server is running
- ✅ Use computer's IP address, not localhost
- ✅ Both devices must be on same network
- ✅ Check firewall settings

### "Port 3000 already in use"
```bash
# Kill the process
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:3000 | xargs kill -9
```

## 📊 Testing Endpoints

### Using curl:

```bash
# Health check
curl http://localhost:3000/health

# Register user
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@test.com","password":"test123"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

### Using Postman:
1. Import the API endpoints from README.md
2. Set Authorization header: `Bearer YOUR_TOKEN`
3. Test each endpoint

## 🎉 You're All Set!

Your LittleWatch system is now:
- ✅ Accepting data from ESP32
- ✅ Storing in MySQL database
- ✅ Sending real-time alerts
- ✅ Ready for mobile app connection

## 📖 Next Steps

1. **Customize Thresholds**: Update alert thresholds in the app
2. **Add More Devices**: Register additional LittleWatch bands
3. **View History**: Check historical vital signs data
4. **Monitor Alerts**: Set up push notifications

## 🆘 Need Help?

1. Check the full README.md for detailed documentation
2. Run `node test-api.js` to diagnose issues
3. Check server logs for errors
4. Verify ESP32 Serial Monitor output

---

**Happy Monitoring! 👶💙**
