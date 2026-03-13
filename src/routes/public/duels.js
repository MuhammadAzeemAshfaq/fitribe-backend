const express = require('express');
const router = express.Router();
const duelController = require('../../controllers/public/duelController');
const { verifyToken, rateLimit } = require('../../middleware/auth');
const { sanitizeInput } = require('../../middleware/validation');

/**
 * Duel Routes
 * All routes require authentication
 */

router.use(verifyToken);
router.use(sanitizeInput);

// ==================== CREATE DUEL (send invite) ====================
// POST /api/duels
router.post(
  '/',
  rateLimit({ maxRequests: 10, windowMs: 60 * 60 * 1000 }),
  duelController.createDuel
);

// ==================== GET MY DUELS ====================
// GET /api/duels?status=pending|active|completed|all
router.get('/', duelController.getMyDuels);

// ==================== GET MY DUEL STATS ====================
// GET /api/duels/stats/me
router.get('/stats/me', duelController.getMyDuelStats);

// ==================== GET DUEL DETAILS ====================
// GET /api/duels/:duelId
router.get('/:duelId', duelController.getDuelDetails);

// ==================== ACCEPT DUEL ====================
// PUT /api/duels/:duelId/accept
router.put('/:duelId/accept', duelController.acceptDuel);

// ==================== DECLINE DUEL ====================
// PUT /api/duels/:duelId/decline
router.put('/:duelId/decline', duelController.declineDuel);

// ==================== SUBMIT PERFORMANCE ====================
// POST /api/duels/:duelId/performance
router.post(
  '/:duelId/performance',
  rateLimit({ maxRequests: 20, windowMs: 60 * 60 * 1000 }),
  duelController.submitPerformance
);

module.exports = router;