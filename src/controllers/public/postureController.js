const postureService = require('../../services/public/postureService');

/**
 * Posture Controller
 * Thin controller — delegates all logic to postureService
 */

// ==================== SUBMIT AI SESSION ====================
exports.submitPostureSession = async (req, res) => {
  try {
    const { workoutSessionId, exercises } = req.body;
    const userId = req.user.uid;

    if (!exercises || !Array.isArray(exercises) || exercises.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'exercises must be a non-empty array'
      });
    }

    // Validate each exercise has at minimum a name
    const invalid = exercises.find(ex => !ex.exerciseName);
    if (invalid) {
      return res.status(400).json({
        success: false,
        error: 'Each exercise must have an exerciseName'
      });
    }

    const result = await postureService.submitPostureSession(
      userId,
      workoutSessionId,
      exercises
    );

    res.status(201).json({
      success: true,
      message: 'Posture session saved',
      ...result
    });

  } catch (error) {
    console.error('Error submitting posture session:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== GET SESSION DETAILS ====================
exports.getSessionDetails = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.uid;

    const session = await postureService.getSessionDetails(sessionId);

    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    // Only the session owner can view it
    if (session.userId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    res.status(200).json({ success: true, session });

  } catch (error) {
    console.error('Error getting session details:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== GET USER POSTURE HISTORY ====================
exports.getUserPostureHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const requesterId = req.user.uid;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);

    // Users can only view their own history
    if (userId !== requesterId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const history = await postureService.getUserPostureHistory(userId, limit);

    res.status(200).json({
      success: true,
      count: history.length,
      history
    });

  } catch (error) {
    console.error('Error getting posture history:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== GET EXERCISE HISTORY ====================
exports.getExerciseHistory = async (req, res) => {
  try {
    const { userId, exercise } = req.params;
    const requesterId = req.user.uid;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);

    if (userId !== requesterId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const history = await postureService.getExerciseHistory(userId, exercise, limit);

    res.status(200).json({
      success: true,
      exercise,
      count: history.length,
      history
    });

  } catch (error) {
    console.error('Error getting exercise history:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== GET CLASSIFIERS ====================
exports.getClassifiers = async (req, res) => {
  try {
    const classifiers = await postureService.getClassifiers();

    res.status(200).json({
      success: true,
      count: classifiers.length,
      classifiers
    });

  } catch (error) {
    console.error('Error getting classifiers:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};