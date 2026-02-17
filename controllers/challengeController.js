const challengeService = require('../../services/public/challengeService');

/**
 * Challenge Controller
 * Thin controller layer for challenge-related endpoints
 * Delegates business logic to service layer
 */

// ==================== GET ALL ACTIVE CHALLENGES ====================
exports.getActiveChallenges = async (req, res) => {
  try {
    const challenges = await challengeService.getActiveChallenges();
    
    res.status(200).json({
      success: true,
      count: challenges.length,
      challenges
    });
    
  } catch (error) {
    console.error('Error getting challenges:', error);
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
    const { includeLeaderboard } = req.query;
    
    const result = await challengeService.getChallengeDetails(
      challengeId, 
      includeLeaderboard !== 'false'
    );
    
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

// ==================== JOIN CHALLENGE ====================
exports.joinChallenge = async (req, res) => {
  try {
    const { userId, challengeId } = req.body;
    
    // Validate input
    if (!userId || !challengeId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: userId and challengeId' 
      });
    }
    
    // Delegate to service
    const result = await challengeService.joinChallenge(userId, challengeId);
    
    res.status(200).json({ 
      success: true,
      message: 'Successfully joined challenge',
      ...result
    });
    
  } catch (error) {
    console.error('Error joining challenge:', error);
    
    // Handle specific error cases
    const statusCode = getErrorStatusCode(error.message);
    
    res.status(statusCode).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// ==================== GET USER CHALLENGES ====================
exports.getUserChallenges = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.query; // 'active', 'completed', 'all'
    
    const challenges = await challengeService.getUserChallenges(
      userId, 
      status || 'all'
    );
    
    res.status(200).json({
      success: true,
      count: challenges.length,
      challenges
    });
    
  } catch (error) {
    console.error('Error getting user challenges:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// ==================== LEAVE CHALLENGE ====================
exports.leaveChallenge = async (req, res) => {
  try {
    const { userId, challengeId } = req.body;
    
    // Validate input
    if (!userId || !challengeId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: userId and challengeId' 
      });
    }
    
    await challengeService.leaveChallenge(userId, challengeId);
    
    res.status(200).json({ 
      success: true,
      message: 'Successfully left challenge'
    });
    
  } catch (error) {
    console.error('Error leaving challenge:', error);
    
    const statusCode = getErrorStatusCode(error.message);
    
    res.status(statusCode).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// ==================== GET CHALLENGE LEADERBOARD ====================
exports.getChallengeLeaderboard = async (req, res) => {
  try {
    const { challengeId } = req.params;
    const { limit } = req.query;
    
    const leaderboard = await challengeService.getChallengeLeaderboard(
      challengeId,
      parseInt(limit) || 10
    );
    
    res.status(200).json({
      success: true,
      count: leaderboard.length,
      leaderboard
    });
    
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// ==================== HELPER: GET ERROR STATUS CODE ====================
function getErrorStatusCode(errorMessage) {
  const errorMap = {
    'Challenge not found': 404,
    'Challenge is not active': 400,
    'Already joined this challenge': 400,
    'Not participating in this challenge': 404,
    'Cannot leave a completed challenge': 400
  };
  
  return errorMap[errorMessage] || 500;
}

module.exports = {
  getActiveChallenges: exports.getActiveChallenges,
  getChallengeDetails: exports.getChallengeDetails,
  joinChallenge: exports.joinChallenge,
  getUserChallenges: exports.getUserChallenges,
  leaveChallenge: exports.leaveChallenge,
  getChallengeLeaderboard: exports.getChallengeLeaderboard
};