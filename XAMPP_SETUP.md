# LittleWatch Backend - XAMPP MySQL Setup Guide

## 🎯 Quick Setup for XAMPP Users

This guide is specifically for users running MySQL through XAMPP.

## ✅ Prerequisites

1. **XAMPP installed** with MySQL
2. **Node.js installed** (v14+)
3. XAMPP Control Panel open

## 🚀 Step-by-Step Setup

### Step 1: Start XAMPP Services

1. Open **XAMPP Control Panel**
2. Click **Start** next to **Apache** (optional, for phpMyAdmin)
3. Click **Start** next to **MySQL** ⭐ **Required**

You should see them highlighted in green.

### Step 2: Access phpMyAdmin

1. Open your browser
2. Go to: `http://localhost/phpmyadmin`
3. You should see the phpMyAdmin interface

### Step 3: Create Database Using phpMyAdmin

**Option A: Import SQL File (Easiest)**

1. In phpMyAdmin, click **"New"** in the left sidebar
2. Database name: `littlewatch_db`
3. Collation: `utf8mb4_general_ci`
4. Click **Create**
5. Click on `littlewatch_db` in the left sidebar
6. Click **Import** tab at the top
7. Click **Choose File**
8. Select `database/schema.sql` from the backend folder
9. Scroll down and click **Go**
10. Wait for success message ✅

**Option B: Run SQL Query Directly**

1. In phpMyAdmin, click **SQL** tab at the top
2. Copy all contents from `database/schema.sql`
3. Paste into the query box
4. Click **Go**
5. Wait for success message ✅

### Step 4: Verify Database Creation

In phpMyAdmin, click on `littlewatch_db` in left sidebar.

You should see 7 tables:
- ✅ users
- ✅ devices
- ✅ vital_readings
- ✅ notifications
- ✅ sleep_sessions
- ✅ threshold_settings
- ✅ activity_log

### Step 5: Configure Backend Connection

1. Open the `littlewatch-backend` folder
2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

3. Edit `.env` file with these XAMPP-specific settings:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# XAMPP MySQL Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=littlewatch_db
DB_PORT=3306

# JWT Configuration
JWT_SECRET=littlewatch_super_secret_key_2025
JWT_EXPIRE=7d

# CORS Configuration (Update with your IP later)
ALLOWED_ORIGINS=http://localhost:19000,http://localhost:19001

# Alert Thresholds
HEART_RATE_MIN=80
HEART_RATE_MAX=140
TEMPERATURE_MIN=36.0
TEMPERATURE_MAX=37.8
OXYGEN_MIN=90
```

**⚠️ Important XAMPP Notes:**
- `DB_USER=root` (default XAMPP user)
- `DB_PASSWORD=` (leave empty - XAMPP has no default password)
- `DB_HOST=localhost` (always for XAMPP)
- `DB_PORT=3306` (default MySQL port)

### Step 6: Install Node.js Dependencies

Open terminal/command prompt in the backend folder:

```bash
npm install
```

This will install all required packages.

### Step 7: Start the Backend Server

```bash
npm run dev
```

You should see:
```
=================================
🚀 LittleWatch Backend Server
📡 Server running on port 3000
🌍 Environment: development
🔌 Socket.IO enabled
=================================
✅ Database connected successfully
```

### Step 8: Add Test Data (Optional but Recommended)

Open a **new terminal** (keep server running in first terminal):

```bash
npm run seed
```

This creates:
- ✅ Test user (email: test@example.com, password: test123)
- ✅ Test device with sample vital signs data
- ✅ Sample notifications
- ✅ Historical data

### Step 9: Test the API

```bash
npm test
```

All tests should pass! ✅

## 🔧 XAMPP-Specific Troubleshooting

### Problem: MySQL Won't Start in XAMPP

**Solution 1: Port Conflict**
- Another MySQL instance might be running
- In XAMPP, click **Config** next to MySQL
- Click **my.ini**
- Change `port=3306` to `port=3307`
- Update `.env` file: `DB_PORT=3307`
- Restart MySQL

**Solution 2: Restart XAMPP**
- Stop all services
- Close XAMPP
- Run XAMPP as Administrator
- Start MySQL

### Problem: "Access Denied" Error

**Check your .env file:**
```env
DB_USER=root
DB_PASSWORD=
```

Leave password empty for default XAMPP!

**If you set a password in XAMPP:**
1. In phpMyAdmin, go to **User accounts**
2. Find your root user password
3. Update `.env`: `DB_PASSWORD=your_password`

### Problem: Database Already Exists

If you get "database exists" error:

1. In phpMyAdmin, select `littlewatch_db`
2. Click **Drop** at the top
3. Confirm deletion
4. Re-import `schema.sql`

### Problem: Port 3000 Already in Use

**Windows:**
```bash
netstat -ano | findstr :3000
taskkill /PID <PID_NUMBER> /F
```

**Or change port in `.env`:**
```env
PORT=3001
```

Then access: `http://localhost:3001`

## 🎯 Quick Test Checklist

After setup, verify:

1. ✅ **XAMPP MySQL is running** (green in control panel)
2. ✅ **phpMyAdmin works** (http://localhost/phpmyadmin)
3. ✅ **Database created** (see littlewatch_db with 7 tables)
4. ✅ **Backend server running** (npm run dev shows success)
5. ✅ **Test data loaded** (npm run seed completes)
6. ✅ **API tests pass** (npm test shows all green)

## 🌐 Get Your IP Address for Mobile App

After backend is running, find your computer's IP:

**Windows:**
```bash
ipconfig
```
Look for **IPv4 Address** (e.g., 192.168.1.105)

**Mac/Linux:**
```bash
ifconfig
```
Look for **inet** address

Then update:
1. `.env` file:
   ```env
   ALLOWED_ORIGINS=http://192.168.1.105:19000,http://192.168.1.105:19001
   ```

2. React Native app API URLs (see REACT_NATIVE_INTEGRATION.md)

## 📱 Testing with Mobile App

1. Make sure backend is running
2. Both computer and phone on same WiFi
3. Use your computer's IP (not localhost!) in mobile app
4. Test login with: test@example.com / test123

## 🔌 Testing with ESP32

Update Arduino code:
```cpp
const char* SERVER_URL = "http://192.168.1.XXX:3000/api/vitals/record";
// Replace XXX with your IP from ipconfig/ifconfig
```

## 💡 XAMPP Tips

**Useful phpMyAdmin Features:**
- **Browse**: View table data
- **SQL**: Run custom queries
- **Export**: Backup database
- **Import**: Restore database

**Keep XAMPP Running:**
- MySQL must be running for backend to work
- You can minimize XAMPP Control Panel
- Backend will auto-reconnect if MySQL restarts

## 🎉 You're All Set!

Your backend is now running with XAMPP MySQL! 

**Next Steps:**
1. ✅ Backend running with XAMPP
2. ✅ Test data loaded
3. ✅ Connect your React Native app (see REACT_NATIVE_INTEGRATION.md)
4. ✅ Test everything works
5. ✅ Build your APK!

## 📚 Related Guides

- **START_HERE.md** - Main navigation
- **QUICKSTART.md** - General setup
- **REACT_NATIVE_INTEGRATION.md** - Connect mobile app
- **API_DOCUMENTATION.md** - All endpoints

---

**Having issues?** Check the troubleshooting section above or refer to README.md

**XAMPP + LittleWatch = Perfect! 🎯**
