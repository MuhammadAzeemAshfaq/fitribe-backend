const notificationService = require('../../services/public/notificationService');

/**
 * Notification Controller
 * Thin controller — delegates all logic to notificationService
 */

// ==================== SAVE DEVICE TOKEN ====================
exports.saveDeviceToken = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { token, platform } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'token is required'
      });
    }

    await notificationService.saveDeviceToken(userId, token, platform || 'mobile');

    res.status(200).json({
      success: true,
      message: 'Device token saved'
    });

  } catch (error) {
    console.error('Error saving device token:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== GET USER NOTIFICATIONS ====================
exports.getUserNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    const requesterId = req.user.uid;
    const limit = Math.min(parseInt(req.query.limit) || 30, 50);

    if (userId !== requesterId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const [notifications, unreadCount] = await Promise.all([
      notificationService.getUserNotifications(userId, limit),
      notificationService.getUnreadCount(userId)
    ]);

    res.status(200).json({
      success: true,
      unreadCount,
      count: notifications.length,
      notifications
    });

  } catch (error) {
    console.error('Error getting notifications:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== MARK ONE AS READ ====================
exports.markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.uid;

    await notificationService.markAsRead(notificationId, userId);

    res.status(200).json({
      success: true,
      message: 'Notification marked as read'
    });

  } catch (error) {
    console.error('Error marking notification as read:', error);
    const status = error.message.includes('not found') ? 404
      : error.message.includes('Access denied') ? 403
      : 500;
    res.status(status).json({ success: false, error: error.message });
  }
};

// ==================== MARK ALL AS READ ====================
exports.markAllAsRead = async (req, res) => {
  try {
    const { userId } = req.params;
    const requesterId = req.user.uid;

    if (userId !== requesterId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const updatedCount = await notificationService.markAllAsRead(userId);

    res.status(200).json({
      success: true,
      message: `${updatedCount} notifications marked as read`,
      updatedCount
    });

  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== GET UNREAD COUNT ====================
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.uid;

    const count = await notificationService.getUnreadCount(userId);

    res.status(200).json({
      success: true,
      unreadCount: count
    });

  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
