const express = require('express');
const router = express.Router();
const { promisePool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// @route   GET /api/notifications
// @desc    Get user notifications
// @access  Private
// @route   GET /api/notifications
// @desc    Get user notifications with pagination
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { limit = 20, offset = 0, unreadOnly = false } = req.query;

    console.log(`📡 Fetching notifications for user ${userId} - limit: ${limit}, offset: ${offset}`);

    let query = `
      SELECT 
        n.notification_id as id,
        n.type,
        n.title,
        n.message,
        n.icon,
        n.color,
        n.is_read,
        n.created_at,
        d.device_name,
        CASE 
          WHEN TIMESTAMPDIFF(MINUTE, n.created_at, NOW()) < 1 THEN 'Just now'
          WHEN TIMESTAMPDIFF(MINUTE, n.created_at, NOW()) < 60 THEN CONCAT(TIMESTAMPDIFF(MINUTE, n.created_at, NOW()), ' minute', IF(TIMESTAMPDIFF(MINUTE, n.created_at, NOW()) > 1, 's', ''), ' ago')
          WHEN TIMESTAMPDIFF(HOUR, n.created_at, NOW()) < 24 THEN CONCAT(TIMESTAMPDIFF(HOUR, n.created_at, NOW()), ' hour', IF(TIMESTAMPDIFF(HOUR, n.created_at, NOW()) > 1, 's', ''), ' ago')
          WHEN TIMESTAMPDIFF(DAY, n.created_at, NOW()) < 7 THEN CONCAT(TIMESTAMPDIFF(DAY, n.created_at, NOW()), ' day', IF(TIMESTAMPDIFF(DAY, n.created_at, NOW()) > 1, 's', ''), ' ago')
          ELSE DATE_FORMAT(n.created_at, '%M %d, %Y')
        END as time
      FROM notifications n
      LEFT JOIN devices d ON n.device_id = d.device_id
      WHERE n.user_id = ?
    `;

    if (unreadOnly === 'true') {
      query += ' AND n.is_read = 0';
    }

    query += ' ORDER BY n.created_at DESC LIMIT ? OFFSET ?';

    const [notifications] = await promisePool.query(
      query, 
      [userId, parseInt(limit), parseInt(offset)]
    );

    console.log(`📊 Found ${notifications.length} notifications`);

    // Convert is_read from 0/1 to boolean
    const formattedNotifications = notifications.map(notif => ({
      ...notif,
      read: Boolean(notif.is_read)
    }));

    // Get unread count
    const [countResult] = await promisePool.query(
      'SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = ? AND is_read = 0',
      [userId]
    );

    console.log(`📬 Unread count: ${countResult[0].unread_count}`);

    res.json({
      success: true,
      data: formattedNotifications,
      unreadCount: countResult[0].unread_count,
      hasMore: formattedNotifications.length === parseInt(limit)
    });
  } catch (error) {
    console.error('❌ Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications'
    });
  }
});

// @route   PUT /api/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user.userId;

    console.log(`📝 Marking notification ${notificationId} as read for user ${userId}`);

    // Verify ownership
    const [notifications] = await promisePool.query(
      'SELECT user_id FROM notifications WHERE notification_id = ?',
      [notificationId]
    );

    if (notifications.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    if (notifications[0].user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    // Mark as read
    await promisePool.query(
      'UPDATE notifications SET is_read = 1 WHERE notification_id = ?',
      [notificationId]
    );

    console.log(`✅ Notification ${notificationId} marked as read`);

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('❌ Mark notification as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notification'
    });
  }
});

// @route   PUT /api/notifications/read-all
// @desc    Mark all notifications as read
// @access  Private
router.put('/read-all', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    console.log(`📝 Marking all notifications as read for user ${userId}`);

    const [result] = await promisePool.query(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0',
      [userId]
    );

    console.log(`✅ Marked ${result.affectedRows} notifications as read`);

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('❌ Mark all notifications as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notifications'
    });
  }
});

// @route   DELETE /api/notifications/clear-all
// @desc    Clear all notifications
// @access  Private
router.delete('/clear-all', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    console.log(`🗑️ Clearing all notifications for user ${userId}`);

    const [result] = await promisePool.query(
      'DELETE FROM notifications WHERE user_id = ?',
      [userId]
    );

    console.log(`✅ Deleted ${result.affectedRows} notifications`);

    res.json({
      success: true,
      message: 'All notifications cleared'
    });
  } catch (error) {
    console.error('❌ Clear notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear notifications'
    });
  }
});

// @route   GET /api/notifications/unread-count
// @desc    Get unread notification count
// @access  Private
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const [result] = await promisePool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
      [userId]
    );

    res.json({
      success: true,
      count: result[0].count
    });
  } catch (error) {
    console.error('❌ Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get unread count'
    });
  }
});

module.exports = router;