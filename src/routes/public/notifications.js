const express = require('express');
const router = express.Router();
const notificationController = require('../../controllers/public/notificationController');
const { verifyToken, rateLimit } = require('../../middleware/auth');
const { sanitizeInput } = require('../../middleware/validation');

/**
 * Notification Routes
 * All routes require authentication
 */

router.use(verifyToken);
router.use(sanitizeInput);

// ==================== SAVE DEVICE TOKEN ====================
// POST /api/notifications/token
// Flutter calls this on login to register the device for push notifications
router.post(
  '/token',
  rateLimit({ maxRequests: 10, windowMs: 60 * 60 * 1000 }),
  notificationController.saveDeviceToken
);

// ==================== GET UNREAD COUNT ====================
// GET /api/notifications/unread-count
// Lightweight endpoint for notification badge in Flutter app
router.get('/unread-count', notificationController.getUnreadCount);

// ==================== GET USER NOTIFICATIONS ====================
// GET /api/notifications/:userId
router.get('/:userId', notificationController.getUserNotifications);

// ==================== MARK ALL AS READ ====================
// PUT /api/notifications/:userId/read-all
router.put('/:userId/read-all', notificationController.markAllAsRead);

// ==================== MARK ONE AS READ ====================
// PUT /api/notifications/:notificationId/read
router.put('/:notificationId/read', notificationController.markAsRead);

module.exports = router;
