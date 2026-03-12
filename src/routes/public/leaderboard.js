const express = require('express');
const router = express.Router();
const leaderboardController = require('../../controllers/public/leaderboardController');
const { verifyToken, optionalAuth } = require('../../middleware/auth');
const { validateIdParam, validatePagination, sanitizeInput } = require('../../middleware/validation');

router.use(sanitizeInput);

// Get global leaderboard (PUBLIC)
// ?type=xp|streak|workouts|calories  &limit=20  &offset=0
router.get(
  '/global',
  optionalAuth,
  validatePagination,
  leaderboardController.getGlobalLeaderboard
);

// Get friends leaderboard (PROTECTED - needs auth to know who your friends are)
// ?type=xp|streak|workouts|calories  &limit=20
router.get(
  '/friends',
  verifyToken,
  validatePagination,
  leaderboardController.getFriendsLeaderboard
);

// Get a specific user's rank (PUBLIC)
// ?type=xp|streak|workouts|calories
router.get(
  '/rank/:userId',
  validateIdParam('userId'),
  leaderboardController.getUserRank
);

module.exports = router;