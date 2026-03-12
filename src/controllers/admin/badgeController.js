const adminBadgeService = require('../../services/admin/badgeService');

/**
 * Admin Badge Controller
 * Handles admin operations for badges
 */

// ==================== GET ALL BADGES ====================
exports.getAllBadges = async (req, res) => {
  try {
    const { category, tier } = req.query;
    
    const result = await adminBadgeService.getAllBadges({
      category: category || 'all',
      tier: tier || 'all'
    });
    
    res.status(200).json({
      success: true,
      ...result
    });
    
  } catch (error) {
    console.error('Error getting all badges:', error);
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
    
    const result = await adminBadgeService.getBadgeDetails(badgeId);
    
    if (!result) {
      return res.status(404).json({ 
        success: false, 
        error: 'Badge not found' 
      });
    }
    
    res.status(200).json({
      success: true,
      ...result
    });
    
  } catch (error) {
    console.error('Error getting badge details:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// ==================== CREATE BADGE ====================
exports.createBadge = async (req, res) => {
  try {
    const badgeData = req.body;
    const adminId = req.user.uid;
    
    // Validate required fields
    const requiredFields = ['name', 'description', 'category', 'condition'];
    const missingFields = requiredFields.filter(field => !badgeData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        missingFields
      });
    }
    
    // Validate condition structure
    if (!badgeData.condition.type || !badgeData.condition.value) {
      return res.status(400).json({
        success: false,
        error: 'Condition must have type and value'
      });
    }
    
    const result = await adminBadgeService.createBadge({
      ...badgeData,
      createdBy: adminId
    });
    
    res.status(201).json({
      success: true,
      message: 'Badge created successfully',
      ...result
    });
    
  } catch (error) {
    console.error('Error creating badge:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// ==================== UPDATE BADGE ====================
exports.updateBadge = async (req, res) => {
  try {
    const { badgeId } = req.params;
    const updateData = req.body;
    const adminId = req.user.uid;
    
    // Check if trying to update condition
    if (updateData.condition) {
      return res.status(400).json({
        success: false,
        error: 'Cannot update badge conditions. Users may have already earned this badge with current conditions.',
        suggestion: 'Create a new badge instead'
      });
    }
    
    const result = await adminBadgeService.updateBadge(
      badgeId, 
      updateData,
      adminId
    );
    
    res.status(200).json({
      success: true,
      message: 'Badge updated successfully',
      ...result
    });
    
  } catch (error) {
    console.error('Error updating badge:', error);
    
    const statusCode = error.message === 'Badge not found' ? 404 : 500;
    
    res.status(statusCode).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// ==================== DELETE BADGE ====================
exports.deleteBadge = async (req, res) => {
  try {
    const { badgeId } = req.params;
    
    const result = await adminBadgeService.deleteBadge(badgeId);
    
    res.status(200).json({
      success: true,
      message: result.message,
      ...result
    });
    
  } catch (error) {
    console.error('Error deleting badge:', error);
    
    let statusCode = 500;
    if (error.message === 'Badge not found') statusCode = 404;
    if (error.message.includes('Cannot delete badge')) statusCode = 400;
    
    res.status(statusCode).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// ==================== GET BADGE STATISTICS ====================
exports.getBadgeStats = async (req, res) => {
  try {
    const { badgeId } = req.params;
    
    const stats = await adminBadgeService.getBadgeStatistics(badgeId);
    
    res.status(200).json({
      success: true,
      stats
    });
    
  } catch (error) {
    console.error('Error getting badge stats:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// ==================== GET USERS WITH BADGE ====================
exports.getUsersWithBadge = async (req, res) => {
  try {
    const { badgeId } = req.params;
    const { limit } = req.query;
    
    const users = await adminBadgeService.getUsersWithBadge(
      badgeId,
      parseInt(limit) || 50
    );
    
    res.status(200).json({
      success: true,
      count: users.length,
      users
    });
    
  } catch (error) {
    console.error('Error getting users with badge:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

module.exports = {
  getAllBadges: exports.getAllBadges,
  getBadgeDetails: exports.getBadgeDetails,
  createBadge: exports.createBadge,
  updateBadge: exports.updateBadge,
  deleteBadge: exports.deleteBadge,
  getBadgeStats: exports.getBadgeStats,
  getUsersWithBadge: exports.getUsersWithBadge
};