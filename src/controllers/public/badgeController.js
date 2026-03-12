const badgeService = require('../../services/public/badgeService');

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
    
    // Use getUserBadgesWithLocked which returns both earned and locked
    const result = await badgeService.getUserBadgesWithLocked(userId);
    
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
    
    // Get available badges with progress
    const badges = await badgeService.getAvailableBadges(userId);
    
    res.status(200).json({
      success: true,
      count: badges.length,
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
    
    // Get badge from collection
    const admin = require('firebase-admin');
    const db = admin.firestore();
    const badgeDoc = await db.collection('badges').doc(badgeId).get();
    
    if (!badgeDoc.exists) {
      return res.status(404).json({ 
        success: false, 
        error: 'Badge not found' 
      });
    }
    
    res.status(200).json({
      success: true,
      badge: {
        id: badgeDoc.id,
        ...badgeDoc.data()
      }
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
    
    // Get available badges and sort by progress
    const allAvailable = await badgeService.getAvailableBadges(userId);
    
    // Sort by progress (highest progress first = closest to earning)
    const sortedBadges = allAvailable
      .sort((a, b) => b.progress - a.progress)
      .slice(0, parseInt(limit) || 5);
    
    res.status(200).json({
      success: true,
      count: sortedBadges.length,
      badges: sortedBadges
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