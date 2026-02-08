const express = require('express');
const router = express.Router();
const badgeController = require('../controllers/badgeController');

// Get all badges
router.get('/', badgeController.getAllBadges);

// Get user badges
router.get('/user/:userId', badgeController.getUserBadges);

// Get badge progress
router.get('/user/:userId/progress', badgeController.getBadgeProgress);

module.exports = router;