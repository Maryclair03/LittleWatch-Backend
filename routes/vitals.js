const express = require('express');
const router = express.Router();
const { promisePool } = require('../config/database');
const { authenticateToken, verifyDeviceOwnership } = require('../middleware/auth');
const { sendPushNotification } = require('../config/firebase'); // Add this

router.post('/record', async (req, res) => {
  try {
    const {
      device_serial,
      heart_rate,
      temperature,
      oxygen_saturation,
      movement_status,
      movement_intensity,
      battery_level
    } = req.body;

    console.log('--- VITALS RECEIVED ---');
    console.log('Device Serial:', device_serial);

    if (!device_serial) {
      return res.status(400).json({
        success: false,
        message: 'Device serial is required'
      });
    }

    // Validate device exists and get user info with FCM token
    const [devices] = await promisePool.query(
      `SELECT d.device_id, d.user_id, d.device_name, u.fcmToken, u.name as user_name, u.email 
       FROM devices d
       JOIN users u ON d.user_id = u.user_id
       WHERE d.device_serial = ?`,
      [device_serial]
    );

    if (devices.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    const deviceId = devices[0].device_id;
    const userId = devices[0].user_id;
    const fcmToken = devices[0].fcmToken;
    const deviceName = devices[0].device_name || 'Your device';
    const userName = devices[0].user_name;

    console.log(`📱 Device: ${deviceName}, User: ${userName}, FCM Token: ${fcmToken ? 'Present' : 'Missing'}`);

    // Get threshold settings
    const [thresholds] = await promisePool.query(
      'SELECT * FROM threshold_settings WHERE device_id = ?',
      [deviceId]
    );

    const settings = thresholds[0] || {
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
    await promisePool.query(
      `INSERT INTO vital_readings 
       (device_id, heart_rate, temperature, oxygen_saturation, movement_status, movement_intensity, is_alert) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [deviceId, heart_rate, temperature, oxygen_saturation, movement_status, movement_intensity, isAlert]
    );

    // Update device status
    await promisePool.query(
      'UPDATE devices SET battery_level = ?, is_connected = TRUE, last_sync = CURRENT_TIMESTAMP WHERE device_id = ?',
      [battery_level, deviceId]
    );

    // Create notifications and send push notifications if alerts detected
    if (isAlert && alertMessages.length > 0) {
      console.log(`🚨 ${alertMessages.length} alert(s) detected for user ${userId}`);
      
      for (const alert of alertMessages) {
        // Save to notifications table
        await promisePool.query(
          `INSERT INTO notifications (user_id, device_id, type, title, message, icon, color) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [userId, deviceId, alert.type, alert.title, alert.message, alert.icon, alert.color]
        );

        // Send push notification if user has FCM token
        if (fcmToken) {
          console.log(`📲 Sending push notification: ${alert.title}`);
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
        } else {
          console.log('⚠️ No FCM token found for user, skipping push notification');
        }
      }

      // Emit real-time alert via Socket.IO (if user is connected)
      const io = req.app.get('io');
      if (io) {
        io.to(`user_${userId}`).emit('vital_alert', {
          deviceId,
          deviceName,
          alerts: alertMessages,
          vitals: { heart_rate, temperature, oxygen_saturation, movement_status }
        });
      }
    }

    res.json({
      success: true,
      message: 'Vital signs recorded',
      isAlert,
      alertCount: alertMessages.length,
      notificationsSent: isAlert && fcmToken ? alertMessages.length : 0
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
    const [readings] = await promisePool.query(
      `SELECT 
         reading_id, 
         device_id, 
         heart_rate, 
         temperature, 
         oxygen_saturation, 
         movement_status, 
         movement_intensity, 
         timestamp, 
         is_alert 
       FROM vital_readings 
       ORDER BY timestamp DESC`
    );

    res.json({
      success: true,
      data: readings
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

    const [readings] = await promisePool.query(
      `SELECT heart_rate, temperature, oxygen_saturation, movement_status, 
       movement_intensity, timestamp, is_alert 
       FROM vital_readings 
       WHERE device_id = ? 
       ORDER BY reading_id DESC 
       LIMIT 1`,
      [deviceId]
    );

    if (readings.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No readings found'
      });
    }

    // Get device info
    const [devices] = await promisePool.query(
      'SELECT battery_level, is_connected, last_sync FROM devices WHERE device_id = ?',
      [deviceId]
    );

    res.json({
      success: true,
      data: {
        vitals: readings[0],
        device: devices[0]
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
    const [devices] = await promisePool.query(
      'SELECT device_id, device_serial, battery_level, is_connected, last_sync FROM devices WHERE device_serial = ?',
      [deviceSerial]
    );

    if (devices.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    const device = devices[0];

    // Get latest vital reading for this device
    const [readings] = await promisePool.query(
      `SELECT heart_rate, temperature, oxygen_saturation, movement_status, 
       movement_intensity, timestamp, is_alert 
       FROM vital_readings 
       WHERE device_id = ? 
       ORDER BY timestamp DESC 
       LIMIT 1`,
      [device.device_id]
    );

    if (readings.length === 0) {
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
        vitals: readings[0],
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
        timeFilter = 'timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)';
        break;
      case '1W':
        timeFilter = 'timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
        break;
      case '1M':
        timeFilter = 'timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
        break;
      default:
        timeFilter = 'timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)';
    }

    const [readings] = await promisePool.query(
      `SELECT heart_rate, temperature, oxygen_saturation, movement_status, 
       movement_intensity, timestamp, is_alert 
       FROM vital_readings 
       WHERE device_id = ? AND ${timeFilter}
       ORDER BY timestamp DESC 
       LIMIT ?`,
      [deviceId, parseInt(limit)]
    );

    // Calculate averages
    const avgHeartRate = readings.reduce((sum, r) => sum + (r.heart_rate || 0), 0) / readings.length || 0;
    const avgTemperature = readings.reduce((sum, r) => sum + (r.temperature || 0), 0) / readings.length || 0;
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
    const [deviceRows] = await promisePool.query(
      'SELECT device_id FROM devices WHERE device_serial = ?',
      [serial]
    );

    if (deviceRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    const deviceId = deviceRows[0].device_id;

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
    const [readings] = await promisePool.query(
      `SELECT 
        reading_id,
        heart_rate,
        temperature,
        oxygen_saturation,
        movement_status,
        movement_intensity,
        is_alert,
        timestamp
      FROM vital_readings
      WHERE device_id = ? 
        AND timestamp BETWEEN ? AND ?
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?`,
      [deviceId, start, end, limitNum, offset]
    );

    // Calculate summary statistics (only on first page)
    let summary = null;
    if (pageNum === 1) {
      const [summaryRows] = await promisePool.query(
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
        WHERE device_id = ? 
          AND timestamp BETWEEN ? AND ?`,
        [deviceId, start, end]
      );
      summary = summaryRows[0] || null;
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

    const [averages] = await promisePool.query(
      `SELECT * FROM daily_vital_averages 
       WHERE device_id = ? 
       AND date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       ORDER BY date ASC`,
      [deviceId, parseInt(days)]
    );

    res.json({
      success: true,
      data: averages
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
    const [deviceRows] = await promisePool.query(
      'SELECT device_id FROM devices WHERE device_serial = ?',
      [serial]
    );

    if (deviceRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    const deviceId = deviceRows[0].device_id;

    // Get hourly averages
    const [hourlyData] = await promisePool.query(
      `SELECT 
        DATE_FORMAT(timestamp, '%Y-%m-%d %H:00:00') as hour,
        AVG(heart_rate) as avg_heart_rate,
        AVG(temperature) as avg_temperature,
        AVG(oxygen_saturation) as avg_oxygen_saturation,
        COUNT(*) as reading_count
      FROM vital_readings
      WHERE device_id = ? AND timestamp >= ?
      GROUP BY hour
      ORDER BY hour DESC`,
      [deviceId, startDate]
    );

    // Get movement distribution
    const [movementData] = await promisePool.query(
      `SELECT 
        movement_status,
        COUNT(*) as count
      FROM vital_readings
      WHERE device_id = ? AND timestamp >= ?
      GROUP BY movement_status`,
      [deviceId, startDate]
    );

    // Get alerts count
    const [alertData] = await promisePool.query(
      `SELECT COUNT(*) as alert_count
      FROM vital_readings
      WHERE device_id = ? AND timestamp >= ? AND is_alert = 1`,
      [deviceId, startDate]
    );

    return res.json({
      success: true,
      data: {
        hourly_data: hourlyData,
        movement_distribution: movementData,
        alerts: alertData[0],
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

module.exports = router;