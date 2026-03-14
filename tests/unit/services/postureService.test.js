/**
 * tests/unit/services/postureService.test.js — FINAL FIX
 *
 * Root cause:
 * postureService.js does `const db = admin.firestore()` at module load time.
 * That means the service holds a direct reference to the db object returned
 * by the global Firebase mock in tests/setup.js. Calling admin.firestore()
 * again in tests gives you the same object — so we must mock methods on
 * THAT object (admin.firestore()), not replace it.
 *
 * The correct pattern for each test:
 *   const db = admin.firestore();   // same object the service uses
 *   db.collection.mockReturnValueOnce({ ... });
 *
 * Each test uses mockReturnValueOnce() so collection calls are consumed
 * in order and never bleed into the next test.
 */

const admin = require('firebase-admin');

jest.mock('../../../src/services/public/badgeService', () => ({
  checkAndAwardBadges: jest.fn().mockResolvedValue([])
}));

const {
  submitPostureSession,
  getSessionDetails,
  getUserPostureHistory,
  getExerciseHistory,
  getClassifiers
} = require('../../../src/services/public/postureService');

const badgeService = require('../../../src/services/public/badgeService');

// ==================== HELPERS ====================

const makeExercise = (overrides = {}) => ({
  exerciseName: 'pushup',
  classifierId: 'pushup_classifier_v1',
  totalReps: 20,
  sets: 3,
  durationSeconds: 120,
  caloriesBurned: 80,
  avgFormScore: 88.5,
  keypoints: {},
  angles: {},
  corrections: [],
  ...overrides
});

// Builds a mock query chain object for where/orderBy/limit/get patterns
const makeQueryChain = (resolveValue) => ({
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  get: jest.fn().mockResolvedValue(resolveValue)
});

beforeEach(() => jest.clearAllMocks());

// ==================== submitPostureSession ====================
describe('submitPostureSession', () => {
  it('should throw if exercises array is empty', async () => {
    await expect(submitPostureSession('user-001', null, []))
      .rejects.toThrow('No exercises provided');
  });

  it('should save session and return sessionId', async () => {
    const db = admin.firestore();
    const sessionDocRef = { id: 'session-new-001', set: jest.fn().mockResolvedValue(true) };
    const perfDocRef   = { id: 'perf-001', set: jest.fn() };

    db.collection
      .mockReturnValueOnce({ doc: jest.fn().mockReturnValue(sessionDocRef) }) // postureAnalysis
      .mockReturnValueOnce({ doc: jest.fn().mockReturnValue(perfDocRef) });   // exercisePerformance

    db.batch.mockReturnValue({ set: jest.fn(), commit: jest.fn().mockResolvedValue(true) });

    // updateUserFormScore → userProgress doc
    db.collection.mockReturnValueOnce({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockDoc({ totalWorkouts: 5, avgFormScore: 80 }, 'user-001')),
        update: jest.fn().mockResolvedValue(true)
      })
    });

    const result = await submitPostureSession('user-001', null, [makeExercise()]);

    expect(result.exerciseCount).toBe(1);
    expect(result.overallFormScore).toBe(88.5);
    expect(result.sessionId).toBe('session-new-001');
  });

  it('should calculate average form score across multiple exercises', async () => {
    const db = admin.firestore();
    const sessionDocRef = { id: 'session-002', set: jest.fn() };
    const perfDocRef    = { id: 'perf-002', set: jest.fn() };

    db.collection
      .mockReturnValueOnce({ doc: jest.fn().mockReturnValue(sessionDocRef) })
      .mockReturnValueOnce({ doc: jest.fn().mockReturnValue(perfDocRef) })
      .mockReturnValueOnce({ doc: jest.fn().mockReturnValue(perfDocRef) })
      .mockReturnValueOnce({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue(mockDoc({ totalWorkouts: 3, avgFormScore: 75 }, 'user-001')),
          update: jest.fn().mockResolvedValue(true)
        })
      });

    db.batch.mockReturnValue({ set: jest.fn(), commit: jest.fn().mockResolvedValue(true) });

    const result = await submitPostureSession('user-001', null, [
      makeExercise({ avgFormScore: 80 }),
      makeExercise({ exerciseName: 'squat', avgFormScore: 90 })
    ]);

    expect(result.overallFormScore).toBe(85); // (80+90)/2
    expect(result.exerciseCount).toBe(2);
  });

  it('should trigger badge check when form score is 95 or above', async () => {
    const db = admin.firestore();
    const sessionDocRef = { id: 'session-003', set: jest.fn() };
    const perfDocRef    = { id: 'perf-003', set: jest.fn() };

    db.collection
      .mockReturnValueOnce({ doc: jest.fn().mockReturnValue(sessionDocRef) })
      .mockReturnValueOnce({ doc: jest.fn().mockReturnValue(perfDocRef) })
      .mockReturnValueOnce({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue(mockDoc({ totalWorkouts: 1, avgFormScore: 90 }, 'user-001')),
          update: jest.fn().mockResolvedValue(true)
        })
      });

    db.batch.mockReturnValue({ set: jest.fn(), commit: jest.fn().mockResolvedValue(true) });

    await submitPostureSession('user-001', null, [makeExercise({ avgFormScore: 96 })]);

    expect(badgeService.checkAndAwardBadges).toHaveBeenCalledWith('user-001');
  });

  it('should NOT trigger badge check when form score is below 95', async () => {
    const db = admin.firestore();
    const sessionDocRef = { id: 'session-004', set: jest.fn() };
    const perfDocRef    = { id: 'perf-004', set: jest.fn() };

    db.collection
      .mockReturnValueOnce({ doc: jest.fn().mockReturnValue(sessionDocRef) })
      .mockReturnValueOnce({ doc: jest.fn().mockReturnValue(perfDocRef) })
      .mockReturnValueOnce({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue(mockDoc({ totalWorkouts: 1, avgFormScore: 80 }, 'user-001')),
          update: jest.fn().mockResolvedValue(true)
        })
      });

    db.batch.mockReturnValue({ set: jest.fn(), commit: jest.fn().mockResolvedValue(true) });

    await submitPostureSession('user-001', null, [makeExercise({ avgFormScore: 80 })]);

    expect(badgeService.checkAndAwardBadges).not.toHaveBeenCalled();
  });

  it('should save corrections when provided', async () => {
    const db = admin.firestore();
    const batchSet = jest.fn();
    const sessionDocRef = { id: 'session-005', set: jest.fn() };
    const perfDocRef    = { id: 'perf-005', set: jest.fn() };
    const corrDocRef    = { id: 'corr-001', set: jest.fn() };

    db.collection
      .mockReturnValueOnce({ doc: jest.fn().mockReturnValue(sessionDocRef) })    // postureAnalysis
      .mockReturnValueOnce({ doc: jest.fn().mockReturnValue(perfDocRef) })       // exercisePerformance
      .mockReturnValueOnce({ doc: jest.fn().mockReturnValue(corrDocRef) })       // correctionSuggestions
      .mockReturnValueOnce({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue(mockDoc({ totalWorkouts: 1, avgFormScore: 80 }, 'user-001')),
          update: jest.fn().mockResolvedValue(true)
        })
      });

    db.batch.mockReturnValue({ set: batchSet, commit: jest.fn().mockResolvedValue(true) });

    const result = await submitPostureSession('user-001', null, [
      makeExercise({
        corrections: [{ type: 'form', message: 'Keep back straight', severity: 'medium' }]
      })
    ]);

    // session + perf + correction = 3 batch.set calls
    expect(batchSet).toHaveBeenCalledTimes(3);
    expect(result.exercises[0].corrections).toHaveLength(1);
    expect(result.exercises[0].corrections[0].message).toBe('Keep back straight');
  });
});

// ==================== getSessionDetails ====================
// The service calls:
//   1. db.collection('postureAnalysis').doc(sessionId).get()
//   2. db.collection('exercisePerformance').where(...).get()
//   3. db.collection('correctionSuggestions').where(...).get()

describe('getSessionDetails', () => {
  it('should return null when session does not exist', async () => {
    const db = admin.firestore();

    // Service returns early when session doesn't exist — only 1 collection call is made
    db.collection.mockReturnValueOnce({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockDoc(null))
      })
    });

    const result = await getSessionDetails('nonexistent');
    expect(result).toBeNull();
  });

  it('should return session with exercises and corrections', async () => {
    const db = admin.firestore();

    db.collection
      // 1. postureAnalysis → doc get — session exists
      .mockReturnValueOnce({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue(
            mockDoc({ userId: 'user-001', overallFormScore: 88 }, 'session-001')
          )
        })
      })
      // 2. exercisePerformance → where → get
      .mockReturnValueOnce(makeQueryChain(
        mockCollection([
          { data: { exerciseName: 'pushup', avgFormScore: 88 }, id: 'perf-001' }
        ])
      ))
      // 3. correctionSuggestions → where → get
      .mockReturnValueOnce(makeQueryChain(
        mockCollection([
          { data: { exerciseName: 'pushup', message: 'Keep back straight', correctionId: 'corr-001' }, id: 'corr-001' }
        ])
      ));

    const result = await getSessionDetails('session-001');

    expect(result.sessionId).toBe('session-001');
    expect(result.exercises).toHaveLength(1);
    expect(result.exercises[0].corrections).toHaveLength(1);
    expect(result.exercises[0].corrections[0].message).toBe('Keep back straight');
  });
});

// ==================== getClassifiers ====================
// The service calls: db.collection('classifiers').get()  — no .doc(), no .where()

describe('getClassifiers', () => {
  it('should return all classifiers', async () => {
    const db = admin.firestore();

    db.collection.mockReturnValueOnce({
      get: jest.fn().mockResolvedValue(
        mockCollection([
          { data: { exerciseId: 'pushup', modelVersion: '1.0' }, id: 'pushup_classifier_v1' },
          { data: { exerciseId: 'squat',  modelVersion: '1.0' }, id: 'squat_classifier_v1' }
        ])
      )
    });

    const result = await getClassifiers();

    expect(result).toHaveLength(2);
    expect(result[0].classifierId).toBe('pushup_classifier_v1');
    expect(result[1].classifierId).toBe('squat_classifier_v1');
  });

  it('should return empty array when no classifiers exist', async () => {
    const db = admin.firestore();

    db.collection.mockReturnValueOnce({
      get: jest.fn().mockResolvedValue(mockCollection([]))
    });

    const result = await getClassifiers();
    expect(result).toEqual([]);
  });
});

// ==================== getUserPostureHistory ====================
// The service calls:
//   db.collection('postureAnalysis').where().orderBy().limit().get()

describe('getUserPostureHistory', () => {
  it('should return user posture sessions ordered by date', async () => {
    const db = admin.firestore();

    db.collection.mockReturnValueOnce(
      makeQueryChain(mockCollection([
        { data: { userId: 'user-001', overallFormScore: 88 }, id: 'session-001' },
        { data: { userId: 'user-001', overallFormScore: 92 }, id: 'session-002' }
      ]))
    );

    const result = await getUserPostureHistory('user-001', 20);

    expect(result).toHaveLength(2);
    expect(result[0].sessionId).toBe('session-001');
    expect(result[1].sessionId).toBe('session-002');
  });

  it('should return empty array when no sessions exist', async () => {
    const db = admin.firestore();

    db.collection.mockReturnValueOnce(makeQueryChain(mockCollection([])));

    const result = await getUserPostureHistory('user-001');
    expect(result).toEqual([]);
  });
});

// ==================== getExerciseHistory ====================
// The service calls:
//   db.collection('exercisePerformance').where().where().orderBy().limit().get()

describe('getExerciseHistory', () => {
  it('should return exercise-specific history', async () => {
    const db = admin.firestore();

    db.collection.mockReturnValueOnce(
      makeQueryChain(mockCollection([
        { data: { exerciseName: 'pushup', avgFormScore: 88 }, id: 'perf-001' }
      ]))
    );

    const result = await getExerciseHistory('user-001', 'pushup', 20);

    expect(result).toHaveLength(1);
    expect(result[0].performanceId).toBe('perf-001');
    expect(result[0].exerciseName).toBe('pushup');
  });

  it('should return empty array when no history exists', async () => {
    const db = admin.firestore();

    db.collection.mockReturnValueOnce(makeQueryChain(mockCollection([])));

    const result = await getExerciseHistory('user-001', 'squat');
    expect(result).toEqual([]);
  });
});