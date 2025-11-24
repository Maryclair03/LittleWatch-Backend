# 🎯 XAMPP Quick Reference Card

## 📋 Setup Checklist

```
□ Step 1: Open XAMPP Control Panel
□ Step 2: Start MySQL (click Start button)
□ Step 3: Open phpMyAdmin (http://localhost/phpmyadmin)
□ Step 4: Create database "littlewatch_db"
□ Step 5: Import schema.sql file
□ Step 6: Edit .env file (DB_PASSWORD= leave empty!)
□ Step 7: npm install
□ Step 8: npm run dev
□ Step 9: npm run seed (test data)
□ Step 10: npm test (verify everything works)
```

## 🔑 Key Settings for XAMPP

### .env Configuration
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=          ← LEAVE EMPTY!
DB_NAME=littlewatch_db
DB_PORT=3306
```

## 🌐 Important URLs

- **phpMyAdmin**: http://localhost/phpmyadmin
- **Backend Server**: http://localhost:3000
- **Health Check**: http://localhost:3000/health

## 🎯 Test Credentials (after npm run seed)

```
Email: test@example.com
Password: test123
Device Serial: LITTLEWATCH_TEST_001
```

## ⚡ Quick Commands

```bash
# Install dependencies
npm install

# Start backend server
npm run dev

# Add test data
npm run seed

# Test API endpoints
npm test
```

## 🔧 Common Issues & Solutions

### ❌ MySQL won't start in XAMPP
**Solution:** Run XAMPP as Administrator

### ❌ "Database connection failed"
**Solution:** Check .env has `DB_PASSWORD=` (empty!)

### ❌ Port 3000 already in use
**Solution:** 
- Windows: `netstat -ano | findstr :3000` → `taskkill /PID xxx /F`
- Or change PORT=3001 in .env

### ❌ "Access Denied" error
**Solution:** Verify .env has:
```
DB_USER=root
DB_PASSWORD=
```

## 📱 For Mobile App Connection

1. Find your IP:
   - Windows: `ipconfig` (look for IPv4)
   - Mac: `ifconfig` (look for inet)

2. Update mobile app API URL:
   ```javascript
   const API_BASE_URL = 'http://YOUR_IP:3000/api';
   // Example: 'http://192.168.1.105:3000/api'
   ```

3. Update .env:
   ```env
   ALLOWED_ORIGINS=http://YOUR_IP:19000,http://YOUR_IP:19001
   ```

## ✅ Verify Setup

Run these checks:

1. ✅ **XAMPP MySQL green** in control panel
2. ✅ **phpMyAdmin opens** (http://localhost/phpmyadmin)
3. ✅ **Database exists** (see littlewatch_db with 7 tables)
4. ✅ **Server running**: `npm run dev` shows "Database connected"
5. ✅ **Test data loaded**: `npm run seed` completes
6. ✅ **Tests pass**: `npm test` all green ✅

## 📚 Full Documentation

- **XAMPP_SETUP.md** - Complete XAMPP setup guide
- **START_HERE.md** - Navigation guide
- **QUICKSTART.md** - General setup
- **API_DOCUMENTATION.md** - All endpoints
- **REACT_NATIVE_INTEGRATION.md** - Mobile app guide

## 💡 Pro Tips

- Keep XAMPP Control Panel open while backend runs
- Use phpMyAdmin to view/edit database data
- Check "Browse" tab in phpMyAdmin to see table contents
- Backend auto-reconnects if MySQL restarts

---

**XAMPP + Node.js + LittleWatch = Success! 🎉**

Print this card for quick reference!
