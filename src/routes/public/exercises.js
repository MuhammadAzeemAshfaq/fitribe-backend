const express = require('express');
const router = express.Router();
const exerciseController = require('../../controllers/public/exerciseController');
const { optionalAuth } = require('../../middleware/auth');
const { validatePagination, sanitizeInput } = require('../../middleware/validation');

router.use(sanitizeInput);

// Get all exercises (PUBLIC)
// ?category=Isolation Strength  &difficulty=Easy  &limit=20  &offset=0
router.get(
  '/',
  optionalAuth,
  validatePagination,
  exerciseController.getAllExercises
);

// Get available categories (PUBLIC)
// Must be defined BEFORE /:exerciseId to avoid route conflict
router.get(
  '/categories',
  exerciseController.getCategories
);

// Get exercise by name - used by Hamza for pose detection lookup (PUBLIC)
// Must be defined BEFORE /:exerciseId to avoid route conflict
// Example: GET /api/exercises/byName/Burpee
// Example: GET /api/exercises/byName/Mountain%20Climber
router.get(
  '/byName/:name',
  exerciseController.getExerciseByName
);

// Get single exercise by Firestore document ID (PUBLIC)
router.get(
  '/:exerciseId',
  optionalAuth,
  exerciseController.getExerciseById
);

module.exports = router;