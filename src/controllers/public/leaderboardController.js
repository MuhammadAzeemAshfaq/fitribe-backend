const leaderboardService = require('../../services/public/leaderboardService');
const { logger } = require('../../utils/logger');

// ==================== GET GLOBAL LEADERBOARD ====================
async function getGlobalLeaderboard(req, res) {
  try {
    const type = req.query.type || 'xp';
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    const result = await leaderboardService.getGlobalLeaderboard(type, limit, offset);

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    logger.error(`getGlobalLeaderboard error: ${error.message}`);

    if (error.message.startsWith('type must be one of')) {
      return res.status(400).json({ success: false, error: error.message });
    }

    return res.status(500).json({ success: false, error: 'Failed to fetch leaderboard' });
  }
}

// ==================== GET USER RANK ====================
async function getUserRank(req, res) {
  try {
    const { userId } = req.params;
    const type = req.query.type || 'xp';

    const result = await leaderboardService.getUserRank(userId, type);

    if (!result) {
      return res.status(404).json({ success: false, error: 'User progress not found' });
    }

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    logger.error(`getUserRank error: ${error.message}`);

    if (error.message.startsWith('Invalid leaderboard type')) {
      return res.status(400).json({ success: false, error: error.message });
    }

    return res.status(500).json({ success: false, error: 'Failed to fetch user rank' });
  }
}

// ==================== GET FRIENDS LEADERBOARD ====================
async function getFriendsLeaderboard(req, res) {
  try {
    const userId = req.user.uid;
    const type = req.query.type || 'xp';
    const limit = parseInt(req.query.limit) || 20;

    const result = await leaderboardService.getFriendsLeaderboard(userId, type, limit);

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    logger.error(`getFriendsLeaderboard error: ${error.message}`);

    if (error.message.startsWith('Invalid leaderboard type')) {
      return res.status(400).json({ success: false, error: error.message });
    }

    return res.status(500).json({ success: false, error: 'Failed to fetch friends leaderboard' });
  }
}

module.exports = {
  getGlobalLeaderboard,
  getUserRank,
  getFriendsLeaderboard
};