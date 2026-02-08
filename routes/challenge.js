const express = require('express');
const router = express.Router();
const challengeController = require('../controllers/challengeController');

// Get all active challenges
router.get('/active', challengeController.getActiveChallenges);

// Get challenge details
router.get('/:challengeId', challengeController.getChallengeDetails);

// Join challenge
router.post('/join', challengeController.joinChallenge);

// Get user's challenges
router.get('/user/:userId', challengeController.getUserChallenges);

// Leave challenge
router.post('/leave', challengeController.leaveChallenge);

module.exports = router;