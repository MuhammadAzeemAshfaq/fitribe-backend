const workoutPlanService = require('../../services/public/workoutplanService');
const { logger } = require('../../utils/logger');

// ==================== GET ALL WORKOUT PLANS ====================
async function getAllWorkoutPlans(req, res) {
  try {
    const { category, difficulty } = req.query;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    const result = await workoutPlanService.getAllWorkoutPlans({
      category,
      difficulty,
      limit,
      offset
    });

    return res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error(`getAllWorkoutPlans error: ${error.message}`);
    return res.status(500).json({ success: false, error: 'Failed to fetch workout plans' });
  }
}

// ==================== GET SINGLE WORKOUT PLAN ====================
async function getWorkoutPlanById(req, res) {
  try {
    const { planId } = req.params;

    const plan = await workoutPlanService.getWorkoutPlanById(planId);

    if (!plan) {
      return res.status(404).json({ success: false, error: 'Workout plan not found' });
    }

    return res.status(200).json({
      success: true,
      data: plan
    });

  } catch (error) {
    logger.error(`getWorkoutPlanById error: ${error.message}`);
    return res.status(500).json({ success: false, error: 'Failed to fetch workout plan' });
  }
}

// ==================== GET CATEGORIES ====================
async function getCategories(req, res) {
  try {
    const categories = await workoutPlanService.getCategories();

    return res.status(200).json({
      success: true,
      data: { categories }
    });

  } catch (error) {
    logger.error(`getCategories error: ${error.message}`);
    return res.status(500).json({ success: false, error: 'Failed to fetch categories' });
  }
}

module.exports = {
  getAllWorkoutPlans,
  getWorkoutPlanById,
  getCategories
};