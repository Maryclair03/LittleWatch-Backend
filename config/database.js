// const mysql = require('mysql2');
// require('dotenv').config();

// // Create connection pool for better performance
// const pool = mysql.createPool({
//   host: process.env.DB_HOST || 'localhost',
//   user: process.env.DB_USER || 'root',
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_NAME || 'littlewatch_db',
//   port: process.env.DB_PORT || 3306,
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0,
//   enableKeepAlive: true,
//   keepAliveInitialDelay: 0
// });

// // Get promise-based pool
// const promisePool = pool.promise();

// // Test database connection
// pool.getConnection((err, connection) => {
//   if (err) {
//     console.error('❌ Database connection failed:', err.message);
//     return;
//   }
//   console.log('✅ Database connected successfully');
//   connection.release();
// });

// // Handle pool errors
// pool.on('error', (err) => {
//   console.error('❌ Database pool error:', err);
// });

// module.exports = { pool, promisePool };
const { Pool } = require('pg');
require('dotenv').config();

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test database connection with timezone setup
pool.connect(async (err, client, release) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    return;
  }
  
  try {
    // Set the timezone for Philippines
    const timezone = process.env.DB_TIMEZONE || 'Asia/Manila';
    await client.query(`SET TIME ZONE '${timezone}'`);
    console.log('✅ PostgreSQL Database connected successfully');
    console.log('⏰ Database timezone set to:', timezone, '(Philippines)');
  } catch (timezoneErr) {
    console.error('❌ Failed to set timezone:', timezoneErr.message);
  } finally {
    release();
  }
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('❌ Database pool error:', err);
});

// Set timezone for all new connections
pool.on('connect', async (client) => {
  try {
    const timezone = process.env.DB_TIMEZONE || 'Asia/Manila';
    await client.query(`SET TIME ZONE '${timezone}'`);
  } catch (err) {
    console.error('❌ Failed to set timezone for new connection:', err.message);
  }
});

module.exports = { pool };