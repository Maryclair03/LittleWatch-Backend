/*
 * LittleWatch - Test Data Seeder
 * Run this to populate database with sample data for testing
 */

const { promisePool } = require('./config/database');
const bcrypt = require('bcryptjs');

async function seedDatabase() {
  console.log('🌱 Seeding database with test data...\n');

  try {
    // 1. Create test user
    console.log('Creating test user...');
    const passwordHash = await bcrypt.hash('test123', 10);
    
    const [userResult] = await promisePool.query(
      `INSERT INTO users (name, email, password_hash, phone_number, country_code, gender, country) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['Test Parent', 'test@example.com', passwordHash, '9123456789', '+63', 'Female', 'Philippines']
    );
    
    const userId = userResult.insertId;
    console.log(`✅ User created (ID: ${userId})`);

    // 2. Create test device
    console.log('Creating test device...');
    const [deviceResult] = await promisePool.query(
      `INSERT INTO devices (device_serial, user_id, device_name, battery_level, is_connected) 
       VALUES (?, ?, ?, ?, ?)`,
      ['LITTLEWATCH_TEST_001', userId, 'Test Baby Watch', 85, true]
    );
    
    const deviceId = deviceResult.insertId;
    console.log(`✅ Device created (ID: ${deviceId})`);

    // 3. Insert sample vital readings
    console.log('Creating sample vital readings...');
    const now = new Date();
    const readings = [];
    
    for (let i = 0; i < 24; i++) {
      const timestamp = new Date(now - (i * 60 * 60 * 1000)); // Every hour for 24 hours
      readings.push([
        deviceId,
        90 + Math.floor(Math.random() * 40), // Heart rate 90-130
        (36.0 + Math.random() * 1.5).toFixed(2), // Temperature 36.0-37.5
        95 + Math.floor(Math.random() * 5), // SpO2 95-100
        ['Sleep', 'Resting', 'Normal', 'Active'][Math.floor(Math.random() * 4)],
        (Math.random() * 0.5).toFixed(2), // Movement intensity
        false,
        timestamp
      ]);
    }

    await promisePool.query(
      `INSERT INTO vital_readings 
       (device_id, heart_rate, temperature, oxygen_saturation, movement_status, movement_intensity, is_alert, timestamp) 
       VALUES ?`,
      [readings]
    );
    
    console.log(`✅ Created ${readings.length} sample vital readings`);

    // 4. Create sample notifications
    console.log('Creating sample notifications...');
    const notifications = [
      [userId, deviceId, 'warning', 'Temperature Alert', 'Baby temperature is slightly elevated (37.6°C)', 'thermometer', '#FF9800', false],
      [userId, deviceId, 'info', 'Device Connected', 'LittleWatch Band successfully connected', 'checkmark-circle', '#4CAF50', true],
      [userId, deviceId, 'critical', 'Low Oxygen Level', 'Oxygen saturation dropped to 92%', 'water', '#FF5252', true],
    ];

    await promisePool.query(
      `INSERT INTO notifications (user_id, device_id, type, title, message, icon, color, is_read) 
       VALUES ?`,
      [notifications]
    );
    
    console.log(`✅ Created ${notifications.length} sample notifications`);

    // 5. Create sleep session
    console.log('Creating sample sleep session...');
    const sleepStart = new Date(now - (8 * 60 * 60 * 1000)); // 8 hours ago
    await promisePool.query(
      `INSERT INTO sleep_sessions 
       (device_id, start_time, end_time, duration_minutes, avg_heart_rate, avg_temperature, avg_oxygen, movement_count, quality_score) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [deviceId, sleepStart, now, 480, 105, 36.5, 97, 12, 85]
    );
    
    console.log('✅ Created sample sleep session');

    // 6. Log activity
    await promisePool.query(
      'INSERT INTO activity_log (user_id, action, details) VALUES (?, ?, ?)',
      [userId, 'DATABASE_SEEDED', 'Test data seeded successfully']
    );

    console.log('\n✅ Database seeding completed successfully!');
    console.log('\n📝 Test Credentials:');
    console.log('   Email: test@example.com');
    console.log('   Password: test123');
    console.log('   Device Serial: LITTLEWATCH_TEST_001\n');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    process.exit();
  }
}

// Run seeder
seedDatabase();
