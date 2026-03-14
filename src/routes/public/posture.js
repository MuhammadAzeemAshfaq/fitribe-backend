const express = require('express');
const router = express.Router();
const postureController = require('../../controllers/public/postureController');
const { verifyToken, rateLimit } = require('../../middleware/auth');
const { sanitizeInput } = require('../../middleware/validation');

/**
 * Posture / AI Session Routes
 */

router.use(sanitizeInput);

// ==================== GET CLASSIFIERS (public) ====================
// GET /api/posture/classifiers
// Flutter fetches this on app start to know which keypoints to track per exercise
router.get('/classifiers', postureController.getClassifiers);

// All routes below require auth
router.use(verifyToken);

// ==================== SUBMIT AI SESSION ====================
// POST /api/posture/session
router.post(
  '/session',
  rateLimit({ maxRequests: 30, windowMs: 60 * 60 * 1000 }),
  postureController.submitPostureSession
);

// ==================== GET SESSION DETAILS ====================
// GET /api/posture/session/:sessionId
router.get('/session/:sessionId', postureController.getSessionDetails);

// ==================== GET USER POSTURE HISTORY ====================
// GET /api/posture/history/:userId
router.get('/history/:userId', postureController.getUserPostureHistory);

// ==================== GET EXERCISE-SPECIFIC HISTORY ====================
// GET /api/posture/exercise/:userId/:exercise
router.get('/exercise/:userId/:exercise', postureController.getExerciseHistory);

module.exports = router;