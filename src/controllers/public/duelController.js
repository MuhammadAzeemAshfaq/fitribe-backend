const duelService = require('../../services/public/duelService');

/**
 * Duel Controller
 * Thin controller — delegates all logic to duelService
 */

// Helper to map error messages to HTTP status codes
function getErrorStatusCode(message) {
  if (message.includes('not found')) return 404;
  if (message.includes('not active') ||
      message.includes('already') ||
      message.includes('Cannot') ||
      message.includes('cannot') ||
      message.includes('Only') ||
      message.includes('expired') ||
      message.includes('not part')) return 400;
  return 500;
}

// ==================== CREATE DUEL ====================
exports.createDuel = async (req, res) => {
  try {
    const { opponentId, exercise, metric } = req.body;
    const challengerId = req.user.uid;

    if (!opponentId || !exercise || !metric) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: opponentId, exercise, metric'
      });
    }

    const validMetrics = ['rep_count', 'form_score'];
    if (!validMetrics.includes(metric)) {
      return res.status(400).json({
        success: false,
        error: `Invalid metric. Must be one of: ${validMetrics.join(', ')}`
      });
    }

    const result = await duelService.createDuel(challengerId, opponentId, exercise, metric);

    res.status(201).json({
      success: true,
      message: 'Duel invite sent',
      duel: result
    });

  } catch (error) {
    console.error('Error creating duel:', error);
    res.status(getErrorStatusCode(error.message)).json({
      success: false,
      error: error.message
    });
  }
};

// ==================== GET MY DUELS ====================
exports.getMyDuels = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { status } = req.query;

    const validStatuses = ['pending', 'active', 'completed', 'declined', 'expired', 'all'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const duels = await duelService.getUserDuels(userId, status || 'all');

    res.status(200).json({
      success: true,
      count: duels.length,
      duels
    });

  } catch (error) {
    console.error('Error getting duels:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== GET DUEL DETAILS ====================
exports.getDuelDetails = async (req, res) => {
  try {
    const { duelId } = req.params;
    const userId = req.user.uid;

    const duel = await duelService.getDuelDetails(duelId);

    if (!duel) {
      return res.status(404).json({ success: false, error: 'Duel not found' });
    }

    // Only participants can view duel details
    if (duel.challengerId !== userId && duel.opponentId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    res.status(200).json({ success: true, duel });

  } catch (error) {
    console.error('Error getting duel details:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== ACCEPT DUEL ====================
exports.acceptDuel = async (req, res) => {
  try {
    const { duelId } = req.params;
    const userId = req.user.uid;

    const result = await duelService.acceptDuel(duelId, userId);

    res.status(200).json({
      success: true,
      message: 'Duel accepted',
      ...result
    });

  } catch (error) {
    console.error('Error accepting duel:', error);
    res.status(getErrorStatusCode(error.message)).json({
      success: false,
      error: error.message
    });
  }
};

// ==================== DECLINE DUEL ====================
exports.declineDuel = async (req, res) => {
  try {
    const { duelId } = req.params;
    const userId = req.user.uid;

    const result = await duelService.declineDuel(duelId, userId);

    res.status(200).json({
      success: true,
      message: 'Duel declined',
      ...result
    });

  } catch (error) {
    console.error('Error declining duel:', error);
    res.status(getErrorStatusCode(error.message)).json({
      success: false,
      error: error.message
    });
  }
};

// ==================== SUBMIT PERFORMANCE ====================
exports.submitPerformance = async (req, res) => {
  try {
    const { duelId } = req.params;
    const userId = req.user.uid;
    const { reps, formScore, durationSeconds } = req.body;

    if (reps === undefined && formScore === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Must provide at least reps or formScore'
      });
    }

    const result = await duelService.submitPerformance(duelId, userId, {
      reps,
      formScore,
      durationSeconds
    });

    const message = result.status === 'completed'
      ? 'Performance submitted — duel resolved!'
      : 'Performance submitted — waiting for opponent';

    res.status(200).json({
      success: true,
      message,
      ...result
    });

  } catch (error) {
    console.error('Error submitting performance:', error);
    res.status(getErrorStatusCode(error.message)).json({
      success: false,
      error: error.message
    });
  }
};

// ==================== GET MY DUEL STATS ====================
exports.getMyDuelStats = async (req, res) => {
  try {
    const userId = req.user.uid;

    const stats = await duelService.getDuelStats(userId);

    res.status(200).json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Error getting duel stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};