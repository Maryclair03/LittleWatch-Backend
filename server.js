const express = require('express');
const cors = require('cors'); 
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
const socketIo = require('socket.io');
const mysql = require('mysql2/promise');
require('dotenv').config();

// Database connection pool
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '', // Your XAMPP MySQL password (empty for default XAMPP)
  database: 'littlewatch_db', // Your database name
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Initialize app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Make io accessible in routes
app.set('io', io);

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*'
}));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes
const authRoutes = require('./routes/auth');
const vitalsRoutes = require('./routes/vitals');
const notificationsRoutes = require('./routes/notifications');
const devicesRoutes = require('./routes/devices');
const userRoutes = require('./routes/user');

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/vitals', vitalsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/devices', devicesRoutes);
app.use('/api/user', userRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

// Store active client connections
const activeClients = new Map(); // socketId -> { userId, deviceSerial }

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('📱 Client connected:', socket.id);

  // Register client with device serial for real-time vitals
  socket.on('register_device', async (data) => {
    const { userId, deviceSerial } = data;
    
    if (deviceSerial) {
      activeClients.set(socket.id, { userId, deviceSerial });
      socket.join(`device_${deviceSerial}`);
      console.log(`✅ Device registered: ${deviceSerial} for user: ${userId}`);
      
      // Send initial vitals data
      try {
        const vitals = await getLatestVitals(deviceSerial);
        socket.emit('vitals_update', {
          success: true,
          data: vitals
        });
      } catch (error) {
        console.error('Error fetching initial vitals:', error);
      }
    }
  });

  // Join user room for targeted notifications
  socket.on('join_user_room', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`👤 User ${userId} joined their room`);
  });

  // Leave room
  socket.on('leave_user_room', (userId) => {
    socket.leave(`user_${userId}`);
    console.log(`👋 User ${userId} left their room`);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const clientData = activeClients.get(socket.id);
    if (clientData) {
      console.log(`📱 Client disconnected: ${socket.id} (Device: ${clientData.deviceSerial})`);
      activeClients.delete(socket.id);
    } else {
      console.log('📱 Client disconnected:', socket.id);
    }
  });
});

// Function to get latest vitals from database
async function getLatestVitals(deviceSerial) {
  try {
    const [rows] = await pool.query(
      `SELECT 
        vr.reading_id,
        vr.heart_rate,
        vr.temperature,
        vr.oxygen_saturation,
        vr.movement_status,
        vr.movement_intensity,
        vr.is_alert,
        vr.timestamp,
        d.battery_level,
        d.is_connected,
        d.device_name,
        d.firmware_version
       FROM vital_readings vr
       JOIN devices d ON vr.device_id = d.device_id
       WHERE d.device_serial = ? 
       ORDER BY vr.timestamp DESC 
       LIMIT 1`,
      [deviceSerial]
    );
    
    if (rows.length > 0) {
      return {
        vitals: {
          reading_id: rows[0].reading_id,
          heart_rate: rows[0].heart_rate,
          temperature: rows[0].temperature,
          oxygen_saturation: rows[0].oxygen_saturation,
          movement_status: rows[0].movement_status,
          movement_intensity: rows[0].movement_intensity,
          is_alert: rows[0].is_alert,
          timestamp: rows[0].timestamp
        },
        device: {
          battery_level: rows[0].battery_level,
          is_connected: rows[0].is_connected,
          device_name: rows[0].device_name,
          firmware_version: rows[0].firmware_version
        }
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching vitals:', error);
    console.error('Device Serial:', deviceSerial);
    return null;
  }
}

// Broadcast vitals updates to connected clients (poll database every 2 seconds)
const broadcastInterval = setInterval(async () => {
  try {
    const deviceSerials = new Set();
    
    // Get unique device serials from connected clients
    for (const [socketId, clientData] of activeClients.entries()) {
      if (clientData.deviceSerial) {
        deviceSerials.add(clientData.deviceSerial);
      }
    }
    
    // Only query if there are connected clients
    if (deviceSerials.size === 0) {
      return;
    }
    
    // Fetch and broadcast vitals for each device
    for (const deviceSerial of deviceSerials) {
      const vitals = await getLatestVitals(deviceSerial);
      
      if (vitals) {
        // Emit to all clients watching this device
        io.to(`device_${deviceSerial}`).emit('vitals_update', {
          success: true,
          data: vitals
        });
      }
    }
  } catch (error) {
    console.error('Error broadcasting vitals:', error);
  }
}, 2000); // Check every 2 seconds

// Function to emit vitals update (can be called from routes when new data is inserted)
function emitVitalsUpdate(deviceSerial, vitalsData) {
  io.to(`device_${deviceSerial}`).emit('vitals_update', {
    success: true,
    data: vitalsData
  });
}

// Function to emit notification to user
function emitNotification(userId, notification) {
  io.to(`user_${userId}`).emit('new_notification', notification);
}

// Export emit functions for use in routes
app.set('emitVitalsUpdate', emitVitalsUpdate);
app.set('emitNotification', emitNotification);

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log('=================================');
  console.log(`🚀 LittleWatch Backend Server`);
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔌 Socket.IO enabled for real-time updates`);
  console.log('=================================');
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  clearInterval(broadcastInterval);
  server.close(() => {
    console.log('Server closed');
    pool.end();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received. Shutting down gracefully...');
  clearInterval(broadcastInterval);
  server.close(() => {
    console.log('Server closed');
    pool.end();
    process.exit(0);
  });
});

module.exports = { app, io, emitVitalsUpdate, emitNotification };