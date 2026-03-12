const adminChallengeService = require('../../services/admin/challengeService');

/**
 * Admin Challenge Controller
 * Handles admin operations for challenges
 */

// ==================== GET ALL CHALLENGES ====================
exports.getAllChallenges = async (req, res) => {
  try {
    const { status, page, limit } = req.query;
    
    const result = await adminChallengeService.getAllChallenges({
      status: status || 'all',
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20
    });
    
    res.status(200).json({
      success: true,
      ...result
    });
    
  } catch (error) {
    console.error('Error getting all challenges:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// ==================== GET CHALLENGE DETAILS ====================
exports.getChallengeDetails = async (req, res) => {
  try {
    const { challengeId } = req.params;
    
    const result = await adminChallengeService.getChallengeDetails(challengeId);
    
    if (!result) {
      return res.status(404).json({ 
        success: false, 
        error: 'Challenge not found' 
      });
    }
    
    res.status(200).json({
      success: true,
      ...result
    });
    
  } catch (error) {
    console.error('Error getting challenge details:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// ==================== CREATE CHALLENGE ====================
exports.createChallenge = async (req, res) => {
  try {
    const challengeData = req.body;
    const adminId = req.user.uid;
    
    // Validate required fields
    const requiredFields = ['name', 'description', 'type', 'goal', 'startDate', 'endDate'];
    const missingFields = requiredFields.filter(field => !challengeData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        missingFields
      });
    }
    
    const result = await adminChallengeService.createChallenge({
      ...challengeData,
      createdBy: adminId
    });
    
    res.status(201).json({
      success: true,
      message: 'Challenge created successfully',
      ...result
    });
    
  } catch (error) {
    console.error('Error creating challenge:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// ==================== UPDATE CHALLENGE ====================
exports.updateChallenge = async (req, res) => {
  try {
    const { challengeId } = req.params;
    const updateData = req.body;
    const adminId = req.user.uid;
    
    const result = await adminChallengeService.updateChallenge(
      challengeId, 
      updateData,
      adminId
    );
    
    res.status(200).json({
      success: true,
      message: 'Challenge updated successfully',
      ...result
    });
    
  } catch (error) {
    console.error('Error updating challenge:', error);
    
    const statusCode = error.message === 'Challenge not found' ? 404 : 500;
    
    res.status(statusCode).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// ==================== DELETE CHALLENGE ====================
exports.deleteChallenge = async (req, res) => {
  try {
    const { challengeId } = req.params;
    const { force } = req.query; // ?force=true to force delete
    
    const result = await adminChallengeService.deleteChallenge(
      challengeId,
      force === 'true'
    );
    
    res.status(200).json({
      success: true,
      message: result.message,
      ...result
    });
    
  } catch (error) {
    console.error('Error deleting challenge:', error);
    
    let statusCode = 500;
    if (error.message === 'Challenge not found') statusCode = 404;
    if (error.message.includes('Cannot delete challenge')) statusCode = 400;
    
    res.status(statusCode).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// ==================== TOGGLE CHALLENGE STATUS ====================
exports.toggleChallengeStatus = async (req, res) => {
  try {
    const { challengeId } = req.params;
    const { status } = req.body;
    
    if (!status || !['active', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be active, completed, or cancelled'
      });
    }
    
    const result = await adminChallengeService.updateChallengeStatus(
      challengeId,
      status
    );
    
    res.status(200).json({
      success: true,
      message: `Challenge status changed to ${status}`,
      ...result
    });
    
  } catch (error) {
    console.error('Error toggling challenge status:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// ==================== GET CHALLENGE STATISTICS ====================
exports.getChallengeStats = async (req, res) => {
  try {
    const { challengeId } = req.params;
    
    const stats = await adminChallengeService.getChallengeStatistics(challengeId);
    
    res.status(200).json({
      success: true,
      stats
    });
    
  } catch (error) {
    console.error('Error getting challenge stats:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

module.exports = {
  getAllChallenges: exports.getAllChallenges,
  getChallengeDetails: exports.getChallengeDetails,
  createChallenge: exports.createChallenge,
  updateChallenge: exports.updateChallenge,
  deleteChallenge: exports.deleteChallenge,
  toggleChallengeStatus: exports.toggleChallengeStatus,
  getChallengeStats: exports.getChallengeStats
};