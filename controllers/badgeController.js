const badgeService = require('../services/badgeService');

/**
 * Badge Controller
 * Thin controller layer for badge-related endpoints
 * Delegates business logic to service layer
 */

// ==================== GET ALL BADGES ====================
exports.getAllBadges = async (req, res) => {
  try {
    const badges = await badgeService.getAllBadges();
    
    res.status(200).json({
      success: true,
      count: badges.length,
      badges
    });
    
  } catch (error) {
    console.error('Error getting badges:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// ==================== GET USER BADGES ====================
exports.getUserBadges = async (req, res) => {
  try {
    const { userId } = req.params;
    const { includeProgress } = req.query;
    
    const result = await badgeService.getUserBadgesWithLocked(
      userId, 
      includeProgress === 'true'
    );
    
    res.status(200).json({
      success: true,
      ...result
    });
    
  } catch (error) {
    console.error('Error getting user badges:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// ==================== GET BADGE PROGRESS ====================
exports.getBadgeProgress = async (req, res) => {
  try {
    const { userId } = req.params;
    const { category } = req.query; // Optional filter by category
    
    const badges = await badgeService.getBadgeProgress(userId, category);
    
    if (!badges) {
      return res.status(404).json({ 
        success: false, 
        error: 'User progress not found' 
      });
    }
    
    res.status(200).json({
      success: true,
      badges
    });
    
  } catch (error) {
    console.error('Error getting badge progress:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// ==================== GET BADGE DETAILS ====================
exports.getBadgeDetails = async (req, res) => {
  try {
    const { badgeId } = req.params;
    
    const badge = await badgeService.getBadgeDetails(badgeId);
    
    if (!badge) {
      return res.status(404).json({ 
        success: false, 
        error: 'Badge not found' 
      });
    }
    
    res.status(200).json({
      success: true,
      badge
    });
    
  } catch (error) {
    console.error('Error getting badge details:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// ==================== GET NEXT AVAILABLE BADGES ====================
exports.getNextBadges = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit } = req.query;
    
    const badges = await badgeService.getNextAvailableBadges(
      userId,
      parseInt(limit) || 5
    );
    
    res.status(200).json({
      success: true,
      count: badges.length,
      badges
    });
    
  } catch (error) {
    console.error('Error getting next badges:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

module.exports = {
  getAllBadges: exports.getAllBadges,
  getUserBadges: exports.getUserBadges,
  getBadgeProgress: exports.getBadgeProgress,
  getBadgeDetails: exports.getBadgeDetails,
  getNextBadges: exports.getNextBadges
};