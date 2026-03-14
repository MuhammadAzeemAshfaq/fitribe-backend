const express = require('express');
const router = express.Router();
const socialController = require('../../controllers/public/socialController');
const { verifyToken, rateLimit } = require('../../middleware/auth');
const { sanitizeInput } = require('../../middleware/validation');

/**
 * Social Feed Routes
 * All routes require authentication
 */

router.use(verifyToken);
router.use(sanitizeInput);

// ==================== GET USER'S OWN FEED ====================
// GET /api/feed/:userId
router.get('/:userId', socialController.getUserFeed);

// ==================== GET FRIENDS' FEED ====================
// GET /api/feed/friends/:userId
router.get('/friends/:userId', socialController.getFriendsFeed);

// ==================== GET FOLLOWING LIST ====================
// GET /api/feed/following/:userId
router.get('/following/:userId', socialController.getFollowing);

// ==================== FOLLOW USER ====================
// POST /api/feed/follow
router.post(
  '/follow',
  rateLimit({ maxRequests: 30, windowMs: 60 * 60 * 1000 }),
  socialController.followUser
);

// ==================== UNFOLLOW USER ====================
// DELETE /api/feed/follow/:targetId
router.delete('/follow/:targetId', socialController.unfollowUser);

module.exports = router;
