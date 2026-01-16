// const jwt = require('jsonwebtoken');

// // Middleware to verify JWT token
// const authenticateToken = (req, res, next) => {
//   const authHeader = req.headers['authorization'];
//   const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

//   if (!token) {
//     return res.status(401).json({
//       success: false,
//       message: 'Access token required'
//     });
//   }

//   jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
//     if (err) {
//       return res.status(403).json({
//         success: false,
//         message: 'Invalid or expired token'
//       });
//     }
    
//     req.user = user;
//     next();
//   });
// };

// // Middleware to check device ownership
// const verifyDeviceOwnership = async (req, res, next) => {
//   try {
//     const { promisePool } = require('../config/database');
//     const deviceId = req.params.deviceId || req.body.deviceId;
//     const userId = req.user.userId;

//     const [devices] = await promisePool.query(
//       'SELECT user_id FROM devices WHERE device_id = ?',
//       [deviceId]
//     );

//     if (devices.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: 'Device not found'
//       });
//     }

//     if (devices[0].user_id !== userId) {
//       return res.status(403).json({
//         success: false,
//         message: 'Unauthorized access to device'
//       });
//     }

//     next();
//   } catch (error) {
//     console.error('Device ownership verification error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Server error'
//     });
//   }
// };

// module.exports = { authenticateToken, verifyDeviceOwnership };

const jwt = require('jsonwebtoken');

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
    
    req.user = user;
    next();
  });
};

// Middleware to check device ownership - UPDATED FOR POSTGRESQL
const verifyDeviceOwnership = async (req, res, next) => {
  try {
    const { pool } = require('../config/database');
    const deviceId = req.params.deviceId || req.body.deviceId;
    const userId = req.user.userId;

    const result = await pool.query(
      'SELECT user_id FROM devices WHERE device_id = $1',
      [deviceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    if (result.rows[0].user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to device'
      });
    }

    next();
  } catch (error) {
    console.error('Device ownership verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = { authenticateToken, verifyDeviceOwnership };