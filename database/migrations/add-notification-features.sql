-- Migration: Add Notification Throttling and Settings Features
-- Date: 2025-12-17
-- Description: Adds notification interval tracking, throttling, and user preferences

-- Add new columns to notifications table
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS is_silent BOOLEAN DEFAULT FALSE AFTER is_read,
ADD COLUMN IF NOT EXISTS priority INT DEFAULT 1 AFTER is_silent,
ADD COLUMN IF NOT EXISTS dismissed_at TIMESTAMP NULL AFTER priority;

-- Add index for notification throttling queries
ALTER TABLE notifications
ADD INDEX IF NOT EXISTS idx_notification_throttle (user_id, device_id, type, created_at);

-- Create notification settings table
CREATE TABLE IF NOT EXISTS notification_settings (
    setting_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    notification_interval_minutes INT DEFAULT 5,
    enable_push_notifications BOOLEAN DEFAULT TRUE,
    enable_critical_alerts BOOLEAN DEFAULT TRUE,
    enable_warning_alerts BOOLEAN DEFAULT TRUE,
    enable_info_alerts BOOLEAN DEFAULT TRUE,
    quiet_hours_enabled BOOLEAN DEFAULT FALSE,
    quiet_hours_start TIME DEFAULT '22:00:00',
    quiet_hours_end TIME DEFAULT '08:00:00',
    group_notifications BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_settings (user_id)
);

-- Insert default notification settings for existing users
INSERT INTO notification_settings (user_id)
SELECT user_id FROM users 
WHERE user_id NOT IN (SELECT user_id FROM notification_settings);

-- Create trigger for new user insertions (if not exists)
DROP TRIGGER IF EXISTS after_user_insert;

DELIMITER //
CREATE TRIGGER after_user_insert
AFTER INSERT ON users
FOR EACH ROW
BEGIN
    INSERT INTO notification_settings (user_id)
    VALUES (NEW.user_id);
END//
DELIMITER ;

-- Update existing notifications with default priority based on type
UPDATE notifications 
SET priority = CASE 
    WHEN type = 'critical' THEN 3
    WHEN type = 'warning' THEN 2
    WHEN type = 'info' THEN 1
    ELSE 1
END
WHERE priority IS NULL OR priority = 0;
