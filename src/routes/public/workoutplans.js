const express = require('express');
const router = express.Router();
const workoutPlanController = require('../../controllers/public/workoutplanController');
const { optionalAuth } = require('../../middleware/auth');
const { validateIdParam, validatePagination, sanitizeInput } = require('../../middleware/validation');

router.use(sanitizeInput);

// Get all workout plans (PUBLIC)
// ?category=Core  &difficulty=Hard  &limit=20  &offset=0
router.get(
  '/',
  optionalAuth,
  validatePagination,
  workoutPlanController.getAllWorkoutPlans
);

// Get available categories for filter dropdowns (PUBLIC)
router.get(
  '/categories',
  workoutPlanController.getCategories
);

// Get single workout plan with full exercises array (PUBLIC)
router.get(
  '/:planId',
  optionalAuth,
  validateIdParam('planId'),
  workoutPlanController.getWorkoutPlanById
);

module.exports = router;