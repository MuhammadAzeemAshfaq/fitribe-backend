const exerciseService = require('../../services/public/exerciseService');
const { logger } = require('../../utils/logger');

// ==================== GET ALL EXERCISES ====================
async function getAllExercises(req, res) {
  try {
    const { category, difficulty } = req.query;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    const result = await exerciseService.getAllExercises({
      category,
      difficulty,
      limit,
      offset
    });

    return res.status(200).json({ success: true, data: result });

  } catch (error) {
    logger.error(`getAllExercises error: ${error.message}`);
    return res.status(500).json({ success: false, error: 'Failed to fetch exercises' });
  }
}

// ==================== GET EXERCISE BY ID ====================
async function getExerciseById(req, res) {
  try {
    const { exerciseId } = req.params;

    const exercise = await exerciseService.getExerciseById(exerciseId);

    if (!exercise) {
      return res.status(404).json({ success: false, error: 'Exercise not found' });
    }

    return res.status(200).json({ success: true, data: exercise });

  } catch (error) {
    logger.error(`getExerciseById error: ${error.message}`);
    return res.status(500).json({ success: false, error: 'Failed to fetch exercise' });
  }
}

// ==================== GET EXERCISE BY NAME ====================
async function getExerciseByName(req, res) {
  try {
    const { name } = req.params;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Exercise name is required' });
    }

    const exercise = await exerciseService.getExerciseByName(decodeURIComponent(name));

    if (!exercise) {
      return res.status(404).json({ success: false, error: `Exercise "${name}" not found` });
    }

    return res.status(200).json({ success: true, data: exercise });

  } catch (error) {
    logger.error(`getExerciseByName error: ${error.message}`);
    return res.status(500).json({ success: false, error: 'Failed to fetch exercise by name' });
  }
}

// ==================== GET CATEGORIES ====================
async function getCategories(req, res) {
  try {
    const categories = await exerciseService.getCategories();
    return res.status(200).json({ success: true, data: { categories } });

  } catch (error) {
    logger.error(`getExerciseCategories error: ${error.message}`);
    return res.status(500).json({ success: false, error: 'Failed to fetch categories' });
  }
}

module.exports = {
  getAllExercises,
  getExerciseById,
  getExerciseByName,
  getCategories
};