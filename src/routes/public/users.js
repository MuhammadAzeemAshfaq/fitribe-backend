const express = require('express');
const router = express.Router();
const userController = require('../../controllers/public/userController');
const { verifyToken, verifyOwnership, optionalAuth, rateLimit } = require('../../middleware/auth');
const { validateIdParam, validatePagination, sanitizeInput } = require('../../middleware/validation');

router.use(sanitizeInput);

// ==================== REGISTRATION ====================

// Register new user in Firestore after Firebase Auth signup (PROTECTED)
// Called once by Flutter right after Firebase Auth creates the account
router.post(
  '/register',
  verifyToken,
  rateLimit({ maxRequests: 5, windowMs: 60 * 60 * 1000 }),
  userController.registerUser
);

// ==================== PROFILE ====================

// Get any user's public profile (PUBLIC)
router.get(
  '/:userId/profile',
  optionalAuth,
  validateIdParam('userId'),
  userController.getUserProfile
);

// Update own profile (PROTECTED - only own profile)
router.patch(
  '/:userId/profile',
  verifyToken,
  verifyOwnership,
  validateIdParam('userId'),
  userController.updateUserProfile
);

// ==================== SOCIAL ====================

// Follow a user (PROTECTED)
router.post(
  '/follow',
  verifyToken,
  rateLimit({ maxRequests: 50, windowMs: 15 * 60 * 1000 }),
  userController.followUser
);

// Unfollow a user (PROTECTED)
router.post(
  '/unfollow',
  verifyToken,
  rateLimit({ maxRequests: 50, windowMs: 15 * 60 * 1000 }),
  userController.unfollowUser
);

// Get a user's followers (PUBLIC)
router.get(
  '/:userId/followers',
  validateIdParam('userId'),
  validatePagination,
  userController.getFollowers
);

// Get who a user is following (PUBLIC)
router.get(
  '/:userId/following',
  validateIdParam('userId'),
  validatePagination,
  userController.getFollowing
);

module.exports = router;