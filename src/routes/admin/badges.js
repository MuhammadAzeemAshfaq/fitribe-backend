const express = require('express');
const router = express.Router();
const adminBadgeController = require('../../controllers/admin/badgeController');
const { verifyToken, requireAdmin, rateLimit } = require('../../middleware/auth');
const { validateIdParam, sanitizeInput } = require('../../middleware/validation');

/**
 * Admin Badge Routes
 * All routes require admin authentication
 */

// Apply admin middleware to all routes
router.use(verifyToken);
router.use(requireAdmin);
router.use(sanitizeInput);

// ==================== GET ALL BADGES (ADMIN VIEW) ====================
/**
 * @swagger
 * /api/admin/badges:
 *   get:
 *     summary: Get all badges with statistics
 *     tags: [Admin - Badges]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [milestone, streak, social, challenge, performance, all]
 *       - in: query
 *         name: tier
 *         schema:
 *           type: string
 *           enum: [common, uncommon, rare, epic, legendary, all]
 *     responses:
 *       200:
 *         description: List of badges with earned counts
 *       403:
 *         description: Admin access required
 */
router.get('/', adminBadgeController.getAllBadges);

// ==================== GET BADGE DETAILS ====================
router.get(
  '/:badgeId',
  validateIdParam('badgeId'),
  adminBadgeController.getBadgeDetails
);

// ==================== CREATE NEW BADGE ====================
/**
 * @swagger
 * /api/admin/badges:
 *   post:
 *     summary: Create a new badge
 *     tags: [Admin - Badges]
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
 *               - category
 *               - condition
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Century Club"
 *               description:
 *                 type: string
 *                 example: "Complete 100 workouts"
 *               iconUrl:
 *                 type: string
 *                 example: "https://example.com/badge.png"
 *               tier:
 *                 type: string
 *                 enum: [common, uncommon, rare, epic, legendary]
 *                 example: "rare"
 *               category:
 *                 type: string
 *                 enum: [milestone, streak, social, challenge, performance]
 *                 example: "milestone"
 *               points:
 *                 type: integer
 *                 example: 500
 *               condition:
 *                 type: object
 *                 properties:
 *                   type:
 *                     type: string
 *                     enum: [workout_count, total_calories, streak_days, level, total_minutes]
 *                     example: "workout_count"
 *                   value:
 *                     type: number
 *                     example: 100
 *     responses:
 *       201:
 *         description: Badge created successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Admin access required
 */
router.post(
  '/',
  rateLimit({ maxRequests: 10, windowMs: 60 * 60 * 1000 }),
  adminBadgeController.createBadge
);

// ==================== UPDATE BADGE ====================
/**
 * @swagger
 * /api/admin/badges/{badgeId}:
 *   put:
 *     summary: Update an existing badge
 *     tags: [Admin - Badges]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: badgeId
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
 *               iconUrl:
 *                 type: string
 *               tier:
 *                 type: string
 *               points:
 *                 type: integer
 *               condition:
 *                 type: object
 *     responses:
 *       200:
 *         description: Badge updated successfully
 *       404:
 *         description: Badge not found
 *       403:
 *         description: Admin access required
 */
router.put(
  '/:badgeId',
  validateIdParam('badgeId'),
  rateLimit({ maxRequests: 20, windowMs: 60 * 60 * 1000 }),
  adminBadgeController.updateBadge
);

// ==================== DELETE BADGE ====================
/**
 * @swagger
 * /api/admin/badges/{badgeId}:
 *   delete:
 *     summary: Delete a badge
 *     tags: [Admin - Badges]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: badgeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Badge deleted successfully
 *       404:
 *         description: Badge not found
 *       400:
 *         description: Cannot delete badge that users have earned
 *       403:
 *         description: Admin access required
 */
router.delete(
  '/:badgeId',
  validateIdParam('badgeId'),
  rateLimit({ maxRequests: 10, windowMs: 60 * 60 * 1000 }),
  adminBadgeController.deleteBadge
);

// ==================== GET BADGE STATISTICS ====================
router.get(
  '/:badgeId/stats',
  validateIdParam('badgeId'),
  adminBadgeController.getBadgeStats
);

// ==================== GET USERS WHO EARNED BADGE ====================
router.get(
  '/:badgeId/users',
  validateIdParam('badgeId'),
  adminBadgeController.getUsersWithBadge
);

module.exports = router;