-- LittleWatch Database Schema
-- Created for infant vital signs monitoring system

-- Create database
CREATE DATABASE IF NOT EXISTS littlewatch_db;
USE littlewatch_db;

-- Users table (Parents/Guardians)
CREATE TABLE users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    country_code VARCHAR(10) DEFAULT '+63',
    date_of_birth DATE,
    gender ENUM('Male', 'Female', 'Other'),
    country VARCHAR(100),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    INDEX idx_email (email)
);

-- Device table (LittleWatch bands)
CREATE TABLE devices (
    device_id INT PRIMARY KEY AUTO_INCREMENT,
    device_serial VARCHAR(50) UNIQUE NOT NULL,
    user_id INT NOT NULL,
    device_name VARCHAR(100) DEFAULT 'LittleWatch Band',
    firmware_version VARCHAR(20),
    is_connected BOOLEAN DEFAULT FALSE,
    battery_level INT DEFAULT 100,
    last_sync TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_device (user_id, device_serial)
);

-- Vital signs readings table (real-time and historical data)
CREATE TABLE vital_readings (
    reading_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    device_id INT NOT NULL,
    heart_rate INT,
    temperature DECIMAL(4,2),
    oxygen_saturation INT,
    movement_status VARCHAR(50),
    movement_intensity DECIMAL(5,2),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_alert BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE,
    INDEX idx_device_time (device_id, timestamp),
    INDEX idx_alerts (device_id, is_alert, timestamp)
);

-- Notifications/Alerts table
CREATE TABLE notifications (
    notification_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    device_id INT NOT NULL,
    type ENUM('warning', 'critical', 'info') NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    icon VARCHAR(50),
    color VARCHAR(20),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE,
    INDEX idx_user_notifications (user_id, is_read, created_at)
);

-- Sleep patterns table
CREATE TABLE sleep_sessions (
    session_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    device_id INT NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NULL,
    duration_minutes INT,
    avg_heart_rate INT,
    avg_temperature DECIMAL(4,2),
    avg_oxygen INT,
    movement_count INT DEFAULT 0,
    quality_score INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE,
    INDEX idx_device_sleep (device_id, start_time)
);

-- Threshold settings table (customizable alert thresholds)
CREATE TABLE threshold_settings (
    setting_id INT PRIMARY KEY AUTO_INCREMENT,
    device_id INT NOT NULL,
    heart_rate_min INT DEFAULT 80,
    heart_rate_max INT DEFAULT 140,
    temperature_min DECIMAL(4,2) DEFAULT 36.0,
    temperature_max DECIMAL(4,2) DEFAULT 37.8,
    oxygen_min INT DEFAULT 90,
    movement_alert_enabled BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE,
    UNIQUE KEY unique_device_settings (device_id)
);

-- Activity log table
CREATE TABLE activity_log (
    log_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    action VARCHAR(100) NOT NULL,
    details TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_activity (user_id, created_at)
);

-- Create views for easier data retrieval

-- Latest vital readings view
CREATE VIEW latest_vitals AS
SELECT 
    d.device_id,
    d.device_serial,
    d.user_id,
    vr.heart_rate,
    vr.temperature,
    vr.oxygen_saturation,
    vr.movement_status,
    vr.timestamp,
    vr.is_alert
FROM devices d
INNER JOIN (
    SELECT device_id, MAX(reading_id) as latest_reading
    FROM vital_readings
    GROUP BY device_id
) latest ON d.device_id = latest.device_id
INNER JOIN vital_readings vr ON vr.reading_id = latest.latest_reading;

-- Daily averages view
CREATE VIEW daily_vital_averages AS
SELECT 
    device_id,
    DATE(timestamp) as date,
    AVG(heart_rate) as avg_heart_rate,
    AVG(temperature) as avg_temperature,
    AVG(oxygen_saturation) as avg_oxygen,
    MIN(heart_rate) as min_heart_rate,
    MAX(heart_rate) as max_heart_rate,
    COUNT(*) as reading_count
FROM vital_readings
WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY device_id, DATE(timestamp);

-- Unread notifications count view
CREATE VIEW unread_notification_counts AS
SELECT 
    user_id,
    COUNT(*) as unread_count
FROM notifications
WHERE is_read = FALSE
GROUP BY user_id;

-- Insert default threshold settings trigger
DELIMITER //
CREATE TRIGGER after_device_insert
AFTER INSERT ON devices
FOR EACH ROW
BEGIN
    INSERT INTO threshold_settings (device_id)
    VALUES (NEW.device_id);
END//
DELIMITER ;
