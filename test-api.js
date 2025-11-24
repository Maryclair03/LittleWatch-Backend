/*
 * LittleWatch - API Test Script
 * Simple script to test all major API endpoints
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';
let authToken = '';
let userId = '';
let deviceId = '';

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testEndpoint(name, testFunction) {
  try {
    console.log(`\n${'='.repeat(50)}`);
    log(`Testing: ${name}`, 'blue');
    console.log('='.repeat(50));
    
    await testFunction();
    
    log(`✅ ${name} - PASSED`, 'green');
  } catch (error) {
    log(`❌ ${name} - FAILED`, 'red');
    if (error.response) {
      log(`   Status: ${error.response.status}`, 'red');
      log(`   Message: ${JSON.stringify(error.response.data, null, 2)}`, 'red');
    } else {
      log(`   Error: ${error.message}`, 'red');
    }
  }
}

async function testSignup() {
  const response = await axios.post(`${BASE_URL}/auth/signup`, {
    name: 'API Test User',
    email: `test${Date.now()}@example.com`,
    password: 'test123456',
    phoneNumber: '9123456789',
    countryCode: '+63',
    country: 'Philippines'
  });
  
  authToken = response.data.data.token;
  userId = response.data.data.userId;
  
  log(`Token received: ${authToken.substring(0, 20)}...`, 'yellow');
  log(`User ID: ${userId}`, 'yellow');
}

async function testLogin() {
  // Use the test account from seed
  const response = await axios.post(`${BASE_URL}/auth/login`, {
    email: 'test@example.com',
    password: 'test123'
  });
  
  authToken = response.data.data.token;
  userId = response.data.data.userId;
  
  log(`Token: ${authToken.substring(0, 20)}...`, 'yellow');
  log(`User ID: ${userId}`, 'yellow');
}

async function testRegisterDevice() {
  const response = await axios.post(
    `${BASE_URL}/devices/register`,
    {
      deviceSerial: `DEVICE_${Date.now()}`,
      deviceName: 'Test Device'
    },
    {
      headers: { Authorization: `Bearer ${authToken}` }
    }
  );
  
  deviceId = response.data.data.deviceId;
  log(`Device ID: ${deviceId}`, 'yellow');
}

async function testGetDevices() {
  const response = await axios.get(`${BASE_URL}/devices`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  log(`Found ${response.data.data.length} device(s)`, 'yellow');
  
  if (response.data.data.length > 0) {
    deviceId = response.data.data[0].device_id;
    log(`Using device ID: ${deviceId}`, 'yellow');
  }
}

async function testRecordVitals() {
  const response = await axios.post(`${BASE_URL}/vitals/record`, {
    deviceSerial: 'LITTLEWATCH_TEST_001',
    heartRate: 115,
    temperature: 36.7,
    oxygenSaturation: 98,
    movementStatus: 'Normal',
    movementIntensity: 0.15,
    batteryLevel: 85
  });
  
  log(`Alert triggered: ${response.data.isAlert}`, 'yellow');
  log(`Alert count: ${response.data.alertCount}`, 'yellow');
}

async function testGetLatestVitals() {
  const response = await axios.get(
    `${BASE_URL}/vitals/latest/${deviceId}`,
    {
      headers: { Authorization: `Bearer ${authToken}` }
    }
  );
  
  const vitals = response.data.data.vitals;
  log(`Heart Rate: ${vitals.heart_rate} BPM`, 'yellow');
  log(`Temperature: ${vitals.temperature}°C`, 'yellow');
  log(`SpO2: ${vitals.oxygen_saturation}%`, 'yellow');
  log(`Movement: ${vitals.movement_status}`, 'yellow');
}

async function testGetVitalsHistory() {
  const response = await axios.get(
    `${BASE_URL}/vitals/history/${deviceId}?period=24H&limit=10`,
    {
      headers: { Authorization: `Bearer ${authToken}` }
    }
  );
  
  log(`Retrieved ${response.data.data.readings.length} readings`, 'yellow');
  log(`Avg Heart Rate: ${response.data.data.summary.avgHeartRate} BPM`, 'yellow');
  log(`Avg Temperature: ${response.data.data.summary.avgTemperature}°C`, 'yellow');
  log(`Avg SpO2: ${response.data.data.summary.avgOxygen}%`, 'yellow');
}

async function testGetNotifications() {
  const response = await axios.get(`${BASE_URL}/notifications`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  log(`Total notifications: ${response.data.data.notifications.length}`, 'yellow');
  log(`Unread count: ${response.data.data.unreadCount}`, 'yellow');
}

async function testMarkNotificationRead() {
  // Get first notification
  const notifResponse = await axios.get(`${BASE_URL}/notifications`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  if (notifResponse.data.data.notifications.length > 0) {
    const notifId = notifResponse.data.data.notifications[0].notification_id;
    
    await axios.put(
      `${BASE_URL}/notifications/${notifId}/read`,
      {},
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    log(`Marked notification ${notifId} as read`, 'yellow');
  } else {
    log('No notifications to mark as read', 'yellow');
  }
}

async function testGetUserProfile() {
  const response = await axios.get(`${BASE_URL}/user/profile`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  log(`Name: ${response.data.data.name}`, 'yellow');
  log(`Email: ${response.data.data.email}`, 'yellow');
}

async function testUpdateProfile() {
  await axios.put(
    `${BASE_URL}/user/profile`,
    {
      name: 'Updated Test User',
      phoneNumber: '9876543210'
    },
    {
      headers: { Authorization: `Bearer ${authToken}` }
    }
  );
  
  log('Profile updated successfully', 'yellow');
}

async function testUpdateThresholds() {
  await axios.put(
    `${BASE_URL}/devices/${deviceId}/thresholds`,
    {
      heartRateMin: 85,
      heartRateMax: 145,
      temperatureMin: 36.0,
      temperatureMax: 38.0,
      oxygenMin: 92,
      movementAlertEnabled: true
    },
    {
      headers: { Authorization: `Bearer ${authToken}` }
    }
  );
  
  log('Thresholds updated successfully', 'yellow');
}

async function testHealthCheck() {
  const response = await axios.get('http://localhost:3000/health');
  log(`Server Status: ${response.data.status}`, 'yellow');
  log(`Uptime: ${response.data.uptime.toFixed(2)}s`, 'yellow');
}

async function runAllTests() {
  console.log('\n');
  log('🧪 LittleWatch API Test Suite', 'blue');
  log('================================\n', 'blue');

  // Test sequence
  await testEndpoint('Health Check', testHealthCheck);
  
  // Auth tests
  await testEndpoint('User Login', testLogin);
  
  // Device tests
  await testEndpoint('Get User Devices', testGetDevices);
  
  // Vital signs tests
  await testEndpoint('Record Vital Signs', testRecordVitals);
  await testEndpoint('Get Latest Vitals', testGetLatestVitals);
  await testEndpoint('Get Vitals History', testGetVitalsHistory);
  
  // Notification tests
  await testEndpoint('Get Notifications', testGetNotifications);
  await testEndpoint('Mark Notification as Read', testMarkNotificationRead);
  
  // User tests
  await testEndpoint('Get User Profile', testGetUserProfile);
  await testEndpoint('Update User Profile', testUpdateProfile);
  
  // Settings tests
  await testEndpoint('Update Alert Thresholds', testUpdateThresholds);

  console.log('\n' + '='.repeat(50));
  log('✅ All tests completed!', 'green');
  console.log('='.repeat(50) + '\n');
}

// Run tests
runAllTests().catch(error => {
  log(`\n❌ Test suite failed: ${error.message}`, 'red');
  process.exit(1);
});
