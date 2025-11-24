# 🎯 START HERE - LittleWatch Backend System

## 👋 Welcome!

This folder contains **everything you need** for your LittleWatch backend system. Follow this guide to get started quickly!

## 📚 Documentation Files (Read in Order)

1. **📖 PROJECT_SUMMARY.md** ⭐ **START HERE!**
   - Overview of what's included
   - Project structure
   - Key features
   - Technologies used

2. **⚡ QUICKSTART.md** (5-minute setup)
   - Fast setup guide
   - Step-by-step instructions
   - Common issues and solutions

3. **📘 README.md** (Complete documentation)
   - Detailed installation guide
   - Full system documentation
   - Troubleshooting

4. **📱 REACT_NATIVE_INTEGRATION.md**
   - How to connect your mobile app
   - Code examples
   - Testing checklist

5. **🔌 API_DOCUMENTATION.md**
   - All API endpoints
   - Request/response examples
   - Socket.IO events

## 🚀 Quick Setup (3 Steps)

### 🎯 Using XAMPP MySQL? 
**→ Open XAMPP_SETUP.md for XAMPP-specific instructions!**

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Setup Database

**For XAMPP Users:**
- See **XAMPP_SETUP.md** for detailed phpMyAdmin instructions

**For Standard MySQL:**
```bash
# Create database and tables
mysql -u root -p < database/schema.sql
```

### Step 3: Configure & Start
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your MySQL password
# XAMPP users: leave DB_PASSWORD empty!
# Then start server
npm run dev
```

✅ Server should now be running on http://localhost:3000

## 📁 Key Files & Folders

```
littlewatch-backend/
│
├── 📖 START_HERE.md              ← You are here!
├── ⚡ QUICKSTART.md              ← 5-minute setup
├── 📘 README.md                  ← Full documentation
├── 📱 REACT_NATIVE_INTEGRATION.md ← Mobile app guide
├── 🔌 API_DOCUMENTATION.md       ← API reference
├── 📊 PROJECT_SUMMARY.md         ← System overview
│
├── config/                       ← Database configuration
├── middleware/                   ← Authentication
├── routes/                       ← API endpoints
│   ├── auth.js                   ← Signup, Login
│   ├── vitals.js                 ← Vital signs
│   ├── notifications.js          ← Alerts
│   ├── devices.js                ← Device management
│   └── user.js                   ← User profile
│
├── database/
│   └── schema.sql                ← Database structure
│
├── arduino/
│   └── littlewatch_esp32.ino     ← ESP32 firmware
│
├── server.js                     ← Main server file
├── seed.js                       ← Test data creator
├── test-api.js                   ← API testing
├── package.json                  ← Dependencies
└── .env.example                  ← Environment template
```

## 🎯 What to Do First

### For Backend Setup:
1. ✅ Read **PROJECT_SUMMARY.md** (5 min)
2. ✅ Follow **QUICKSTART.md** (5 min)
3. ✅ Run `npm run seed` to add test data
4. ✅ Run `npm test` to verify everything works

### For Mobile App:
1. ✅ Complete backend setup first
2. ✅ Read **REACT_NATIVE_INTEGRATION.md**
3. ✅ Update API URLs in your app
4. ✅ Test with test account (test@example.com / test123)

### For ESP32:
1. ✅ Open `arduino/littlewatch_esp32/littlewatch_esp32.ino`
2. ✅ Update WiFi credentials
3. ✅ Update server URL with your IP
4. ✅ Upload to ESP32-C3

## 🧪 Test Account

After running `npm run seed`:
- **Email:** test@example.com
- **Password:** test123
- **Device Serial:** LITTLEWATCH_TEST_001

## 📊 System Features

✅ **User Management**
- Signup, login with JWT
- Profile management
- Password change

✅ **Device Management**
- Multiple devices per user
- Battery monitoring
- Connection status

✅ **Vital Signs Monitoring**
- Heart rate tracking
- Temperature monitoring
- SpO2 (oxygen saturation)
- Movement detection

✅ **Smart Alerts**
- Automatic threshold checking
- Real-time notifications
- Customizable thresholds

✅ **Historical Data**
- Timeline view
- Daily averages
- Activity tracking

## 🔧 Requirements

- **Node.js** v14+ (`node --version`)
- **MySQL** v8.0+ (`mysql --version`)
- **npm** or yarn
- **Arduino IDE** (for ESP32)

## 🆘 Need Help?

### Quick Answers:

**"Database connection failed"**
→ Check MySQL is running and .env password is correct

**"Port 3000 already in use"**
→ Stop other processes: `lsof -ti:3000 | xargs kill -9` (Mac/Linux)
→ Or: `netstat -ano | findstr :3000` then `taskkill /PID xxx /F` (Windows)

**"Cannot connect from mobile app"**
→ Use your computer's IP, not localhost
→ Find IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)

**More help:**
- Check **QUICKSTART.md** troubleshooting section
- Review **README.md** for detailed docs
- Run `npm test` to diagnose issues

## 📝 Before Building APK

Checklist:
- [ ] Backend server running
- [ ] Test data loaded (`npm run seed`)
- [ ] Mobile app connected and tested
- [ ] API URLs updated with correct IP
- [ ] All features tested and working

## 🎉 You're All Set!

Everything you need is in this folder. Start with:

1. **PROJECT_SUMMARY.md** - Understand what you have
2. **QUICKSTART.md** - Get it running in 5 minutes
3. **REACT_NATIVE_INTEGRATION.md** - Connect your app

## 📬 What's Included

- ✅ Complete Node.js backend
- ✅ MySQL database schema
- ✅ ESP32 firmware
- ✅ API documentation
- ✅ Test scripts
- ✅ Setup guides
- ✅ Integration examples

## 🚀 Next Steps

1. Follow QUICKSTART.md
2. Run test-api.js to verify
3. Connect your React Native app
4. Flash ESP32 (optional, can test with seed data first)
5. Build your APK!

---

**Ready to begin?** → Open **PROJECT_SUMMARY.md**

**Need fast setup?** → Open **QUICKSTART.md**

**Connecting mobile app?** → Open **REACT_NATIVE_INTEGRATION.md**

---

**Made with ❤️ for LittleWatch Project** 👶💙

*Last Updated: January 2025*
