const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { promisePool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET

// @route   POST /api/user/signup
// @desc    Register a new user
// @access  Public
router.post('/signup', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phoneNumber').optional().trim(),
  body('countryCode').optional().trim(),
  body('dateOfBirth').optional().isISO8601().withMessage('Invalid date format'),
  body('gender').optional().isIn(['Male', 'Female', 'Other']).withMessage('Invalid gender'),
  body('country').optional().trim(),
  body('address').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { 
      name, 
      email, 
      password, 
      phoneNumber, 
      countryCode, 
      dateOfBirth, 
      gender, 
      country, 
      address 
    } = req.body;

    // Check if user already exists
    const [existingUsers] = await promisePool.query(
      'SELECT user_id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email already registered' 
      });
    }

    // Store plain text password (NO BCRYPT - FOR TESTING ONLY)
    const [result] = await promisePool.query(
      `INSERT INTO users (name, email, password_hash, phone_number, country_code, date_of_birth, gender, country, address, is_active) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [name, email, password, phoneNumber || null, countryCode || '+63', dateOfBirth || null, gender || null, country || null, address || null]
    );

    // Generate JWT token with 30 days expiration
    const token = jwt.sign(
      { userId: result.insertId, email: email },
      JWT_SECRET,
      { expiresIn: '30d' } // Changed from '1h' to '30d'
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        userId: result.insertId,
        name: name,
        email: email,
        token
      }
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;

    // Fetch user by email
    const [users] = await promisePool.query(
      'SELECT user_id, email, password_hash, name FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const user = users[0];

    // Plain text comparison (NO BCRYPT - FOR TESTING ONLY)
    if (password !== user.password_hash) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Generate JWT token with 30 days expiration
    const token = jwt.sign(
      { userId: user.user_id, email: user.email },
      JWT_SECRET,
      { expiresIn: '30d' } // Changed from '1h' to '30d'
    );

    // Update last login
    await promisePool.query(
      'UPDATE users SET last_login = NOW() WHERE user_id = ?',
      [user.user_id]
    );

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        userId: user.user_id,
        name: user.name,
        email: user.email,
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/user/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const [users] = await promisePool.query(
      `SELECT user_id, name, email, phone_number, country_code, date_of_birth, 
       gender, country, address, device_serial, created_at, last_login 
       FROM users WHERE user_id = ?`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: users[0]
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
});

// @route   PUT /api/user/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', authenticateToken, [
  body('name').optional().trim().notEmpty(),
  body('phoneNumber').optional().trim(),
  body('countryCode').optional().trim(),
  body('dateOfBirth').optional().isISO8601(),
  body('gender').optional().isIn(['Male', 'Female', 'Other']),
  body('country').optional().trim(),
  body('address').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const userId = req.user.userId;
    const {
      name,
      phoneNumber,
      countryCode,
      dateOfBirth,
      gender,
      country,
      address
    } = req.body;

    await promisePool.query(
      `UPDATE users 
       SET name = COALESCE(?, name), 
       phone_number = COALESCE(?, phone_number),
       country_code = COALESCE(?, country_code),
       date_of_birth = COALESCE(?, date_of_birth),
       gender = COALESCE(?, gender),
       country = COALESCE(?, country),
       address = COALESCE(?, address)
       WHERE user_id = ?`,
      [name, phoneNumber, countryCode, dateOfBirth, gender, country, address, userId]
    );

    res.json({
      success: true,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

// @route   PUT /api/user/change-password
// @desc    Change user password
// @access  Private
router.put('/change-password', authenticateToken, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    console.log(`🔐 Changing password for user ${userId}`);

    // Get current password hash
    const [users] = await promisePool.query(
      'SELECT password_hash FROM users WHERE user_id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Plain text comparison (NO BCRYPT - FOR TESTING ONLY)
    if (currentPassword !== users[0].password_hash) {
      console.log('❌ Current password incorrect');
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    console.log('✅ Current password verified');

    // Store new password as plain text (NO BCRYPT - FOR TESTING ONLY)
    await promisePool.query(
      'UPDATE users SET password_hash = ? WHERE user_id = ?',
      [newPassword, userId]
    );

    console.log('✅ Password updated successfully');

    // Log activity (optional - only if activity_log table exists)
    try {
      await promisePool.query(
        'INSERT INTO activity_log (user_id, action, details) VALUES (?, ?, ?)',
        [userId, 'PASSWORD_CHANGED', 'User changed password']
      );
    } catch (logError) {
      console.log('⚠️ Activity log not available:', logError.message);
    }

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password'
    });
  }
});

// @route   GET /api/user/activity
// @desc    Get user activity log
// @access  Private
router.get('/activity', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { limit = 50 } = req.query;

    const [activities] = await promisePool.query(
      `SELECT action, details, ip_address, created_at 
       FROM activity_log 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT ?`,
      [userId, parseInt(limit)]
    );

    res.json({
      success: true,
      data: activities
    });
  } catch (error) {
    console.error('Get activity log error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity log'
    });
  }
});

// @route   POST /api/user/logout
// @desc    Logout user
// @access  Private
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Log the logout activity
    await promisePool.query(
      'INSERT INTO activity_log (user_id, action, details) VALUES (?, ?, ?)',
      [userId, 'LOGOUT', 'User logged out']
    );

    // Note: JWT is stateless, so client must remove token from storage
    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to logout'
    });
  }
});

// @route   PUT /api/user/fcm-token
// @desc    Update user's FCM token
// @access  Private
router.put('/fcm-token', authenticateToken, [
  body('fcmToken').notEmpty().withMessage('FCM token is required')
], async (req, res) => {
  console.log('🔥 FCM TOKEN ENDPOINT HIT!');
  console.log('Body:', req.body);
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const userId = req.user.userId;
    const { fcmToken } = req.body;

    console.log(`📝 Updating FCM token for user ${userId}`);
    console.log(`🔑 Token: ${fcmToken}`);

    // Update FCM token in database
    const [result] = await promisePool.query(
      'UPDATE users SET fcmToken = ? WHERE user_id = ?',
      [fcmToken, userId]
    );

    console.log(`✅ Database update result:`, result);
    console.log(`✅ Rows affected: ${result.affectedRows}`);

    if (result.affectedRows === 0) {
      console.log('⚠️ No rows updated - user might not exist');
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log(`✅ FCM token updated successfully for user ${userId}`);

    res.json({
      success: true,
      message: 'FCM token updated successfully'
    });
  } catch (error) {
    console.error('❌ Update FCM token error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update FCM token',
      error: error.message
    });
  }
});

module.exports = router;