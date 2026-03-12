/**
 * tests/unit/services/progressService.test.js
 * Unit tests for progress tracking business logic
 */

const admin = require('firebase-admin');
const db = admin.firestore();

// We mock the sub-services that progressService depends on
jest.mock('../../../src/services/public/challengeService', () => ({
  updateChallengeProgress: jest.fn().mockResolvedValue(true)
}));

jest.mock('../../../src/services/public/badgeService', () => ({
  checkAndAwardBadges: jest.fn().mockResolvedValue([])
}));

const {
  recordWorkoutSession,
  getUserProgress,
  getWorkoutStats
} = require('../../../src/services/public/progressService');

// ==================== recordWorkoutSession ====================
describe('recordWorkoutSession', () => {
  const validInput = {
    userId: 'user-123',
    workoutPlanId: 'plan-abc',
    exercises: [
      { exerciseName: 'Push Up', caloriesBurned: 80, totalReps: 20, avgFormScore: 0.85 },
      { exerciseName: 'Squat', caloriesBurned: 120, totalReps: 15, avgFormScore: 0.9 }
    ],
    durationMinutes: 30
  };

  beforeEach(() => {
    // Mock session creation
    db.collection.mockReturnThis();
    db.doc.mockReturnThis();
    db.add.mockResolvedValue({ id: 'session-new-123' });
    db.get.mockResolvedValue(mockDoc(null)); // No existing progress
    db.set.mockResolvedValue(true);
    db.update.mockResolvedValue(true);
  });

  it('should create a workout session and return sessionId', async () => {
    const result = await recordWorkoutSession(validInput);

    expect(db.add).toHaveBeenCalled();
    expect(result).toMatchObject({
      sessionId: 'session-new-123',
      totalCalories: expect.any(Number),
    });
  });

  it('should calculate totalCalories from exercises', async () => {
    const result = await recordWorkoutSession(validInput);
    // 80 + 120 = 200
    expect(result.totalCalories).toBe(200);
  });

  it('should work without a workoutPlanId', async () => {
    const input = { ...validInput, workoutPlanId: undefined };
    const result = await recordWorkoutSession(input);
    expect(result.sessionId).toBeDefined();
  });

  it('should call challengeService.updateChallengeProgress', async () => {
    const challengeService = require('../../../src/services/public/challengeService');
    await recordWorkoutSession(validInput);
    expect(challengeService.updateChallengeProgress).toHaveBeenCalledWith(
      'user-123',
      validInput.exercises
    );
  });

  it('should call badgeService.checkAndAwardBadges', async () => {
    const badgeService = require('../../../src/services/public/badgeService');
    await recordWorkoutSession(validInput);
    expect(badgeService.checkAndAwardBadges).toHaveBeenCalledWith('user-123');
  });
});

// ==================== getUserProgress ====================
describe('getUserProgress', () => {
  it('should return progress data when user exists', async () => {
    const fakeProgress = { userId: 'user-123', totalWorkouts: 25 };

    db.collection.mockReturnThis();
    db.where.mockReturnThis();
    db.limit.mockReturnThis();
    db.get
      .mockResolvedValueOnce(mockCollection([{ id: 'user-123', data: fakeProgress }])) // collection!
      .mockResolvedValueOnce(mockCollection([])); // workout history

    const result = await getUserProgress('user-123', 'all');
    expect(result).toBeDefined();
  });

  it('should return null when user progress does not exist', async () => {
    db.collection.mockReturnThis();
    db.where.mockReturnThis();
    db.limit.mockReturnThis();
    db.get.mockResolvedValue(mockCollection([])); // empty collection

    const result = await getUserProgress('nonexistent', 'all');
    expect(result).toBeNull();
  });
});
