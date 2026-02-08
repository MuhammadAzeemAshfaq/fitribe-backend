const progressService = require('../services/progressService');

/**
 * Progress Controller
 * Thin controller layer that handles HTTP requests/responses
 * Delegates business logic to service layer
 */

// ==================== RECORD WORKOUT SESSION ====================
exports.recordWorkoutSession = async (req, res) => {
  try {
    const { userId, workoutPlanId, exercises, durationMinutes } = req.body;
    
    // Validate input
    if (!userId || !exercises || !durationMinutes) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields' 
      });
    }
    
    // Delegate to service layer
    const result = await progressService.recordWorkoutSession({
      userId,
      workoutPlanId,
      exercises,
      durationMinutes
    });
    
    res.status(200).json({
      success: true,
      ...result
    });
    
  } catch (error) {
    console.error('Error recording workout:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// ==================== GET USER PROGRESS ====================
exports.getUserProgress = async (req, res) => {
  try {
    const { userId } = req.params;
    const { period } = req.query; // 'week', 'month', 'all'
    
    // Validate period
    if (period && !['week', 'month', 'all'].includes(period)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid period. Must be week, month, or all' 
      });
    }
    
    // Delegate to service layer
    const result = await progressService.getUserProgress(userId, period || 'all');
    
    if (!result) {
      return res.status(404).json({ 
        success: false, 
        error: 'User progress not found' 
      });
    }
    
    res.status(200).json({
      success: true,
      ...result
    });
    
  } catch (error) {
    console.error('Error getting progress:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// ==================== GET WORKOUT STATISTICS ====================
exports.getWorkoutStats = async (req, res) => {
  try {
    const { userId } = req.params;
    const { period } = req.query; // 'week', 'month', 'year'
    
    // Validate period
    if (period && !['week', 'month', 'year'].includes(period)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid period. Must be week, month, or year' 
      });
    }
    
    // Delegate to service layer
    const stats = await progressService.getWorkoutStatistics(userId, period || 'month');
    
    res.status(200).json({
      success: true,
      period: period || 'month',
      stats
    });
    
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

module.exports = {
  recordWorkoutSession: exports.recordWorkoutSession,
  getUserProgress: exports.getUserProgress,
  getWorkoutStats: exports.getWorkoutStats
};