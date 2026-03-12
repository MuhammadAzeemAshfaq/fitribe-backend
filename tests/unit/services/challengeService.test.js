const admin = require('firebase-admin');
const db = admin.firestore();

const {
  getActiveChallenges,
  getChallengeDetails,
  getChallengeLeaderboard,
  joinChallenge,
  leaveChallenge,
  getUserChallenges,
  updateChallengeProgress
} = require('../../../src/services/public/challengeService');

// ==================== getActiveChallenges ====================
describe('getActiveChallenges', () => {
  it('should return list of active challenges', async () => {
    db.collection.mockReturnThis();
    db.where.mockReturnThis();
    db.orderBy.mockReturnThis();
    db.get.mockResolvedValue(mockCollection([
      { id: 'c1', data: { name: 'Push Up Challenge', status: 'active', startDate: { toDate: () => new Date() }, endDate: { toDate: () => new Date() }, createdAt: { toDate: () => new Date() } } },
      { id: 'c2', data: { name: 'Weekly Warrior', status: 'active', startDate: { toDate: () => new Date() }, endDate: { toDate: () => new Date() }, createdAt: { toDate: () => new Date() } } }
    ]));

    const result = await getActiveChallenges();
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('c1');
  });

  it('should return empty array when no active challenges', async () => {
    db.collection.mockReturnThis();
    db.where.mockReturnThis();
    db.orderBy.mockReturnThis();
    db.get.mockResolvedValue(mockCollection([]));

    const result = await getActiveChallenges();
    expect(result).toEqual([]);
  });
});

// ==================== getChallengeDetails ====================
describe('getChallengeDetails', () => {
  it('should return challenge details when challenge exists', async () => {
    db.collection.mockReturnThis();
    db.doc.mockReturnThis();
    db.get
      .mockResolvedValueOnce(mockDoc({
        name: 'Push Up Challenge',
        status: 'active',
        startDate: { toDate: () => new Date() },
        endDate: { toDate: () => new Date() },
        createdAt: { toDate: () => new Date() }
      }, 'c1'))
      .mockResolvedValueOnce(mockCollection([])); // leaderboard participants

    const result = await getChallengeDetails('c1', false);
    expect(result).toBeDefined();
    expect(result.challenge.id).toBe('c1');
  });

  it('should return null when challenge does not exist', async () => {
    db.collection.mockReturnThis();
    db.doc.mockReturnThis();
    db.get.mockResolvedValue(mockDoc(null));

    const result = await getChallengeDetails('nonexistent');
    expect(result).toBeNull();
  });
});

// ==================== getChallengeLeaderboard ====================
describe('getChallengeLeaderboard', () => {
  it('should return leaderboard with user details', async () => {
    // participants query then user doc fetches
    db.collection.mockReturnThis();
    db.where.mockReturnThis();
    db.orderBy.mockReturnThis();
    db.limit.mockReturnThis();
    db.doc.mockReturnThis();

    db.get
      // participants snapshot
      .mockResolvedValueOnce(mockCollection([
        { id: 'p1', data: { userId: 'u1', progress: 80, status: 'in_progress', completedAt: null, createdAt: { toDate: () => new Date() } } },
        { id: 'p2', data: { userId: 'u2', progress: 60, status: 'in_progress', completedAt: null, createdAt: { toDate: () => new Date() } } }
      ]))
      // user doc for u1
      .mockResolvedValueOnce(mockDoc({ name: 'Alice', profilePicUrl: '' }, 'u1'))
      // user doc for u2
      .mockResolvedValueOnce(mockDoc({ name: 'Bob', profilePicUrl: '' }, 'u2'));

    const result = await getChallengeLeaderboard('c1', 10);
    expect(result).toHaveLength(2);
    expect(result[0].userId).toBe('u1');
    expect(result[0].rank).toBe(1);
    expect(result[1].rank).toBe(2);
  });

  it('should return empty array when no participants', async () => {
    db.collection.mockReturnThis();
    db.where.mockReturnThis();
    db.orderBy.mockReturnThis();
    db.limit.mockReturnThis();
    db.get.mockResolvedValue(mockCollection([]));

    const result = await getChallengeLeaderboard('c1');
    expect(result).toEqual([]);
  });

  it('should handle user doc not existing', async () => {
    db.collection.mockReturnThis();
    db.where.mockReturnThis();
    db.orderBy.mockReturnThis();
    db.limit.mockReturnThis();
    db.doc.mockReturnThis();

    db.get
      .mockResolvedValueOnce(mockCollection([
        { id: 'p1', data: { userId: 'u1', progress: 50, status: 'in_progress', completedAt: null, createdAt: null } }
      ]))
      .mockResolvedValueOnce(mockDoc(null)); // user doesn't exist

    const result = await getChallengeLeaderboard('c1');
    expect(result[0].userName).toBe('Unknown');
  });
});

// ==================== joinChallenge ====================
describe('joinChallenge', () => {
  it('should throw when challenge does not exist', async () => {
    db.collection.mockReturnThis();
    db.doc.mockReturnThis();
    db.runTransaction.mockImplementation(async (fn) => {
      return fn({
        get: jest.fn().mockResolvedValue(mockDoc(null)),
        set: jest.fn(),
        update: jest.fn()
      });
    });

    await expect(joinChallenge('user-123', 'bad-challenge'))
      .rejects.toThrow('Challenge not found');
  });

  it('should throw when challenge is not active', async () => {
    db.runTransaction.mockImplementation(async (fn) => {
      return fn({
        get: jest.fn().mockResolvedValue(mockDoc({ status: 'completed', participantCount: 5 }, 'c1')),
        set: jest.fn(),
        update: jest.fn()
      });
    });

    await expect(joinChallenge('user-123', 'c1'))
      .rejects.toThrow('Challenge is not active');
  });

  it('should throw when user is already participating', async () => {
    db.runTransaction.mockImplementation(async (fn) => {
      const getMock = jest.fn()
        .mockResolvedValueOnce(mockDoc({ status: 'active', participantCount: 3 }, 'c1'))
        .mockResolvedValueOnce(mockDoc({ status: 'in_progress', progress: 50 }, 'p1'));
      return fn({ get: getMock, set: jest.fn(), update: jest.fn() });
    });

    await expect(joinChallenge('user-123', 'c1'))
      .rejects.toThrow('Already participating in this challenge');
  });

  it('should throw when user already completed the challenge', async () => {
    db.runTransaction.mockImplementation(async (fn) => {
      const getMock = jest.fn()
        .mockResolvedValueOnce(mockDoc({ status: 'active', participantCount: 3 }, 'c1'))
        .mockResolvedValueOnce(mockDoc({ status: 'completed', progress: 100 }, 'p1'));
      return fn({ get: getMock, set: jest.fn(), update: jest.fn() });
    });

    await expect(joinChallenge('user-123', 'c1'))
      .rejects.toThrow('You already completed this challenge');
  });

  it('should rejoin when user previously abandoned', async () => {
    const mockUpdate = jest.fn();
    db.runTransaction.mockImplementation(async (fn) => {
      const getMock = jest.fn()
        .mockResolvedValueOnce(mockDoc({ status: 'active', participantCount: 3 }, 'c1'))
        .mockResolvedValueOnce(mockDoc({ status: 'abandoned', progress: 0 }, 'p1'));
      return fn({ get: getMock, set: jest.fn(), update: mockUpdate });
    });

    const result = await joinChallenge('user-123', 'c1');
    expect(result.rejoined).toBe(true);
  });

  it('should create new participant when joining fresh', async () => {
    const mockSet = jest.fn();
    const mockUpdate = jest.fn();
    db.runTransaction.mockImplementation(async (fn) => {
      const getMock = jest.fn()
        .mockResolvedValueOnce(mockDoc({ status: 'active', participantCount: 3 }, 'c1'))
        .mockResolvedValueOnce(mockDoc(null)); // no existing participant
      return fn({ get: getMock, set: mockSet, update: mockUpdate });
    });

    const result = await joinChallenge('user-123', 'c1');
    expect(result.joined).toBe(true);
    expect(mockSet).toHaveBeenCalled();
  });
});

// ==================== leaveChallenge ====================
describe('leaveChallenge', () => {
  it('should throw when participant does not exist', async () => {
    db.runTransaction.mockImplementation(async (fn) => {
      return fn({
        get: jest.fn().mockResolvedValue(mockDoc(null)),
        update: jest.fn()
      });
    });

    await expect(leaveChallenge('user-123', 'c1'))
      .rejects.toThrow('Challenge not joined');
  });

  it('should throw when challenge already abandoned', async () => {
    db.runTransaction.mockImplementation(async (fn) => {
      return fn({
        get: jest.fn().mockResolvedValue(mockDoc({ status: 'abandoned' }, 'p1')),
        update: jest.fn()
      });
    });

    await expect(leaveChallenge('user-123', 'c1'))
      .rejects.toThrow('Challenge not joined');
  });

  it('should throw when challenge already completed', async () => {
    db.runTransaction.mockImplementation(async (fn) => {
      return fn({
        get: jest.fn().mockResolvedValue(mockDoc({ status: 'completed' }, 'p1')),
        update: jest.fn()
      });
    });

    await expect(leaveChallenge('user-123', 'c1'))
      .rejects.toThrow('Cannot leave a completed challenge');
  });

  it('should successfully leave an in_progress challenge', async () => {
    const mockUpdate = jest.fn();
    db.runTransaction.mockImplementation(async (fn) => {
      return fn({
        get: jest.fn().mockResolvedValue(mockDoc({ status: 'in_progress' }, 'p1')),
        update: mockUpdate
      });
    });

    const result = await leaveChallenge('user-123', 'c1');
    expect(result.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalled();
  });
});

// ==================== getUserChallenges ====================
describe('getUserChallenges', () => {
  it('should return user challenges with challenge details', async () => {
    db.collection.mockReturnThis();
    db.where.mockReturnThis();
    db.orderBy.mockReturnThis();
    db.doc.mockReturnThis();

    db.get
      // participants snapshot
      .mockResolvedValueOnce(mockCollection([
        { id: 'p1', data: { userId: 'u1', challengeId: 'c1', progress: 50, status: 'in_progress', rank: 1, createdAt: { toDate: () => new Date() }, completedAt: null } }
      ]))
      // challenge doc
      .mockResolvedValueOnce(mockDoc({
        name: 'Push Up Challenge',
        status: 'active',
        startDate: { toDate: () => new Date() },
        endDate: { toDate: () => new Date() },
        createdAt: { toDate: () => new Date() }
      }, 'c1'));

    const result = await getUserChallenges('u1');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('c1');
    expect(result[0].userProgress).toBe(50);
  });

  it('should filter by status when provided', async () => {
    db.collection.mockReturnThis();
    db.where.mockReturnThis();
    db.orderBy.mockReturnThis();
    db.get.mockResolvedValueOnce(mockCollection([]));

    const result = await getUserChallenges('u1', 'completed');
    expect(result).toEqual([]);
  });

  it('should filter out null results when challenge doc does not exist', async () => {
    db.collection.mockReturnThis();
    db.where.mockReturnThis();
    db.orderBy.mockReturnThis();
    db.doc.mockReturnThis();

    db.get
      .mockResolvedValueOnce(mockCollection([
        { id: 'p1', data: { userId: 'u1', challengeId: 'deleted-c', progress: 0, status: 'in_progress', rank: null, createdAt: null, completedAt: null } }
      ]))
      .mockResolvedValueOnce(mockDoc(null)); // challenge was deleted

    const result = await getUserChallenges('u1');
    expect(result).toEqual([]);
  });
});

// ==================== updateChallengeProgress ====================
describe('updateChallengeProgress', () => {
  const makeParticipantDoc = (challengeId, progress) => ({
    id: `u1_${challengeId}`,
    data: () => ({ userId: 'u1', challengeId, progress, status: 'in_progress' }),
    ref: { update: jest.fn().mockResolvedValue(true) }
  });

  beforeEach(() => {
    db.collection.mockReturnThis();
    db.where.mockReturnThis();
    db.doc.mockReturnThis();
  });

  it('should increment progress for workout_count challenge', async () => {
    const participantDoc = makeParticipantDoc('c1', 0);
    db.get
      .mockResolvedValueOnce({ docs: [participantDoc] })
      .mockResolvedValueOnce(mockDoc({ type: 'workout_count', goal: { targetValue: 10 }, name: 'Test', rewards: { points: 100 } }, 'c1'));

    const exercises = [{ exerciseName: 'Push Up', caloriesBurned: 80, totalReps: 10 }];
    await updateChallengeProgress('u1', exercises);

    expect(participantDoc.ref.update).toHaveBeenCalledWith(
      expect.objectContaining({ progress: 1, status: 'in_progress' })
    );
  });

  it('should increment progress for calories challenge', async () => {
    const participantDoc = makeParticipantDoc('c1', 0);
    db.get
      .mockResolvedValueOnce({ docs: [participantDoc] })
      .mockResolvedValueOnce(mockDoc({ type: 'calories', goal: { targetValue: 1000 }, name: 'Calorie Burn', rewards: null }, 'c1'));

    const exercises = [
      { exerciseName: 'Run', caloriesBurned: 300 },
      { exerciseName: 'Squat', caloriesBurned: 200 }
    ];
    await updateChallengeProgress('u1', exercises);

    expect(participantDoc.ref.update).toHaveBeenCalledWith(
      expect.objectContaining({ progress: 500 })
    );
  });

  it('should increment progress for exercise_count challenge', async () => {
    const participantDoc = makeParticipantDoc('c1', 0);
    db.get
      .mockResolvedValueOnce({ docs: [participantDoc] })
      .mockResolvedValueOnce(mockDoc({ type: 'exercise_count', goal: { targetValue: 100, exerciseName: 'Push Up' }, name: 'Push Up', rewards: null }, 'c1'));

    const exercises = [{ exerciseName: 'Push Up', totalReps: 20 }];
    await updateChallengeProgress('u1', exercises);

    expect(participantDoc.ref.update).toHaveBeenCalledWith(
      expect.objectContaining({ progress: 20 })
    );
  });

  it('should mark challenge as completed when target is reached', async () => {
    const participantDoc = makeParticipantDoc('c1', 9);
    db.get
      .mockResolvedValueOnce({ docs: [participantDoc] })
      .mockResolvedValueOnce(mockDoc({ type: 'workout_count', goal: { targetValue: 10 }, name: 'Test', rewards: { points: 100 } }, 'c1'));

    db.update = jest.fn().mockResolvedValue(true);

    const exercises = [{ exerciseName: 'Push Up', caloriesBurned: 80 }];
    await updateChallengeProgress('u1', exercises);

    expect(participantDoc.ref.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'completed' })
    );
  });

  it('should skip when challenge doc does not exist', async () => {
    const participantDoc = makeParticipantDoc('c1', 0);
    db.get
      .mockResolvedValueOnce({ docs: [participantDoc] })
      .mockResolvedValueOnce(mockDoc(null)); // challenge deleted

    await expect(updateChallengeProgress('u1', [])).resolves.not.toThrow();
    expect(participantDoc.ref.update).not.toHaveBeenCalled();
  });

  it('should not update when progressIncrement is 0', async () => {
    const participantDoc = makeParticipantDoc('c1', 5);
    db.get
      .mockResolvedValueOnce({ docs: [participantDoc] })
      .mockResolvedValueOnce(mockDoc({ type: 'duration', goal: { targetValue: 100, exerciseName: 'Run' }, name: 'Run', rewards: null }, 'c1'));

    // exercises don't match the goal exerciseName
    const exercises = [{ exerciseName: 'Push Up', durationSeconds: 60 }];
    await updateChallengeProgress('u1', exercises);

    expect(participantDoc.ref.update).not.toHaveBeenCalled();
  });
});