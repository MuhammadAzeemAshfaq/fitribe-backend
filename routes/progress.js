const express = require('express');
const router = express.Router();
const progressController = require('../controllers/progressController');

// Record workout session
router.post('/session', progressController.recordWorkoutSession);

// Get user progress
router.get('/:userId', progressController.getUserProgress);

// Get workout statistics
router.get('/:userId/stats', progressController.getWorkoutStats);

module.exports = router;