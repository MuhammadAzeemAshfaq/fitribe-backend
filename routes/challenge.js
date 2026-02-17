const express = require('express');
const router = express.Router();
const challengeController = require('../../controllers/public/challengeController');
const { verifyToken, verifyOwnership, optionalAuth, rateLimit } = require('../../middleware/auth');
const { validateChallengeJoin, validatePagination, validateStatus, validateIdParam, sanitizeInput } = require('../../middleware/validation');

/**
 * Challenge Routes - Keeping your original paths with added security
 */

router.use(sanitizeInput);

// Get all active challenges (PUBLIC - Your path)
router.get('/active', optionalAuth, validatePagination, challengeController.getActiveChallenges);

// Get challenge details (PUBLIC - Your path)
router.get('/:challengeId', optionalAuth, validateIdParam('challengeId'), challengeController.getChallengeDetails);

// Get challenge leaderboard (PUBLIC - NEW)
router.get(
  '/:challengeId/leaderboard',
  validateIdParam('challengeId'),
  validatePagination,
  challengeController.getChallengeLeaderboard
);

// Join challenge (PROTECTED - Your path)
router.post(
  '/join',
  verifyToken,
  rateLimit({ maxRequests: 20, windowMs: 60 * 60 * 1000 }),
  validateChallengeJoin,
  verifyOwnership,
  challengeController.joinChallenge
);

// Leave challenge (PROTECTED - Your path)
router.post(
  '/leave',
  verifyToken,
  rateLimit({ maxRequests: 20, windowMs: 60 * 60 * 1000 }),
  validateChallengeJoin,
  verifyOwnership,
  challengeController.leaveChallenge
);

// Get user's challenges (PROTECTED - Your path)
router.get(
  '/user/:userId',
  verifyToken,
  verifyOwnership,
  validateIdParam('userId'),
  validateStatus(['in_progress', 'completed', 'abandoned', 'all']),
  validatePagination,
  challengeController.getUserChallenges
);

module.exports = router;