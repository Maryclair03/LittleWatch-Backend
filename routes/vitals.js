// const express = require('express');
// const router = express.Router();
// const { promisePool } = require('../config/database');
// const { authenticateToken, verifyDeviceOwnership } = require('../middleware/auth');
// const { sendPushNotification } = require('../config/firebase'); // Add this

// router.post('/record', async (req, res) => {
//   try {
//     const {
//       device_serial,
//       heart_rate,
//       temperature,
//       oxygen_saturation,
//       movement_status,
//       movement_intensity,
//       battery_level
//     } = req.body;

//     console.log('--- VITALS RECEIVED ---');
//     console.log('Device Serial:', device_serial);

//     if (!device_serial) {
//       return res.status(400).json({
//         success: false,
//         message: 'Device serial is required'
//       });
//     }

//     // Validate device exists and get user info with FCM token
//     const [devices] = await promisePool.query(
//       `SELECT d.device_id, d.user_id, d.device_name, u.fcmToken, u.name as user_name, u.email 
//        FROM devices d
//        JOIN users u ON d.user_id = u.user_id
//        WHERE d.device_serial = ?`,
//       [device_serial]
//     );

//     if (devices.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: 'Device not found'
//       });
//     }

//     const deviceId = devices[0].device_id;
//     const userId = devices[0].user_id;
//     const fcmToken = devices[0].fcmToken;
//     const deviceName = devices[0].device_name || 'Your device';
//     const userName = devices[0].user_name;

//     console.log(`📱 Device: ${deviceName}, User: ${userName}, FCM Token: ${fcmToken ? 'Present' : 'Missing'}`);

//     // Get threshold settings
//     const [thresholds] = await promisePool.query(
//       'SELECT * FROM threshold_settings WHERE device_id = ?',
//       [deviceId]
//     );

//     const settings = thresholds[0] || {
//       heart_rate_min: 80,
//       heart_rate_max: 140,
//       temperature_min: 36.0,
//       temperature_max: 37.8,
//       oxygen_min: 94
//     };

//     // Check for alerts
//     let isAlert = false;
//     let alertMessages = [];

//     if (heart_rate < settings.heart_rate_min) {
//       isAlert = true;
//       alertMessages.push({
//         type: 'critical',
//         title: 'Warning! Low Heart Rate Alert',
//         message: `${deviceName}: Heart rate is below normal (${heart_rate} BPM)`,
//         icon: 'heart',
//         color: '#FF5252'
//       });
//     } else if (heart_rate > settings.heart_rate_max) {
//       isAlert = true;
//       alertMessages.push({
//         type: 'warning',
//         title: 'Warning! High Heart Rate Alert',
//         message: `${deviceName}: Heart rate is above normal (${heart_rate} BPM)`,
//         icon: 'heart',
//         color: '#FF9800'
//       });
//     }

//     if (temperature < settings.temperature_min) {
//       isAlert = true;
//       alertMessages.push({
//         type: 'warning',
//         title: 'Warning! Low Temperature Alert',
//         message: `${deviceName}: Temperature is below normal (${temperature}°C)`,
//         icon: 'thermometer',
//         color: '#2196F3'
//       });
//     } else if (temperature > settings.temperature_max) {
//       isAlert = true;
//       alertMessages.push({
//         type: 'critical',
//         title: 'Warning! High Temperature Alert',
//         message: `${deviceName}: Temperature is above normal (${temperature}°C)`,
//         icon: 'thermometer',
//         color: '#FF5252'
//       });
//     }

//     if (oxygen_saturation < settings.oxygen_min) {
//       isAlert = true;
//       alertMessages.push({
//         type: 'critical',
//         title: 'Warning! Low Oxygen Alert',
//         message: `${deviceName}: Oxygen saturation is low (${oxygen_saturation}%)`,
//         icon: 'water',
//         color: '#FF5252'
//       });
//     }

//     // Insert vital reading
//     await promisePool.query(
//       `INSERT INTO vital_readings 
//        (device_id, heart_rate, temperature, oxygen_saturation, movement_status, movement_intensity, is_alert) 
//        VALUES (?, ?, ?, ?, ?, ?, ?)`,
//       [deviceId, heart_rate, temperature, oxygen_saturation, movement_status, movement_intensity, isAlert]
//     );

//     // Update device status
//     await promisePool.query(
//       'UPDATE devices SET battery_level = ?, is_connected = TRUE, last_sync = CURRENT_TIMESTAMP WHERE device_id = ?',
//       [battery_level, deviceId]
//     );

//     // Create notifications and send push notifications if alerts detected
//     if (isAlert && alertMessages.length > 0) {
//       console.log(`🚨 ${alertMessages.length} alert(s) detected for user ${userId}`);
      
//       for (const alert of alertMessages) {
//         // Save to notifications table
//         await promisePool.query(
//           `INSERT INTO notifications (user_id, device_id, type, title, message, icon, color) 
//            VALUES (?, ?, ?, ?, ?, ?, ?)`,
//           [userId, deviceId, alert.type, alert.title, alert.message, alert.icon, alert.color]
//         );

//         // Send push notification if user has FCM token
//         if (fcmToken) {
//           console.log(`📲 Sending push notification: ${alert.title}`);
//           await sendPushNotification(
//             fcmToken,
//             alert.title,
//             alert.message,
//             {
//               type: 'vital_alert',
//               alertType: alert.type,
//               deviceId: deviceId.toString(),
//               deviceName: deviceName,
//               heart_rate: heart_rate.toString(),
//               temperature: temperature.toString(),
//               oxygen_saturation: oxygen_saturation.toString()
//             }
//           );
//         } else {
//           console.log('⚠️ No FCM token found for user, skipping push notification');
//         }
//       }

//       // Emit real-time alert via Socket.IO (if user is connected)
//       const io = req.app.get('io');
//       if (io) {
//         io.to(`user_${userId}`).emit('vital_alert', {
//           deviceId,
//           deviceName,
//           alerts: alertMessages,
//           vitals: { heart_rate, temperature, oxygen_saturation, movement_status }
//         });
//       }
//     }

//     res.json({
//       success: true,
//       message: 'Vital signs recorded',
//       isAlert,
//       alertCount: alertMessages.length,
//       notificationsSent: isAlert && fcmToken ? alertMessages.length : 0
//     });
//   } catch (error) {
//     console.error('Record vitals error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to record vital signs'
//     });
//   }
// });

// // @route   GET /api/vitals/vitalReadings
// // @desc    Get all vital readings
// // @access  Private
// router.get('/vitalReadings', authenticateToken, async (req, res) => {
//   try {
//     const [readings] = await promisePool.query(
//       `SELECT 
//          reading_id, 
//          device_id, 
//          heart_rate, 
//          temperature, 
//          oxygen_saturation, 
//          movement_status, 
//          movement_intensity, 
//          timestamp, 
//          is_alert 
//        FROM vital_readings 
//        ORDER BY timestamp DESC`
//     );

//     res.json({
//       success: true,
//       data: readings
//     });
//   } catch (error) {
//     console.error('Get all vital readings error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch vital readings'
//     });
//   }
// });

// // @route   GET /api/vitals/latest/:deviceId
// // @desc    Get latest vital signs
// // @access  Private
// router.get('/latest/:deviceId', authenticateToken, verifyDeviceOwnership, async (req, res) => {
//   try {
//     const { deviceId } = req.params;

//     const [readings] = await promisePool.query(
//       `SELECT heart_rate, temperature, oxygen_saturation, movement_status, 
//        movement_intensity, timestamp, is_alert 
//        FROM vital_readings 
//        WHERE device_id = ? 
//        ORDER BY reading_id DESC 
//        LIMIT 1`,
//       [deviceId]
//     );

//     if (readings.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: 'No readings found'
//       });
//     }

//     // Get device info
//     const [devices] = await promisePool.query(
//       'SELECT battery_level, is_connected, last_sync FROM devices WHERE device_id = ?',
//       [deviceId]
//     );

//     res.json({
//       success: true,
//       data: {
//         vitals: readings[0],
//         device: devices[0]
//       }
//     });
//   } catch (error) {
//     console.error('Get latest vitals error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch vital signs'
//     });
//   }
// });

// // @route   GET /api/vitals/latest-by-serial/:deviceSerial
// // @desc    Get latest vitals by device serial
// // @access  Private
// router.get('/latest-by-serial/:deviceSerial', authenticateToken, async (req, res) => {
//   try {
//     const { deviceSerial } = req.params;

//     // Get device by serial
//     const [devices] = await promisePool.query(
//       'SELECT device_id, device_serial, battery_level, is_connected, last_sync FROM devices WHERE device_serial = ?',
//       [deviceSerial]
//     );

//     if (devices.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: 'Device not found'
//       });
//     }

//     const device = devices[0];

//     // Get latest vital reading for this device
//     const [readings] = await promisePool.query(
//       `SELECT heart_rate, temperature, oxygen_saturation, movement_status, 
//        movement_intensity, timestamp, is_alert 
//        FROM vital_readings 
//        WHERE device_id = ? 
//        ORDER BY timestamp DESC 
//        LIMIT 1`,
//       [device.device_id]
//     );

//     if (readings.length === 0) {
//       return res.json({
//         success: true,
//         data: {
//           vitals: {
//             heart_rate: 0,
//             temperature: 0,
//             oxygen_saturation: 0,
//             movement_status: '--',
//             is_alert: false
//           },
//           device: device
//         }
//       });
//     }

//     res.json({
//       success: true,
//       data: {
//         vitals: readings[0],
//         device: device
//       }
//     });
//   } catch (error) {
//     console.error('Get latest vitals by serial error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch vital signs'
//     });
//   }
// });

// // @route   GET /api/vitals/history/:deviceId
// // @desc    Get vital signs history
// // @access  Private
// router.get('/history/:deviceId', authenticateToken, verifyDeviceOwnership, async (req, res) => {
//   try {
//     const { deviceId } = req.params;
//     const { period = '24H', limit = 100 } = req.query;

//     let timeFilter = '';
//     switch (period) {
//       case '24H':
//         timeFilter = 'timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)';
//         break;
//       case '1W':
//         timeFilter = 'timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
//         break;
//       case '1M':
//         timeFilter = 'timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
//         break;
//       default:
//         timeFilter = 'timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)';
//     }

//     const [readings] = await promisePool.query(
//       `SELECT heart_rate, temperature, oxygen_saturation, movement_status, 
//        movement_intensity, timestamp, is_alert 
//        FROM vital_readings 
//        WHERE device_id = ? AND ${timeFilter}
//        ORDER BY timestamp DESC 
//        LIMIT ?`,
//       [deviceId, parseInt(limit)]
//     );

//     // Calculate averages
//     const avgHeartRate = readings.reduce((sum, r) => sum + (r.heart_rate || 0), 0) / readings.length || 0;
//     const avgTemperature = readings.reduce((sum, r) => sum + (r.temperature || 0), 0) / readings.length || 0;
//     const avgOxygen = readings.reduce((sum, r) => sum + (r.oxygen_saturation || 0), 0) / readings.length || 0;

//     res.json({
//       success: true,
//       data: {
//         readings: readings.reverse(), // Oldest to newest
//         summary: {
//           avgHeartRate: Math.round(avgHeartRate),
//           avgTemperature: avgTemperature.toFixed(1),
//           avgOxygen: Math.round(avgOxygen),
//           totalReadings: readings.length
//         }
//       }
//     });
//   } catch (error) {
//     console.error('Get vitals history error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch history'
//     });
//   }
// });

// // @route   GET /api/vitals/history-by-serial/:serial
// // @desc    Get vitals history by device serial with date range and pagination
// // @access  Private
// router.get('/history-by-serial/:serial', authenticateToken, async (req, res) => {
//   try {
//     const { serial } = req.params;
//     const { startDate, endDate, period, page = 1, limit = 20 } = req.query;

//     // Validate device serial
//     if (!serial) {
//       return res.status(400).json({
//         success: false,
//         message: 'Device serial is required'
//       });
//     }

//     // Get device_id from device_serial
//     const [deviceRows] = await promisePool.query(
//       'SELECT device_id FROM devices WHERE device_serial = ?',
//       [serial]
//     );

//     if (deviceRows.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: 'Device not found'
//       });
//     }

//     const deviceId = deviceRows[0].device_id;

//     // Calculate date range
//     let start, end;
//     if (startDate && endDate) {
//       start = new Date(startDate);
//       end = new Date(endDate);
//     } else if (period) {
//       end = new Date();
//       start = new Date();
//       switch (period) {
//         case '24H':
//           start.setHours(start.getHours() - 24);
//           break;
//         case '1W':
//           start.setDate(start.getDate() - 7);
//           break;
//         case '1M':
//           start.setMonth(start.getMonth() - 1);
//           break;
//         default:
//           start.setHours(start.getHours() - 24);
//       }
//     } else {
//       // Default to last 24 hours
//       end = new Date();
//       start = new Date(Date.now() - 24 * 60 * 60 * 1000);
//     }

//     // Calculate pagination
//     const pageNum = parseInt(page) || 1;
//     const limitNum = parseInt(limit) || 20;
//     const offset = (pageNum - 1) * limitNum;

//     // Fetch vitals readings within date range with pagination
//     const [readings] = await promisePool.query(
//       `SELECT 
//         reading_id,
//         heart_rate,
//         temperature,
//         oxygen_saturation,
//         movement_status,
//         movement_intensity,
//         is_alert,
//         timestamp
//       FROM vital_readings
//       WHERE device_id = ? 
//         AND timestamp BETWEEN ? AND ?
//       ORDER BY timestamp DESC
//       LIMIT ? OFFSET ?`,
//       [deviceId, start, end, limitNum, offset]
//     );

//     // Calculate summary statistics (only on first page)
//     let summary = null;
//     if (pageNum === 1) {
//       const [summaryRows] = await promisePool.query(
//         `SELECT 
//           AVG(heart_rate) as avg_heart_rate,
//           AVG(temperature) as avg_temperature,
//           AVG(oxygen_saturation) as avg_oxygen_saturation,
//           MIN(heart_rate) as min_heart_rate,
//           MAX(heart_rate) as max_heart_rate,
//           MIN(temperature) as min_temperature,
//           MAX(temperature) as max_temperature,
//           MIN(oxygen_saturation) as min_oxygen_saturation,
//           MAX(oxygen_saturation) as max_oxygen_saturation,
//           COUNT(*) as total_readings
//         FROM vital_readings
//         WHERE device_id = ? 
//           AND timestamp BETWEEN ? AND ?`,
//         [deviceId, start, end]
//       );
//       summary = summaryRows[0] || null;
//     }

//     return res.json({
//       success: true,
//       data: {
//         readings,
//         summary,
//         device_serial: serial,
//         pagination: {
//           page: pageNum,
//           limit: limitNum,
//           has_more: readings.length === limitNum
//         },
//         date_range: {
//           start: start.toISOString(),
//           end: end.toISOString()
//         }
//       }
//     });

//   } catch (error) {
//     console.error('Error fetching vitals history:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Error fetching vitals history',
//       error: error.message
//     });
//   }
// });

// // @route   GET /api/vitals/daily-average/:deviceId
// // @desc    Get daily averages for charts
// // @access  Private
// router.get('/daily-average/:deviceId', authenticateToken, verifyDeviceOwnership, async (req, res) => {
//   try {
//     const { deviceId } = req.params;
//     const { days = 7 } = req.query;

//     const [averages] = await promisePool.query(
//       `SELECT * FROM daily_vital_averages 
//        WHERE device_id = ? 
//        AND date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
//        ORDER BY date ASC`,
//       [deviceId, parseInt(days)]
//     );

//     res.json({
//       success: true,
//       data: averages
//     });
//   } catch (error) {
//     console.error('Get daily averages error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch averages'
//     });
//   }
// });

// // @route   GET /api/vitals/statistics/:serial
// // @desc    Get detailed statistics for a device
// // @access  Private
// router.get('/statistics/:serial', authenticateToken, async (req, res) => {
//   try {
//     const { serial } = req.params;
//     const { period } = req.query; // '24h', '7d', '30d'

//     // Calculate start date based on period
//     let hoursBack = 24;
//     switch (period) {
//       case '7d':
//         hoursBack = 24 * 7;
//         break;
//       case '30d':
//         hoursBack = 24 * 30;
//         break;
//       default:
//         hoursBack = 24;
//     }

//     const startDate = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

//     // Get device_id
//     const [deviceRows] = await promisePool.query(
//       'SELECT device_id FROM devices WHERE device_serial = ?',
//       [serial]
//     );

//     if (deviceRows.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: 'Device not found'
//       });
//     }

//     const deviceId = deviceRows[0].device_id;

//     // Get hourly averages
//     const [hourlyData] = await promisePool.query(
//       `SELECT 
//         DATE_FORMAT(timestamp, '%Y-%m-%d %H:00:00') as hour,
//         AVG(heart_rate) as avg_heart_rate,
//         AVG(temperature) as avg_temperature,
//         AVG(oxygen_saturation) as avg_oxygen_saturation,
//         COUNT(*) as reading_count
//       FROM vital_readings
//       WHERE device_id = ? AND timestamp >= ?
//       GROUP BY hour
//       ORDER BY hour DESC`,
//       [deviceId, startDate]
//     );

//     // Get movement distribution
//     const [movementData] = await promisePool.query(
//       `SELECT 
//         movement_status,
//         COUNT(*) as count
//       FROM vital_readings
//       WHERE device_id = ? AND timestamp >= ?
//       GROUP BY movement_status`,
//       [deviceId, startDate]
//     );

//     // Get alerts count
//     const [alertData] = await promisePool.query(
//       `SELECT COUNT(*) as alert_count
//       FROM vital_readings
//       WHERE device_id = ? AND timestamp >= ? AND is_alert = 1`,
//       [deviceId, startDate]
//     );

//     return res.json({
//       success: true,
//       data: {
//         hourly_data: hourlyData,
//         movement_distribution: movementData,
//         alerts: alertData[0],
//         period: period || '24h'
//       }
//     });

//   } catch (error) {
//     console.error('Error fetching statistics:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Error fetching statistics',
//       error: error.message
//     });
//   }
// });

// module.exports = router;

const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken, verifyDeviceOwnership } = require('../middleware/auth');
const { sendPushNotification } = require('../config/firebase');

// ==================== SLEEP TRACKING HELPER FUNCTIONS ====================

/**
 * Process sleep status when vital signs are recorded
 * Tracks when baby starts/stops sleeping and calculates duration
 */
async function processSleepTracking(deviceId, movementStatus, req) {
  try {
    const io = req.app.get('io');
    
    if (movementStatus === 'sleeping') {
      // Check if there's an active sleep session
      const activeSession = await pool.query(
        `SELECT session_id, start_time FROM sleep_sessions 
         WHERE device_id = $1 AND is_active = TRUE 
         ORDER BY start_time DESC LIMIT 1`,
        [deviceId]
      );

      if (activeSession.rows.length === 0) {
        // Start new sleep session
        const newSession = await pool.query(
          `INSERT INTO sleep_sessions (device_id, start_time, is_active, duration_minutes)
           VALUES ($1, CURRENT_TIMESTAMP, TRUE, 0)
           RETURNING session_id, start_time`,
          [deviceId]
        );
        
        console.log(`😴 Started new sleep session for device ${deviceId}`);
        
        // EMIT REAL-TIME EVENT: Sleep started
        if (io) {
          io.emit('sleep_started', {
            device_id: deviceId,
            session_id: newSession.rows[0].session_id,
            start_time: newSession.rows[0].start_time,
            current_duration_minutes: 0
          });
          
          // Also emit session update
          io.emit('sleep_session_update', {
            device_id: deviceId,
            is_sleeping: true,
            start_time: newSession.rows[0].start_time,
            current_duration_minutes: 0
          });
        }
      } else {
        // Update duration of existing session (in minutes)
        const sessionId = activeSession.rows[0].session_id;
        const updateResult = await pool.query(
          `UPDATE sleep_sessions 
           SET duration_minutes = CEIL(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - start_time)) / 60),
               updated_at = CURRENT_TIMESTAMP
           WHERE session_id = $1
           RETURNING duration_minutes`,
          [sessionId]
        );
        
        const currentDuration = parseInt(updateResult.rows[0].duration_minutes);
        
        // EMIT REAL-TIME EVENT: Sleep duration update
        if (io) {
          io.emit('sleep_duration_update', {
            device_id: deviceId,
            session_id: sessionId,
            current_duration_minutes: currentDuration
          });
        }
      }
    } else {
      // Baby is not sleeping - end any active session
      const activeSession = await pool.query(
        `SELECT session_id, start_time FROM sleep_sessions 
         WHERE device_id = $1 AND is_active = TRUE 
         ORDER BY start_time DESC LIMIT 1`,
        [deviceId]
      );

      if (activeSession.rows.length > 0) {
        const session = activeSession.rows[0];
        
        // Calculate final duration and end the session
        const endResult = await pool.query(
          `UPDATE sleep_sessions 
           SET is_active = FALSE,
               end_time = CURRENT_TIMESTAMP,
               duration_minutes = CEIL(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - start_time)) / 60)
           WHERE session_id = $1
           RETURNING duration_minutes, start_time`,
          [session.session_id]
        );

        const durationMinutes = endResult.rows[0].duration_minutes;
        const sessionDate = new Date(endResult.rows[0].start_time).toISOString().split('T')[0];

        console.log(`⏰ Ended sleep session for device ${deviceId}, duration: ${durationMinutes} minutes`);

        // Update daily summary
        await updateDailySleepSummary(deviceId, sessionDate, durationMinutes);

        // EMIT REAL-TIME EVENTS: Sleep ended and data updated
        if (io) {
          io.emit('sleep_ended', {
            device_id: deviceId,
            session_id: session.session_id,
            total_duration_minutes: durationMinutes,
            end_time: new Date().toISOString()
          });
          
          io.emit('sleep_data_updated', {
            device_id: deviceId,
            date: sessionDate
          });
          
          // Emit session update to indicate not sleeping
          io.emit('sleep_session_update', {
            device_id: deviceId,
            is_sleeping: false,
            current_duration_minutes: 0
          });
        }
      }
    }
  } catch (error) {
    console.error('Sleep tracking error:', error);
    // Don't throw - sleep tracking errors shouldn't break vital recording
  }
}

/**
 * Update or create daily sleep summary
 */
async function updateDailySleepSummary(deviceId, date, durationMinutes) {
  try {
    await pool.query(
      `INSERT INTO daily_sleep_summary (device_id, date, total_sleep_minutes, sleep_session_count, longest_session_minutes)
       VALUES ($1, $2, $3, 1, $3)
       ON CONFLICT (device_id, date) 
       DO UPDATE SET 
         total_sleep_minutes = daily_sleep_summary.total_sleep_minutes + $3,
         sleep_session_count = daily_sleep_summary.sleep_session_count + 1,
         longest_session_minutes = GREATEST(daily_sleep_summary.longest_session_minutes, $3),
         updated_at = CURRENT_TIMESTAMP`,
      [deviceId, date, durationMinutes]
    );
    console.log(`📊 Updated daily sleep summary for device ${deviceId} on ${date}`);
  } catch (error) {
    console.error('Error updating daily sleep summary:', error);
  }
}

router.post('/record', async (req, res) => {
  try {
    const {
      device_serial,
      heart_rate,
      temperature,
      oxygen_saturation,
      movement_status,
      battery_level
    } = req.body;

    if (!device_serial) {
      return res.status(400).json({
        success: false,
        message: 'Device serial is required'
      });
    }

    // Get device info
    const deviceResult = await pool.query(
      `SELECT d.device_id, d.device_name 
       FROM devices d
       WHERE d.device_serial = $1`,
      [device_serial]
    );

    if (deviceResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    const device = deviceResult.rows[0];
    const deviceId = device.device_id;
    const deviceName = device.device_name || 'LittleWatch';

    // Get ALL users who have this device linked AND have notifications enabled
    const usersResult = await pool.query(
      `SELECT user_id, fcm_token, full_name, notification_enabled 
       FROM users 
       WHERE device_serial = $1`,
      [device_serial]
    );

    console.log(`📱 Device: ${deviceName}, Total Linked Users: ${usersResult.rows.length}`);

    // Get threshold settings
    const thresholdResult = await pool.query(
      'SELECT * FROM threshold_settings WHERE device_id = $1',
      [deviceId]
    );

    const settings = thresholdResult.rows[0] || {
      heart_rate_min: 80,
      heart_rate_max: 140,
      temperature_min: 36.0,
      temperature_max: 37.8,
      oxygen_min: 94
    };

    // Check for alerts
    let isAlert = false;
    let alertMessages = [];

    if (heart_rate < settings.heart_rate_min) {
      isAlert = true;
      alertMessages.push({
        type: 'critical',
        title: 'Warning! Low Heart Rate Alert',
        message: `${deviceName}: Heart rate is below normal (${heart_rate} BPM)`,
        icon: 'heart',
        color: '#FF5252'
      });
    } else if (heart_rate > settings.heart_rate_max) {
      isAlert = true;
      alertMessages.push({
        type: 'warning',
        title: 'Warning! High Heart Rate Alert',
        message: `${deviceName}: Heart rate is above normal (${heart_rate} BPM)`,
        icon: 'heart',
        color: '#FF9800'
      });
    }

    if (temperature < settings.temperature_min) {
      isAlert = true;
      alertMessages.push({
        type: 'warning',
        title: 'Warning! Low Temperature Alert',
        message: `${deviceName}: Temperature is below normal (${temperature}°C)`,
        icon: 'thermometer',
        color: '#2196F3'
      });
    } else if (temperature > settings.temperature_max) {
      isAlert = true;
      alertMessages.push({
        type: 'critical',
        title: 'Warning! High Temperature Alert',
        message: `${deviceName}: Temperature is above normal (${temperature}°C)`,
        icon: 'thermometer',
        color: '#FF5252'
      });
    }

    if (oxygen_saturation < settings.oxygen_min) {
      isAlert = true;
      alertMessages.push({
        type: 'critical',
        title: 'Warning! Low Oxygen Alert',
        message: `${deviceName}: Oxygen saturation is low (${oxygen_saturation}%)`,
        icon: 'water',
        color: '#FF5252'
      });
    }

    // Insert vital reading
    await pool.query(
      `INSERT INTO vital_readings 
       (device_id, heart_rate, temperature, oxygen_saturation, movement_status, is_alert, timestamp) 
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
      [deviceId, heart_rate, temperature, oxygen_saturation, movement_status, isAlert]
    );

    // ==================== SLEEP TRACKING ====================
    // Process sleep status (this tracks sleep sessions automatically)
    await processSleepTracking(deviceId, movement_status, req);

    // Update device status
    await pool.query(
      'UPDATE devices SET battery_level = $1, is_connected = TRUE, last_sync = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE device_id = $2',
      [battery_level, deviceId]
    );

    // Send notifications to users who have notifications enabled
    let notificationsSent = 0;
    let usersNotified = 0;

    if (isAlert && alertMessages.length > 0) {
      console.log(`🚨 ${alertMessages.length} alert(s) detected`);
      
      for (const user of usersResult.rows) {
        const userId = user.user_id;
        const fcmToken = user.fcm_token;
        const notificationEnabled = user.notification_enabled;
        
        console.log(`👤 User ${user.full_name} (ID: ${userId}), Notifications: ${notificationEnabled ? 'Enabled' : 'Disabled'}`);
        
        for (const alert of alertMessages) {
          // Always save notification to database (for history)
          await pool.query(
            `INSERT INTO notifications (user_id, device_id, type, title, message, icon, color, created_at) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
            [userId, deviceId, alert.type, alert.title, alert.message, alert.icon, alert.color]
          );

          // Only send push notification if user has notifications enabled
          if (notificationEnabled && fcmToken) {
            console.log(`📲 Sending push to ${user.full_name}`);
            await sendPushNotification(
              fcmToken,
              alert.title,
              alert.message,
              {
                type: 'vital_alert',
                alertType: alert.type,
                deviceId: deviceId.toString(),
                deviceName: deviceName,
                heart_rate: heart_rate.toString(),
                temperature: temperature.toString(),
                oxygen_saturation: oxygen_saturation.toString()
              }
            );
            notificationsSent++;
          } else if (!notificationEnabled) {
            console.log(`🔕 Notifications disabled for ${user.full_name}`);
          } else {
            console.log(`⚠️ No FCM token for ${user.full_name}`);
          }
        }

        // Always emit Socket.IO event (for real-time UI updates)
        const io = req.app.get('io');
        if (io) {
          io.to(`user_${userId}`).emit('vital_alert', {
            deviceId,
            deviceName,
            alerts: alertMessages,
            vitals: { heart_rate, temperature, oxygen_saturation, movement_status }
          });
        }

        if (notificationEnabled) {
          usersNotified++;
        }
      }
    }

    res.json({
      success: true,
      message: 'Vital signs recorded',
      isAlert,
      alertCount: alertMessages.length,
      notificationsSaved: isAlert ? usersResult.rows.length * alertMessages.length : 0,
      pushNotificationsSent: notificationsSent,
      usersNotified: usersNotified
    });
  } catch (error) {
    console.error('Record vitals error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record vital signs'
    });
  }
});

// @route   GET /api/vitals/vitalReadings
// @desc    Get all vital readings
// @access  Private
router.get('/vitalReadings', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
         reading_id, 
         device_id, 
         heart_rate, 
         temperature, 
         oxygen_saturation, 
         movement_status, 
         timestamp, 
         is_alert 
       FROM vital_readings 
       ORDER BY timestamp DESC`
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get all vital readings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vital readings'
    });
  }
});

// @route   GET /api/vitals/latest/:deviceId
// @desc    Get latest vital signs
// @access  Private
router.get('/latest/:deviceId', authenticateToken, verifyDeviceOwnership, async (req, res) => {
  try {
    const { deviceId } = req.params;

    const readingsResult = await pool.query(
      `SELECT heart_rate, temperature, oxygen_saturation, movement_status, 
       timestamp, is_alert 
       FROM vital_readings 
       WHERE device_id = $1 
       ORDER BY reading_id DESC 
       LIMIT 1`,
      [deviceId]
    );

    if (readingsResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No readings found'
      });
    }

    // Get device info
    const deviceResult = await pool.query(
      'SELECT battery_level, is_connected, last_sync FROM devices WHERE device_id = $1',
      [deviceId]
    );

    res.json({
      success: true,
      data: {
        vitals: readingsResult.rows[0],
        device: deviceResult.rows[0]
      }
    });
  } catch (error) {
    console.error('Get latest vitals error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vital signs'
    });
  }
});

// @route   GET /api/vitals/latest-by-serial/:deviceSerial
// @desc    Get latest vitals by device serial
// @access  Private
router.get('/latest-by-serial/:deviceSerial', authenticateToken, async (req, res) => {
  try {
    const { deviceSerial } = req.params;

    // Get device by serial
    const deviceResult = await pool.query(
      'SELECT device_id, device_serial, battery_level, is_connected, last_sync FROM devices WHERE device_serial = $1',
      [deviceSerial]
    );

    if (deviceResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    const device = deviceResult.rows[0];

    // Get latest vital reading for this device
    const readingsResult = await pool.query(
      `SELECT heart_rate, temperature, oxygen_saturation, movement_status, 
       timestamp, is_alert 
       FROM vital_readings 
       WHERE device_id = $1 
       ORDER BY timestamp DESC 
       LIMIT 1`,
      [device.device_id]
    );

    if (readingsResult.rows.length === 0) {
      return res.json({
        success: true,
        data: {
          vitals: {
            heart_rate: 0,
            temperature: 0,
            oxygen_saturation: 0,
            movement_status: '--',
            is_alert: false
          },
          device: device
        }
      });
    }

    res.json({
      success: true,
      data: {
        vitals: readingsResult.rows[0],
        device: device
      }
    });
  } catch (error) {
    console.error('Get latest vitals by serial error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vital signs'
    });
  }
});

// Continuation of routes/vitals.js
// Add this to the end of routes_vitals_part1.js

// @route   GET /api/vitals/history/:deviceId
// @desc    Get vital signs history
// @access  Private
router.get('/history/:deviceId', authenticateToken, verifyDeviceOwnership, async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { period = '24H', limit = 100 } = req.query;

    let timeFilter = '';
    switch (period) {
      case '24H':
        timeFilter = "timestamp >= CURRENT_TIMESTAMP - INTERVAL '24 hours'";
        break;
      case '1W':
        timeFilter = "timestamp >= CURRENT_TIMESTAMP - INTERVAL '7 days'";
        break;
      case '1M':
        timeFilter = "timestamp >= CURRENT_TIMESTAMP - INTERVAL '30 days'";
        break;
      default:
        timeFilter = "timestamp >= CURRENT_TIMESTAMP - INTERVAL '24 hours'";
    }

    const result = await pool.query(
      `SELECT heart_rate, temperature, oxygen_saturation, movement_status, 
       timestamp, is_alert 
       FROM vital_readings 
       WHERE device_id = $1 AND ${timeFilter}
       ORDER BY timestamp DESC 
       LIMIT $2`,
      [deviceId, parseInt(limit)]
    );

    const readings = result.rows;

    // Calculate averages
    const avgHeartRate = readings.reduce((sum, r) => sum + (r.heart_rate || 0), 0) / readings.length || 0;
    const avgTemperature = readings.reduce((sum, r) => sum + (parseFloat(r.temperature) || 0), 0) / readings.length || 0;
    const avgOxygen = readings.reduce((sum, r) => sum + (r.oxygen_saturation || 0), 0) / readings.length || 0;

    res.json({
      success: true,
      data: {
        readings: readings.reverse(), // Oldest to newest
        summary: {
          avgHeartRate: Math.round(avgHeartRate),
          avgTemperature: avgTemperature.toFixed(1),
          avgOxygen: Math.round(avgOxygen),
          totalReadings: readings.length
        }
      }
    });
  } catch (error) {
    console.error('Get vitals history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch history'
    });
  }
});

// @route   GET /api/vitals/history-by-serial/:serial
// @desc    Get vitals history by device serial with date range and pagination
// @access  Private
router.get('/history-by-serial/:serial', authenticateToken, async (req, res) => {
  try {
    const { serial } = req.params;
    const { startDate, endDate, period, page = 1, limit = 20 } = req.query;

    // Validate device serial
    if (!serial) {
      return res.status(400).json({
        success: false,
        message: 'Device serial is required'
      });
    }

    // Get device_id from device_serial
    const deviceResult = await pool.query(
      'SELECT device_id FROM devices WHERE device_serial = $1',
      [serial]
    );

    if (deviceResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    const deviceId = deviceResult.rows[0].device_id;

    // Calculate date range
    let start, end;
    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else if (period) {
      end = new Date();
      start = new Date();
      switch (period) {
        case '24H':
          start.setHours(start.getHours() - 24);
          break;
        case '1W':
          start.setDate(start.getDate() - 7);
          break;
        case '1M':
          start.setMonth(start.getMonth() - 1);
          break;
        default:
          start.setHours(start.getHours() - 24);
      }
    } else {
      // Default to last 24 hours
      end = new Date();
      start = new Date(Date.now() - 24 * 60 * 60 * 1000);
    }

    // Calculate pagination
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const offset = (pageNum - 1) * limitNum;

    // Fetch vitals readings within date range with pagination
    const readingsResult = await pool.query(
      `SELECT 
        reading_id,
        heart_rate,
        temperature,
        oxygen_saturation,
        movement_status,
        is_alert,
        timestamp
      FROM vital_readings
      WHERE device_id = $1 
        AND timestamp BETWEEN $2 AND $3
      ORDER BY timestamp DESC
      LIMIT $4 OFFSET $5`,
      [deviceId, start, end, limitNum, offset]
    );

    const readings = readingsResult.rows;

    // Calculate summary statistics (only on first page)
    let summary = null;
    if (pageNum === 1) {
      const summaryResult = await pool.query(
        `SELECT 
          AVG(heart_rate) as avg_heart_rate,
          AVG(temperature) as avg_temperature,
          AVG(oxygen_saturation) as avg_oxygen_saturation,
          MIN(heart_rate) as min_heart_rate,
          MAX(heart_rate) as max_heart_rate,
          MIN(temperature) as min_temperature,
          MAX(temperature) as max_temperature,
          MIN(oxygen_saturation) as min_oxygen_saturation,
          MAX(oxygen_saturation) as max_oxygen_saturation,
          COUNT(*) as total_readings
        FROM vital_readings
        WHERE device_id = $1 
          AND timestamp BETWEEN $2 AND $3`,
        [deviceId, start, end]
      );
      summary = summaryResult.rows[0] || null;
    }

    return res.json({
      success: true,
      data: {
        readings,
        summary,
        device_serial: serial,
        pagination: {
          page: pageNum,
          limit: limitNum,
          has_more: readings.length === limitNum
        },
        date_range: {
          start: start.toISOString(),
          end: end.toISOString()
        }
      }
    });

  } catch (error) {
    console.error('Error fetching vitals history:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching vitals history',
      error: error.message
    });
  }
});

// @route   GET /api/vitals/daily-average/:deviceId
// @desc    Get daily averages for charts
// @access  Private
router.get('/daily-average/:deviceId', authenticateToken, verifyDeviceOwnership, async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { days = 7 } = req.query;

    const result = await pool.query(
      `SELECT 
        device_id,
        DATE(timestamp) as date,
        AVG(heart_rate) as avg_heart_rate,
        AVG(temperature) as avg_temperature,
        AVG(oxygen_saturation) as avg_oxygen,
        MIN(heart_rate) as min_heart_rate,
        MAX(heart_rate) as max_heart_rate,
        COUNT(*) as reading_count
       FROM vital_readings
       WHERE device_id = $1 
       AND timestamp >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'
       GROUP BY device_id, DATE(timestamp)
       ORDER BY date ASC`,
      [deviceId]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get daily averages error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch averages'
    });
  }
});

// @route   GET /api/vitals/statistics/:serial
// @desc    Get detailed statistics for a device
// @access  Private
router.get('/statistics/:serial', authenticateToken, async (req, res) => {
  try {
    const { serial } = req.params;
    const { period } = req.query; // '24h', '7d', '30d'

    // Calculate start date based on period
    let hoursBack = 24;
    switch (period) {
      case '7d':
        hoursBack = 24 * 7;
        break;
      case '30d':
        hoursBack = 24 * 30;
        break;
      default:
        hoursBack = 24;
    }

    const startDate = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

    // Get device_id
    const deviceResult = await pool.query(
      'SELECT device_id FROM devices WHERE device_serial = $1',
      [serial]
    );

    if (deviceResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    const deviceId = deviceResult.rows[0].device_id;

    // Get hourly averages
    const hourlyResult = await pool.query(
      `SELECT 
        TO_CHAR(DATE_TRUNC('hour', timestamp), 'YYYY-MM-DD HH24:00:00') as hour,
        AVG(heart_rate) as avg_heart_rate,
        AVG(temperature) as avg_temperature,
        AVG(oxygen_saturation) as avg_oxygen_saturation,
        COUNT(*) as reading_count
      FROM vital_readings
      WHERE device_id = $1 AND timestamp >= $2
      GROUP BY DATE_TRUNC('hour', timestamp)
      ORDER BY hour DESC`,
      [deviceId, startDate]
    );

    // Get movement distribution
    const movementResult = await pool.query(
      `SELECT 
        movement_status,
        COUNT(*) as count
      FROM vital_readings
      WHERE device_id = $1 AND timestamp >= $2
      GROUP BY movement_status`,
      [deviceId, startDate]
    );

    // Get alerts count
    const alertResult = await pool.query(
      `SELECT COUNT(*) as alert_count
      FROM vital_readings
      WHERE device_id = $1 AND timestamp >= $2 AND is_alert = TRUE`,
      [deviceId, startDate]
    );

    return res.json({
      success: true,
      data: {
        hourly_data: hourlyResult.rows,
        movement_distribution: movementResult.rows,
        alerts: alertResult.rows[0],
        period: period || '24h'
      }
    });

  } catch (error) {
    console.error('Error fetching statistics:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
});

// ==================== SLEEP DATA ROUTES ====================

// @route   GET /api/vitals/sleep/data/:deviceSerial
// @desc    Get sleep data for the past X days (for charts)
// @access  Private
router.get('/sleep/data/:deviceSerial', authenticateToken, async (req, res) => {
  try {
    const { deviceSerial } = req.params;
    const days = parseInt(req.query.days) || 7;

    // Get device_id
    const deviceResult = await pool.query(
      'SELECT device_id FROM devices WHERE device_serial = $1',
      [deviceSerial]
    );

    if (deviceResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    const deviceId = deviceResult.rows[0].device_id;

    // Get daily sleep summaries
    const sleepResult = await pool.query(
      `SELECT 
        date,
        total_sleep_minutes,
        ROUND(total_sleep_minutes / 60.0, 1) as total_sleep_hours,
        sleep_session_count,
        longest_session_minutes,
        ROUND(longest_session_minutes / 60.0, 1) as longest_session_hours
       FROM daily_sleep_summary
       WHERE device_id = $1 
         AND date >= CURRENT_DATE - INTERVAL '${days} days'
       ORDER BY date ASC`,
      [deviceId]
    );

    // Format data for the mobile app chart
    const formattedData = sleepResult.rows.map(row => ({
      date: new Date(row.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      hours: parseFloat(row.total_sleep_hours) || 0,
      minutes: parseInt(row.total_sleep_minutes) || 0,
      sessions: parseInt(row.sleep_session_count) || 0,
      longestSessionHours: parseFloat(row.longest_session_hours) || 0
    }));

    res.json({
      success: true,
      data: formattedData
    });
  } catch (error) {
    console.error('Error fetching sleep data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sleep data',
      error: error.message
    });
  }
});

// @route   GET /api/vitals/sleep/statistics/:deviceSerial
// @desc    Get sleep statistics (averages, min, max)
// @access  Private
router.get('/sleep/statistics/:deviceSerial', authenticateToken, async (req, res) => {
  try {
    const { deviceSerial } = req.params;
    const days = parseInt(req.query.days) || 7;

    // Get device_id
    const deviceResult = await pool.query(
      'SELECT device_id FROM devices WHERE device_serial = $1',
      [deviceSerial]
    );

    if (deviceResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    const deviceId = deviceResult.rows[0].device_id;

    // Get statistics
    const statsResult = await pool.query(
      `SELECT 
        COUNT(*) as total_days_tracked,
        COALESCE(ROUND(AVG(total_sleep_minutes) / 60.0, 1), 0) as avg_sleep_hours,
        COALESCE(ROUND(MAX(total_sleep_minutes) / 60.0, 1), 0) as max_sleep_hours,
        COALESCE(ROUND(MIN(total_sleep_minutes) / 60.0, 1), 0) as min_sleep_hours,
        COALESCE(SUM(sleep_session_count), 0) as total_sessions,
        COALESCE(ROUND(AVG(longest_session_minutes) / 60.0, 1), 0) as avg_longest_session_hours
       FROM daily_sleep_summary
       WHERE device_id = $1 
         AND date >= CURRENT_DATE - INTERVAL '${days} days'`,
      [deviceId]
    );

    const stats = statsResult.rows[0];

    res.json({
      success: true,
      data: {
        daysTracked: parseInt(stats.total_days_tracked) || 0,
        averageSleepHours: parseFloat(stats.avg_sleep_hours) || 0,
        maxSleepHours: parseFloat(stats.max_sleep_hours) || 0,
        minSleepHours: parseFloat(stats.min_sleep_hours) || 0,
        totalSessions: parseInt(stats.total_sessions) || 0,
        avgLongestSessionHours: parseFloat(stats.avg_longest_session_hours) || 0
      }
    });
  } catch (error) {
    console.error('Error fetching sleep statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sleep statistics',
      error: error.message
    });
  }
});

// @route   GET /api/vitals/sleep/current/:deviceSerial
// @desc    Get current sleep status (is baby sleeping now?)
// @access  Private
router.get('/sleep/current/:deviceSerial', authenticateToken, async (req, res) => {
  try {
    const { deviceSerial } = req.params;

    // Get device_id
    const deviceResult = await pool.query(
      'SELECT device_id FROM devices WHERE device_serial = $1',
      [deviceSerial]
    );

    if (deviceResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    const deviceId = deviceResult.rows[0].device_id;

    // Check for active sleep session
    const sessionResult = await pool.query(
      `SELECT 
        session_id,
        start_time,
        CEIL(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - start_time)) / 60) as current_duration_minutes
       FROM sleep_sessions
       WHERE device_id = $1 AND is_active = TRUE
       ORDER BY start_time DESC
       LIMIT 1`,
      [deviceId]
    );

    if (sessionResult.rows.length > 0) {
      const session = sessionResult.rows[0];
      res.json({
        success: true,
        isSleeping: true,
        data: {
          sessionId: session.session_id,
          startTime: session.start_time,
          currentDurationMinutes: parseInt(session.current_duration_minutes),
          currentDurationHours: (parseInt(session.current_duration_minutes) / 60).toFixed(1)
        }
      });
    } else {
      res.json({
        success: true,
        isSleeping: false,
        data: null
      });
    }
  } catch (error) {
    console.error('Error fetching current sleep status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch current sleep status',
      error: error.message
    });
  }
});

// @route   GET /api/vitals/sleep/sessions/:deviceSerial
// @desc    Get all sleep sessions for a date range
// @access  Private
router.get('/sleep/sessions/:deviceSerial', authenticateToken, async (req, res) => {
  try {
    const { deviceSerial } = req.params;
    const { date, days = 7 } = req.query;

    // Get device_id
    const deviceResult = await pool.query(
      'SELECT device_id FROM devices WHERE device_serial = $1',
      [deviceSerial]
    );

    if (deviceResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    const deviceId = deviceResult.rows[0].device_id;

    let sessionsResult;
    if (date) {
      // Get sessions for specific date
      sessionsResult = await pool.query(
        `SELECT 
          session_id,
          start_time,
          end_time,
          duration_minutes,
          ROUND(duration_minutes / 60.0, 1) as duration_hours,
          is_active
         FROM sleep_sessions
         WHERE device_id = $1 AND DATE(start_time) = $2
         ORDER BY start_time ASC`,
        [deviceId, date]
      );
    } else {
      // Get sessions for past X days
      sessionsResult = await pool.query(
        `SELECT 
          session_id,
          start_time,
          end_time,
          duration_minutes,
          ROUND(duration_minutes / 60.0, 1) as duration_hours,
          is_active
         FROM sleep_sessions
         WHERE device_id = $1 
           AND start_time >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'
         ORDER BY start_time DESC`,
        [deviceId]
      );
    }

    res.json({
      success: true,
      data: sessionsResult.rows
    });
  } catch (error) {
    console.error('Error fetching sleep sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sleep sessions',
      error: error.message
    });
  }
});
module.exports = router;