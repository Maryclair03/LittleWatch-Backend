// const express = require('express');
// const router = express.Router();
// const { promisePool } = require('../config/database');
// const { authenticateToken, verifyDeviceOwnership } = require('../middleware/auth');

// // @route   POST /api/devices/link
// // @desc    Link a device to user by device_serial
// // @access  Private
// router.post('/link', authenticateToken, async (req, res) => {
//   try {
//     const userId = req.user.userId;
//     const { device_serial } = req.body;

//     if (!device_serial) {
//       return res.status(400).json({
//         success: false,
//         message: 'Device serial is required',
//       });
//     }

//     // Check if device exists in devices table
//     const [devices] = await promisePool.query(
//       'SELECT * FROM devices WHERE device_serial = ?',
//       [device_serial]
//     );

//     if (devices.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: 'Device not found. Please check the QR code and try again.',
//       });
//     }

//     // Check if device is already linked to another user
//     const [existingLink] = await promisePool.query(
//       'SELECT user_id FROM users WHERE device_serial = ? AND user_id != ?',
//       [device_serial, userId]
//     );

//     if (existingLink.length > 0) {
//       return res.status(400).json({
//         success: false,
//         message: 'This device is already linked to another account.',
//       });
//     }

//     // Update user's device_serial
//     await promisePool.query(
//       'UPDATE users SET device_serial = ? WHERE user_id = ?',
//       [device_serial, userId]
//     );

//     res.json({
//       success: true,
//       message: 'Device linked successfully',
//       data: {
//         device_serial: device_serial,
//       },
//     });
//   } catch (error) {
//     console.error('Link device error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to link device',
//     });
//   }
// });

// // @route   POST /api/devices/unlink
// // @desc    Unlink device from user
// // @access  Private
// router.post('/unlink', authenticateToken, async (req, res) => {
//   try {
//     const userId = req.user.userId;

//     // Set device_serial to NULL for this user
//     await promisePool.query(
//       'UPDATE users SET device_serial = NULL WHERE user_id = ?',
//       [userId]
//     );

//     res.json({
//       success: true,
//       message: 'Device unlinked successfully',
//     });
//   } catch (error) {
//     console.error('Unlink device error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to unlink device',
//     });
//   }
// });

// // @route   POST /api/devices/register
// // @desc    Register a new device
// // @access  Private
// router.post('/register', authenticateToken, async (req, res) => {
//   try {
//     const { deviceSerial, deviceName } = req.body;
//     const userId = req.user.userId;

//     if (!deviceSerial) {
//       return res.status(400).json({
//         success: false,
//         message: 'Device serial is required'
//       });
//     }

//     // Check if device already exists
//     const [existing] = await promisePool.query(
//       'SELECT device_id FROM devices WHERE device_serial = ?',
//       [deviceSerial]
//     );

//     if (existing.length > 0) {
//       return res.status(400).json({
//         success: false,
//         message: 'Device already registered'
//       });
//     }

//     // Register device
//     const [result] = await promisePool.query(
//       'INSERT INTO devices (device_serial, user_id, device_name) VALUES (?, ?, ?)',
//       [deviceSerial, userId, deviceName || 'LittleWatch Band']
//     );

//     res.status(201).json({
//       success: true,
//       message: 'Device registered successfully',
//       data: {
//         deviceId: result.insertId,
//         deviceSerial,
//         deviceName: deviceName || 'LittleWatch Band'
//       }
//     });
//   } catch (error) {
//     console.error('Device registration error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to register device'
//     });
//   }
// });

// // @route   GET /api/devices
// // @desc    Get user's devices
// // @access  Private
// router.get('/', authenticateToken, async (req, res) => {
//   try {
//     const userId = req.user.userId;

//     const [devices] = await promisePool.query(
//       `SELECT d.*, 
//        (SELECT COUNT(*) FROM vital_readings WHERE device_id = d.device_id) as total_readings,
//        (SELECT timestamp FROM vital_readings WHERE device_id = d.device_id ORDER BY reading_id DESC LIMIT 1) as last_reading
//        FROM devices d
//        WHERE d.user_id = ?
//        ORDER BY d.created_at DESC`,
//       [userId]
//     );

//     res.json({
//       success: true,
//       data: devices
//     });
//   } catch (error) {
//     console.error('Get devices error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch devices'
//     });
//   }
// });

// // @route   GET /api/devices/:deviceId
// // @desc    Get device details
// // @access  Private
// router.get('/:deviceId', authenticateToken, verifyDeviceOwnership, async (req, res) => {
//   try {
//     const { deviceId } = req.params;

//     const [devices] = await promisePool.query(
//       `SELECT d.*, 
//        (SELECT COUNT(*) FROM vital_readings WHERE device_id = d.device_id) as total_readings,
//        (SELECT timestamp FROM vital_readings WHERE device_id = d.device_id ORDER BY reading_id DESC LIMIT 1) as last_reading
//        FROM devices d
//        WHERE d.device_id = ?`,
//       [deviceId]
//     );

//     if (devices.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: 'Device not found'
//       });
//     }

//     // Get threshold settings
//     const [thresholds] = await promisePool.query(
//       'SELECT * FROM threshold_settings WHERE device_id = ?',
//       [deviceId]
//     );

//     res.json({
//       success: true,
//       data: {
//         device: devices[0],
//         thresholds: thresholds[0] || null
//       }
//     });
//   } catch (error) {
//     console.error('Get device details error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch device details'
//     });
//   }
// });

// // @route   PUT /api/devices/:deviceId
// // @desc    Update device info
// // @access  Private
// router.put('/:deviceId', authenticateToken, verifyDeviceOwnership, async (req, res) => {
//   try {
//     const { deviceId } = req.params;
//     const { deviceName } = req.body;

//     await promisePool.query(
//       'UPDATE devices SET device_name = ? WHERE device_id = ?',
//       [deviceName, deviceId]
//     );

//     res.json({
//       success: true,
//       message: 'Device updated successfully'
//     });
//   } catch (error) {
//     console.error('Update device error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to update device'
//     });
//   }
// });

// // @route   DELETE /api/devices/:deviceId
// // @desc    Remove device
// // @access  Private
// router.delete('/:deviceId', authenticateToken, verifyDeviceOwnership, async (req, res) => {
//   try {
//     const { deviceId } = req.params;

//     await promisePool.query(
//       'DELETE FROM devices WHERE device_id = ?',
//       [deviceId]
//     );

//     res.json({
//       success: true,
//       message: 'Device removed successfully'
//     });
//   } catch (error) {
//     console.error('Remove device error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to remove device'
//     });
//   }
// });

// // @route   PUT /api/devices/:deviceId/thresholds
// // @desc    Update alert thresholds
// // @access  Private
// router.put('/:deviceId/thresholds', authenticateToken, verifyDeviceOwnership, async (req, res) => {
//   try {
//     const { deviceId } = req.params;
//     const {
//       heartRateMin,
//       heartRateMax,
//       temperatureMin,
//       temperatureMax,
//       oxygenMin,
//       movementAlertEnabled
//     } = req.body;

//     await promisePool.query(
//       `UPDATE threshold_settings 
//        SET heart_rate_min = ?, heart_rate_max = ?, temperature_min = ?, 
//        temperature_max = ?, oxygen_min = ?, movement_alert_enabled = ?
//        WHERE device_id = ?`,
//       [heartRateMin, heartRateMax, temperatureMin, temperatureMax, oxygenMin, movementAlertEnabled, deviceId]
//     );

//     res.json({
//       success: true,
//       message: 'Thresholds updated successfully'
//     });
//   } catch (error) {
//     console.error('Update thresholds error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to update thresholds'
//     });
//   }
// });

// module.exports = router;

const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken, verifyDeviceOwnership } = require('../middleware/auth');

// @route   POST /api/devices/link
// @desc    Link a device to user by device_serial (allows multiple users per device)
// @access  Private
router.post('/link', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { device_serial } = req.body;

    if (!device_serial) {
      return res.status(400).json({
        success: false,
        message: 'Device serial is required',
      });
    }

    // Check if device exists in devices table
    const deviceResult = await pool.query(
      'SELECT * FROM devices WHERE device_serial = $1',
      [device_serial]
    );

    if (deviceResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Device not found. Please check the QR code and try again.',
      });
    }

    // Check if THIS user already has this device linked
    const existingResult = await pool.query(
      'SELECT user_id FROM users WHERE device_serial = $1 AND user_id = $2',
      [device_serial, userId]
    );

    if (existingResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You have already linked this device.',
      });
    }

    // REMOVED THE CHECK THAT PREVENTED MULTIPLE USERS
    // Now multiple users CAN link to the same device

    // Update user's device_serial
    await pool.query(
      'UPDATE users SET device_serial = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
      [device_serial, userId]
    );

    res.json({
      success: true,
      message: 'Device linked successfully',
      data: {
        device_serial: device_serial,
      },
    });
  } catch (error) {
    console.error('Link device error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to link device',
    });
  }
});

// @route   POST /api/devices/unlink
// @desc    Unlink device from user
// @access  Private
router.post('/unlink', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Set device_serial to NULL for this user
    await pool.query(
      'UPDATE users SET device_serial = NULL, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1',
      [userId]
    );

    res.json({
      success: true,
      message: 'Device unlinked successfully',
    });
  } catch (error) {
    console.error('Unlink device error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unlink device',
    });
  }
});

// @route   POST /api/devices/register
// @desc    Register a new device
// @access  Private
router.post('/register', authenticateToken, async (req, res) => {
  try {
    const { deviceSerial, deviceName } = req.body;
    const userId = req.user.userId;

    if (!deviceSerial) {
      return res.status(400).json({
        success: false,
        message: 'Device serial is required'
      });
    }

    // Check if device already exists
    const existingResult = await pool.query(
      'SELECT device_id FROM devices WHERE device_serial = $1',
      [deviceSerial]
    );

    if (existingResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Device already registered'
      });
    }

    // Register device
    const insertResult = await pool.query(
      'INSERT INTO devices (device_serial, user_id, device_name, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING device_id',
      [deviceSerial, userId, deviceName || 'LittleWatch Band']
    );

    res.status(201).json({
      success: true,
      message: 'Device registered successfully',
      data: {
        deviceId: insertResult.rows[0].device_id,
        deviceSerial,
        deviceName: deviceName || 'LittleWatch Band'
      }
    });
  } catch (error) {
    console.error('Device registration error', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register device'
    });
  }
});

// @route   GET /api/devices
// @desc    Get user's devices
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT d.*, 
       (SELECT COUNT(*) FROM vital_readings WHERE device_id = d.device_id) as total_readings,
       (SELECT timestamp FROM vital_readings WHERE device_id = d.device_id ORDER BY reading_id DESC LIMIT 1) as last_reading
       FROM devices d
       WHERE d.user_id = $1
       ORDER BY d.created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get devices error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch devices'
    });
  }
});

// @route   GET /api/devices/:deviceId
// @desc    Get device details
// @access  Private
router.get('/:deviceId', authenticateToken, verifyDeviceOwnership, async (req, res) => {
  try {
    const { deviceId } = req.params;

    const deviceResult = await pool.query(
      `SELECT d.*, 
       (SELECT COUNT(*) FROM vital_readings WHERE device_id = d.device_id) as total_readings,
       (SELECT timestamp FROM vital_readings WHERE device_id = d.device_id ORDER BY reading_id DESC LIMIT 1) as last_reading
       FROM devices d
       WHERE d.device_id = $1`,
      [deviceId]
    );

    if (deviceResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    // Get threshold settings
    const thresholdResult = await pool.query(
      'SELECT * FROM threshold_settings WHERE device_id = $1',
      [deviceId]
    );

    res.json({
      success: true,
      data: {
        device: deviceResult.rows[0],
        thresholds: thresholdResult.rows[0] || null
      }
    });
  } catch (error) {
    console.error('Get device details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch device details'
    });
  }
});

// @route   PUT /api/devices/:deviceId
// @desc    Update device info
// @access  Private
router.put('/:deviceId', authenticateToken, verifyDeviceOwnership, async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { deviceName } = req.body;

    await pool.query(
      'UPDATE devices SET device_name = $1, updated_at = CURRENT_TIMESTAMP WHERE device_id = $2',
      [deviceName, deviceId]
    );

    res.json({
      success: true,
      message: 'Device updated successfully'
    });
  } catch (error) {
    console.error('Update device error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update device'
    });
  }
});

// @route   DELETE /api/devices/:deviceId
// @desc    Remove device
// @access  Private
router.delete('/:deviceId', authenticateToken, verifyDeviceOwnership, async (req, res) => {
  try {
    const { deviceId } = req.params;

    await pool.query(
      'DELETE FROM devices WHERE device_id = $1',
      [deviceId]
    );

    res.json({
      success: true,
      message: 'Device removed successfully'
    });
  } catch (error) {
    console.error('Remove device error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove device'
    });
  }
});

// @route   PUT /api/devices/:deviceId/thresholds
// @desc    Update alert thresholds
// @access  Private
router.put('/:deviceId/thresholds', authenticateToken, verifyDeviceOwnership, async (req, res) => {
  try {
    const { deviceId } = req.params;
    const {
      heartRateMin,
      heartRateMax,
      temperatureMin,
      temperatureMax,
      oxygenMin,
      movementAlertEnabled
    } = req.body;

    await pool.query(
      `UPDATE threshold_settings 
       SET heart_rate_min = $1, heart_rate_max = $2, temperature_min = $3, 
       temperature_max = $4, oxygen_min = $5, alert_enabled = $6, updated_at = CURRENT_TIMESTAMP
       WHERE device_id = $7`,
      [heartRateMin, heartRateMax, temperatureMin, temperatureMax, oxygenMin, movementAlertEnabled, deviceId]
    );

    res.json({
      success: true,
      message: 'Thresholds updated successfully'
    });
  } catch (error) {
    console.error('Update thresholds error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update thresholds'
    });
  }
});

module.exports = router;