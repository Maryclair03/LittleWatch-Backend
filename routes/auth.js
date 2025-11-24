const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { promisePool } = require('../config/database');
const { body, validationResult } = require('express-validator');

// Generate JWT token
const generateToken = (userId, email) => {
  return jwt.sign(
    { userId, email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

// @route   POST /api/auth/signup
// @desc    Register new user
// @access  Public
router.post('/signup', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phoneNumber').optional().trim(),
  body('countryCode').optional().trim(),
  body('dateOfBirth').optional().isISO8601().withMessage('Invalid date format'),
  body('gender').optional().isIn(['Male', 'Female', 'Other']),
  body('country').optional().trim(),
  body('address').optional().trim()
], async (req, res) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
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

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert new user
    const [result] = await promisePool.query(
      `INSERT INTO users (name, email, password_hash, phone_number, country_code, 
       date_of_birth, gender, country, address) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, email, passwordHash, phoneNumber, countryCode, dateOfBirth, gender, country, address]
    );

    const userId = result.insertId;

    // Log activity
    await promisePool.query(
      'INSERT INTO activity_log (user_id, action, details) VALUES (?, ?, ?)',
      [userId, 'USER_REGISTERED', `New user registered: ${email}`]
    );

    // Generate token
    const token = generateToken(userId, email);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        userId,
        name,
        email,
        token
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user
    const [users] = await promisePool.query(
      'SELECT user_id, name, email, password_hash, is_active FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const user = users[0];

    // Check if account is active
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    await promisePool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = ?',
      [user.user_id]
    );

    // Log activity
    await promisePool.query(
      'INSERT INTO activity_log (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)',
      [user.user_id, 'USER_LOGIN', `User logged in: ${email}`, req.ip]
    );

    // Generate token
    const token = generateToken(user.user_id, user.email);

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
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

module.exports = router;
