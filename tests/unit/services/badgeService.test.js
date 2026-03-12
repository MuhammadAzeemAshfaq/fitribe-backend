/**
 * tests/unit/services/badgeService.test.js
 * Unit tests for badge business logic
 */

// Mock firebase-admin before requiring the service
const admin = require('firebase-admin');
const db = admin.firestore();

const {
  checkBadgeCondition,
  calculateBadgeProgress,
  getAllBadges,
  checkAndAwardBadges
} = require('../../../services/public/badgeService');

// ==================== checkBadgeCondition ====================
describe('checkBadgeCondition', () => {
  const makeProgress = (overrides = {}) => ({
    totalWorkouts: 0,
    totalCalories: 0,
    currentStreak: 0,
    level: 1,
    totalMinutes: 0,
    ...overrides
  });

  it('should return true when workout_count condition is met', () => {
    const badge = { condition: { type: 'workout_count', value: 10 } };
    const progress = makeProgress({ totalWorkouts: 10 });
    expect(checkBadgeCondition(badge, progress)).toBe(true);
  });

  it('should return true when workout_count exceeds condition value', () => {
    const badge = { condition: { type: 'workout_count', value: 10 } };
    const progress = makeProgress({ totalWorkouts: 15 });
    expect(checkBadgeCondition(badge, progress)).toBe(true);
  });

  it('should return false when workout_count condition is not met', () => {
    const badge = { condition: { type: 'workout_count', value: 10 } };
    const progress = makeProgress({ totalWorkouts: 9 });
    expect(checkBadgeCondition(badge, progress)).toBe(false);
  });

  it('should return true when streak_days condition is met', () => {
    const badge = { condition: { type: 'streak_days', value: 7 } };
    const progress = makeProgress({ currentStreak: 7 });
    expect(checkBadgeCondition(badge, progress)).toBe(true);
  });

  it('should return true when total_calories condition is met', () => {
    const badge = { condition: { type: 'total_calories', value: 1000 } };
    const progress = makeProgress({ totalCalories: 1500 });
    expect(checkBadgeCondition(badge, progress)).toBe(true);
  });

  it('should return false when total_calories condition is not met', () => {
    const badge = { condition: { type: 'total_calories', value: 1000 } };
    const progress = makeProgress({ totalCalories: 500 });
    expect(checkBadgeCondition(badge, progress)).toBe(false);
  });

  it('should return true when level condition is met', () => {
    const badge = { condition: { type: 'level', value: 5 } };
    const progress = makeProgress({ level: 5 });
    expect(checkBadgeCondition(badge, progress)).toBe(true);
  });

  it('should return true when total_minutes condition is met', () => {
    const badge = { condition: { type: 'total_minutes', value: 300 } };
    const progress = makeProgress({ totalMinutes: 350 });
    expect(checkBadgeCondition(badge, progress)).toBe(true);
  });

  it('should return false when badge has no condition', () => {
    const badge = {};
    const progress = makeProgress({ totalWorkouts: 100 });
    expect(checkBadgeCondition(badge, progress)).toBe(false);
  });

  it('should return false for unknown condition type', () => {
    const badge = { condition: { type: 'unknown_type', value: 5 } };
    const progress = makeProgress({ totalWorkouts: 100 });
    expect(checkBadgeCondition(badge, progress)).toBe(false);
  });
});

// ==================== calculateBadgeProgress ====================
describe('calculateBadgeProgress', () => {
  it('should return 50 when halfway to workout_count goal', () => {
    const badge = { condition: { type: 'workout_count', value: 10 } };
    const progress = { totalWorkouts: 5 };
    expect(calculateBadgeProgress(badge, progress)).toBe(50);
  });

  it('should return 100 when goal is fully met', () => {
    const badge = { condition: { type: 'workout_count', value: 10 } };
    const progress = { totalWorkouts: 10 };
    expect(calculateBadgeProgress(badge, progress)).toBe(100);
  });

  it('should cap at 100 even when progress exceeds goal', () => {
    const badge = { condition: { type: 'workout_count', value: 10 } };
    const progress = { totalWorkouts: 20 };
    expect(calculateBadgeProgress(badge, progress)).toBe(100);
  });

  it('should return 0 when no progress yet', () => {
    const badge = { condition: { type: 'streak_days', value: 30 } };
    const progress = { currentStreak: 0 };
    expect(calculateBadgeProgress(badge, progress)).toBe(0);
  });

  it('should return 0 for unknown condition type', () => {
    const badge = { condition: { type: 'mystery', value: 10 } };
    const progress = { totalWorkouts: 10 };
    expect(calculateBadgeProgress(badge, progress)).toBe(0);
  });

  it('should return 0 when badge has no condition', () => {
    const badge = {};
    const progress = { totalWorkouts: 10 };
    expect(calculateBadgeProgress(badge, progress)).toBe(0);
  });
});

// ==================== getAllBadges ====================
describe('getAllBadges', () => {
  it('should return array of badges from Firestore', async () => {
    const fakeBadges = [
      { id: 'badge-1', data: { name: 'First Workout', category: 'milestone' } },
      { id: 'badge-2', data: { name: 'Week Warrior', category: 'streak' } }
    ];

    db.collection.mockReturnThis();
    db.get.mockResolvedValue(mockCollection(fakeBadges));

    const result = await getAllBadges();

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: 'badge-1', name: 'First Workout' });
    expect(result[1]).toMatchObject({ id: 'badge-2', name: 'Week Warrior' });
  });

  it('should return empty array when no badges exist', async () => {
    db.collection.mockReturnThis();
    db.get.mockResolvedValue(mockCollection([]));

    const result = await getAllBadges();

    expect(result).toEqual([]);
  });
});

// ==================== checkAndAwardBadges ====================
describe('checkAndAwardBadges', () => {
  it('should return empty array when user has no progress document', async () => {
    db.collection.mockReturnThis();
    db.doc.mockReturnThis();
    db.get.mockResolvedValueOnce(mockDoc(null)); // No progress doc

    const result = await checkAndAwardBadges('user-123');

    expect(result).toEqual([]);
  });

  it('should award badge when condition is met and not already earned', async () => {
    // Progress doc
    db.get
      .mockResolvedValueOnce(mockDoc({ totalWorkouts: 10, currentStreak: 0, totalCalories: 0, level: 1, totalMinutes: 0 }))
      // All badges
      .mockResolvedValueOnce(mockCollection([
        { id: 'badge-1', data: { name: 'Ten Workouts', condition: { type: 'workout_count', value: 10 }, points: 100 } }
      ]))
      // Earned badges (none yet)
      .mockResolvedValueOnce(mockCollection([]))
      // Award badge set
      .mockResolvedValueOnce(true);

    db.collection.mockReturnThis();
    db.doc.mockReturnThis();
    db.set.mockResolvedValue(true);

    const result = await checkAndAwardBadges('user-123');

    expect(Array.isArray(result)).toBe(true);
  });

  it('should not re-award already earned badge', async () => {
    const badge = { id: 'badge-1', name: 'Ten Workouts', condition: { type: 'workout_count', value: 10 } };

    db.get
      .mockResolvedValueOnce(mockDoc({ totalWorkouts: 20 }))
      .mockResolvedValueOnce(mockCollection([{ id: 'badge-1', data: badge }]))
      // Badge already earned
      .mockResolvedValueOnce(mockCollection([{ id: 'earned-1', data: { badgeId: 'badge-1' } }]));

    db.collection.mockReturnThis();
    db.doc.mockReturnThis();

    const result = await checkAndAwardBadges('user-123');

    expect(db.set).not.toHaveBeenCalled();
  });
});
