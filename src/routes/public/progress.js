const express = require('express');
const router = express.Router();
const progressController = require('../../controllers/public/progressController');
const { verifyToken, verifyOwnership, rateLimit } = require('../../middleware/auth');
const { validateWorkoutSession, validatePagination, validatePeriod, validateIdParam, sanitizeInput } = require('../../middleware/validation');

/**
 * Progress Routes - Keeping your original paths with added security
 */

router.use(sanitizeInput);

// Record workout session (PROTECTED - Your path)
router.post(
  '/session',
  verifyToken,
  rateLimit({ maxRequests: 50, windowMs: 15 * 60 * 1000 }),
  validateWorkoutSession,
  verifyOwnership,
  progressController.recordWorkoutSession
);

// Get user progress (PROTECTED - Your path)
router.get(
  '/:userId',
  verifyToken,
  verifyOwnership,
  validateIdParam('userId'),
  validatePeriod,
  validatePagination,
  progressController.getUserProgress
);

// Get workout statistics (PROTECTED - Your path)
router.get(
  '/:userId/stats',
  verifyToken,
  verifyOwnership,
  validateIdParam('userId'),
  validatePeriod,
  progressController.getWorkoutStats
);

module.exports = router;