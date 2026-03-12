const express = require('express');
const router = express.Router();
const adminChallengeController = require('../../controllers/admin/challengeController');
const { verifyToken, requireAdmin, rateLimit } = require('../../middleware/auth');
const { 
  validateChallengeCreation, 
  validateIdParam, 
  sanitizeInput 
} = require('../../middleware/validation');

/**
 * Admin Challenge Routes
 * All routes require admin authentication
 */

// Apply admin middleware to all routes
router.use(verifyToken);
router.use(requireAdmin);
router.use(sanitizeInput);

// ==================== GET ALL CHALLENGES (ADMIN VIEW) ====================
/**
 * @swagger
 * /api/admin/challenges:
 *   get:
 *     summary: Get all challenges (including inactive)
 *     tags: [Admin - Challenges]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, completed, cancelled, all]
 *         description: Filter by status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of challenges
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.get('/', adminChallengeController.getAllChallenges);

// ==================== GET CHALLENGE DETAILS ====================
router.get(
  '/:challengeId',
  validateIdParam('challengeId'),
  adminChallengeController.getChallengeDetails
);

// ==================== CREATE NEW CHALLENGE ====================
/**
 * @swagger
 * /api/admin/challenges:
 *   post:
 *     summary: Create a new challenge
 *     tags: [Admin - Challenges]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *               - type
 *               - goal
 *               - startDate
 *               - endDate
 *             properties:
 *               name:
 *                 type: string
 *                 example: "30-Day Push-up Challenge"
 *               description:
 *                 type: string
 *                 example: "Complete 1000 push-ups in 30 days"
 *               type:
 *                 type: string
 *                 enum: [exercise_count, calories, duration, workout_count]
 *                 example: "exercise_count"
 *               goal:
 *                 type: object
 *                 properties:
 *                   targetValue:
 *                     type: number
 *                     example: 1000
 *                   exerciseName:
 *                     type: string
 *                     example: "Push-ups"
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               rewards:
 *                 type: object
 *                 properties:
 *                   points:
 *                     type: integer
 *                     example: 300
 *               imageUrl:
 *                 type: string
 *                 example: "https://example.com/challenge.png"
 *     responses:
 *       201:
 *         description: Challenge created successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Admin access required
 */
router.post(
  '/',
  rateLimit({ maxRequests: 10, windowMs: 60 * 60 * 1000 }),
  validateChallengeCreation,
  adminChallengeController.createChallenge
);

// ==================== UPDATE CHALLENGE ====================
/**
 * @swagger
 * /api/admin/challenges/{challengeId}:
 *   put:
 *     summary: Update an existing challenge
 *     tags: [Admin - Challenges]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: challengeId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, completed, cancelled]
 *               goal:
 *                 type: object
 *               rewards:
 *                 type: object
 *     responses:
 *       200:
 *         description: Challenge updated successfully
 *       404:
 *         description: Challenge not found
 *       403:
 *         description: Admin access required
 */
router.put(
  '/:challengeId',
  validateIdParam('challengeId'),
  rateLimit({ maxRequests: 20, windowMs: 60 * 60 * 1000 }),
  adminChallengeController.updateChallenge
);

// ==================== DELETE CHALLENGE ====================
/**
 * @swagger
 * /api/admin/challenges/{challengeId}:
 *   delete:
 *     summary: Delete a challenge
 *     tags: [Admin - Challenges]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: challengeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Challenge deleted successfully
 *       404:
 *         description: Challenge not found
 *       403:
 *         description: Admin access required
 */
router.delete(
  '/:challengeId',
  validateIdParam('challengeId'),
  rateLimit({ maxRequests: 10, windowMs: 60 * 60 * 1000 }),
  adminChallengeController.deleteChallenge
);

// ==================== TOGGLE CHALLENGE STATUS ====================
router.patch(
  '/:challengeId/status',
  validateIdParam('challengeId'),
  adminChallengeController.toggleChallengeStatus
);

// ==================== GET CHALLENGE STATISTICS ====================
router.get(
  '/:challengeId/stats',
  validateIdParam('challengeId'),
  adminChallengeController.getChallengeStats
);

module.exports = router;