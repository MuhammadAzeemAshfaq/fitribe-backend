/**
 * tests/unit/services/progressService.test.js
 */

jest.mock('../../../src/services/public/socialService', () => ({
  logActivity: jest.fn().mockResolvedValue(true)
}));

jest.mock('../../../src/services/public/challengeService', () => ({
  updateChallengeProgress: jest.fn().mockResolvedValue(true)
}));

jest.mock('../../../src/services/public/badgeService', () => ({
  checkAndAwardBadges: jest.fn().mockResolvedValue([])
}));

const admin = require('firebase-admin');
const db = admin.firestore();
const badgeService = require('../../../src/services/public/badgeService');

const {
  recordWorkoutSession,
  getUserProgress,
  getWorkoutStatistics
} = require('../../../src/services/public/progressService');

// Supports where/orderBy/limit/get chains
const makeWhereChain = (snap) => ({
  where:   jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit:   jest.fn().mockReturnThis(),
  get:     jest.fn().mockResolvedValue(snap)
});

beforeEach(() => jest.clearAllMocks());

// ==================== recordWorkoutSession ====================
describe('recordWorkoutSession', () => {
  it('should create a session and initialise progress for a new user', async () => {
    const addMock    = jest.fn().mockResolvedValue({ id: 'session-001' });
    const progressRef = { id: 'user-001', get: jest.fn().mockResolvedValue(mockDoc(null)), set: jest.fn().mockResolvedValue(true) };
    const streakRef   = { set: jest.fn().mockResolvedValue(true) };

    db.collection.mockImplementation(col => {
      if (col === 'workoutSessions') return { add: addMock };
      if (col === 'userProgress')    return { doc: jest.fn().mockReturnValue(progressRef) };
      if (col === 'workoutStreaks')   return { doc: jest.fn().mockReturnValue(streakRef) };
      return { doc: jest.fn().mockReturnValue({ get: jest.fn(), set: jest.fn() }) };
    });

    const result = await recordWorkoutSession({
      userId: 'user-001',
      workoutPlanId: 'plan-001',
      exercises: [{ exerciseName: 'pushup', caloriesBurned: 50 }],
      durationMinutes: 30
    });

    expect(result.sessionId).toBe('session-001');
    expect(result.totalCalories).toBe(50);
    expect(progressRef.set).toHaveBeenCalled();
    expect(streakRef.set).toHaveBeenCalled();
  });

  it('should update existing progress for a returning user', async () => {
    const addMock = jest.fn().mockResolvedValue({ id: 'session-002' });
    const existingData = {
      totalWorkouts: 5, totalCalories: 500, totalMinutes: 150,
      currentStreak: 3, longestStreak: 5, experiencePoints: 200,
      lastWorkoutDate: { toDate: () => new Date(Date.now() - 86400000) } // yesterday
    };
    const progressRef = { id: 'user-001', get: jest.fn().mockResolvedValue(mockDoc(existingData, 'user-001')), update: jest.fn().mockResolvedValue(true) };
    const streakRef   = { update: jest.fn().mockResolvedValue(true) };

    db.collection.mockImplementation(col => {
      if (col === 'workoutSessions') return { add: addMock };
      if (col === 'userProgress')    return { doc: jest.fn().mockReturnValue(progressRef) };
      if (col === 'workoutStreaks')   return { doc: jest.fn().mockReturnValue(streakRef) };
      return { doc: jest.fn().mockReturnValue({ get: jest.fn(), set: jest.fn() }) };
    });

    const result = await recordWorkoutSession({
      userId: 'user-001', workoutPlanId: null,
      exercises: [{ exerciseName: 'squat', caloriesBurned: 80 }],
      durationMinutes: 45
    });

    expect(result.sessionId).toBe('session-002');
    expect(progressRef.update).toHaveBeenCalled();
    expect(streakRef.update).toHaveBeenCalled();
  });

  it('should call checkAndAwardBadges', async () => {
    const progressRef = { id: 'u1', get: jest.fn().mockResolvedValue(mockDoc(null)), set: jest.fn().mockResolvedValue(true) };
    const streakRef   = { set: jest.fn().mockResolvedValue(true) };

    db.collection.mockImplementation(col => {
      if (col === 'workoutSessions') return { add: jest.fn().mockResolvedValue({ id: 's1' }) };
      if (col === 'userProgress')    return { doc: jest.fn().mockReturnValue(progressRef) };
      if (col === 'workoutStreaks')   return { doc: jest.fn().mockReturnValue(streakRef) };
      return { doc: jest.fn().mockReturnValue({ get: jest.fn(), set: jest.fn() }) };
    });

    await recordWorkoutSession({ userId: 'user-001', exercises: [{ caloriesBurned: 100 }], durationMinutes: 20 });

    expect(badgeService.checkAndAwardBadges).toHaveBeenCalledWith('user-001');
  });
});

// ==================== getUserProgress ====================
describe('getUserProgress', () => {
  it('should return null when no progress document exists', async () => {
    db.collection.mockImplementation(() => makeWhereChain(mockCollection([])));

    const result = await getUserProgress('user-001', 'week');
    expect(result).toBeNull();
  });

  it('should return progress and workout history for all-time period', async () => {
    const progressData = { userId: 'user-001', totalWorkouts: 10, lastWorkoutDate: { toDate: () => new Date() } };
    const sessionData  = { userId: 'user-001', durationMinutes: 30, createdAt: { toDate: () => new Date() } };

    let callCount = 0;
    db.collection.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeWhereChain(mockCollection([{ data: progressData, id: 'u1' }]));
      return makeWhereChain(mockCollection([{ data: sessionData, id: 's1' }]));
    });

    const result = await getUserProgress('user-001', 'all');

    expect(result).not.toBeNull();
    expect(result.progress.totalWorkouts).toBe(10);
    expect(result.workoutHistory).toHaveLength(1);
  });

  it('should filter by week period', async () => {
    const progressData = { userId: 'user-001', totalWorkouts: 3, lastWorkoutDate: null };
    let callCount = 0;
    db.collection.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeWhereChain(mockCollection([{ data: progressData, id: 'u1' }]));
      return makeWhereChain(mockCollection([]));
    });

    const result = await getUserProgress('user-001', 'week');
    expect(result.workoutHistory).toHaveLength(0);
  });
});

// ==================== getWorkoutStatistics ====================
describe('getWorkoutStatistics', () => {
  it('should return aggregated stats for the period', async () => {
    const snap = {
      docs: [
        { data: () => ({ totalCalories: 300, durationMinutes: 45, overallFormScore: 88, exercises: [{ exerciseName: 'pushup' }] }) },
        { data: () => ({ totalCalories: 200, durationMinutes: 30, overallFormScore: 92, exercises: [] }) }
      ]
    };
    db.collection.mockImplementation(() => makeWhereChain(snap));

    const result = await getWorkoutStatistics('user-001', 'week');

    expect(result.totalWorkouts).toBe(2);
    expect(result.totalCalories).toBe(500);
    expect(result.totalMinutes).toBe(75);
  });

  it('should return zeroed stats when no sessions in period', async () => {
    db.collection.mockImplementation(() => makeWhereChain({ docs: [] }));

    const result = await getWorkoutStatistics('user-001', 'month');

    expect(result.totalWorkouts).toBe(0);
    expect(result.totalCalories).toBe(0);
  });
});
