const admin = require('firebase-admin');

// Initialize Firebase Admin with environment variables
const initializeFirebase = () => {
  try {
    // Check if Firebase is already initialized
    if (admin.apps.length === 0) {
      // Check if environment variables are available (production)
      if (process.env.FIREBASE_PROJECT_ID && 
          process.env.FIREBASE_PRIVATE_KEY && 
          process.env.FIREBASE_CLIENT_EMAIL) {
        
        // Parse the private key - handle both formats
        let privateKey = process.env.FIREBASE_PRIVATE_KEY;
        
        // Replace literal \n with actual newlines if they exist
        privateKey = privateKey.replace(/\\n/g, '\n');
        
        // If the key doesn't start with BEGIN, it might be base64 encoded or malformed
        if (!privateKey.includes('BEGIN PRIVATE KEY')) {
          console.error('❌ Private key format is invalid');
          throw new Error('FIREBASE_PRIVATE_KEY must contain BEGIN PRIVATE KEY header');
        }
        
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            privateKey: privateKey,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL
          })
        });
        console.log('✅ Firebase Admin initialized with environment variables');
        
      } else {
        // Fallback to JSON file (local development)
        const path = require('path');
        const serviceAccount = require(path.join(__dirname, '../firebase-service-account.json'));
        
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
        console.log('✅ Firebase Admin initialized with JSON file (local development)');
      }
    }
  } catch (error) {
    console.error('❌ Firebase initialization error:', error);
    throw error;
  }
};

// Initialize Firebase on module load
initializeFirebase();

// Function to send push notification to a single user
async function sendPushNotification(fcmToken, title, body, data = {}) {
  try {
    if (!fcmToken) {
      console.log('⚠️ No FCM token provided');
      return null;
    }

    const message = {
      notification: {
        title: title,
        body: body
      },
      data: data,
      token: fcmToken,
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          priority: 'high',
          channelId: 'vital_alerts'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      }
    };

    const response = await admin.messaging().send(message);
    console.log('✅ Push notification sent successfully:', response);
    return response;
  } catch (error) {
    console.error('❌ Error sending push notification:', error);
    
    // Handle invalid or expired tokens
    if (error.code === 'messaging/invalid-registration-token' || 
        error.code === 'messaging/registration-token-not-registered') {
      console.log('⚠️ Invalid FCM token, should be removed from database');
    }
    
    return null;
  }
}

// Function to send push notification to multiple users
async function sendPushNotificationToMultiple(fcmTokens, title, body, data = {}) {
  try {
    if (!fcmTokens || fcmTokens.length === 0) {
      console.log('⚠️ No FCM tokens provided');
      return null;
    }

    const message = {
      notification: {
        title: title,
        body: body
      },
      data: data,
      tokens: fcmTokens,
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          priority: 'high',
          channelId: 'vital_alerts'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      }
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`✅ ${response.successCount} notifications sent successfully`);
    
    if (response.failureCount > 0) {
      console.log(`⚠️ ${response.failureCount} notifications failed`);
    }
    
    return response;
  } catch (error) {
    console.error('❌ Error sending push notifications:', error);
    return null;
  }
}

// Function to send vital sign alert
async function sendVitalAlert(fcmToken, deviceName, vitalType, value, threshold) {
  const title = `🚨 ${vitalType} Alert - ${deviceName}`;
  const body = `${vitalType}: ${value} (Threshold: ${threshold})`;
  
  const data = {
    type: 'vital_alert',
    deviceName: deviceName,
    vitalType: vitalType,
    value: value.toString(),
    threshold: threshold.toString(),
    timestamp: Date.now().toString()
  };

  return sendPushNotification(fcmToken, title, body, data);
}

// Function to verify FCM token
async function verifyFCMToken(fcmToken) {
  try {
    await admin.messaging().send({
      token: fcmToken,
      data: { test: 'true' }
    }, true); // dry run
    return true;
  } catch (error) {
    console.error('❌ Invalid FCM token:', error.code);
    return false;
  }
}

module.exports = {
  admin,
  sendPushNotification,
  sendPushNotificationToMultiple,
  sendVitalAlert,
  verifyFCMToken
};