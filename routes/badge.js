const express = require('express');
const router = express.Router();
const badgeController = require('../../controllers/public/badgeController');
const { verifyToken, verifyOwnership, optionalAuth } = require('../../middleware/auth');
const { validatePagination, validateIdParam, sanitizeInput } = require('../../middleware/validation');

/**
 * Badge Routes - Keeping your original paths with added security
 */

router.use(sanitizeInput);

// Get all badges (PUBLIC)
router.get('/', optionalAuth, validatePagination, badgeController.getAllBadges);

// Get user badges (PROTECTED - Your path)
router.get(
  '/user/:userId',
  verifyToken,
  verifyOwnership,
  validateIdParam('userId'),
  validatePagination,
  badgeController.getUserBadges
);

// Get badge progress (PROTECTED - Your path)
router.get(
  '/user/:userId/progress',
  verifyToken,
  verifyOwnership,
  validateIdParam('userId'),
  badgeController.getBadgeProgress
);

// Get next badges (PROTECTED - NEW)
router.get(
  '/user/:userId/next',
  verifyToken,
  verifyOwnership,
  validateIdParam('userId'),
  validatePagination,
  badgeController.getNextBadges
);

// Get badge details (PUBLIC - NEW)
router.get('/:badgeId', validateIdParam('badgeId'), badgeController.getBadgeDetails);


module.exports = router;