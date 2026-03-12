/**
 * Unit Tests - workoutPlanService.js
 */

jest.mock('firebase-admin', () => {
  const mockGet = jest.fn();
  const mockWhere = jest.fn();

  mockWhere.mockReturnValue({ where: mockWhere, get: mockGet });

  const mockCollection = jest.fn(() => ({
    doc: jest.fn(() => ({ get: mockGet })),
    where: mockWhere,
    get: mockGet
  }));

  return {
    firestore: Object.assign(
      jest.fn(() => ({ collection: mockCollection })),
      {
        FieldValue: { serverTimestamp: jest.fn(() => 'mock-timestamp') }
      }
    ),
    __mockGet: mockGet,
    __mockCollection: mockCollection
  };
});

const admin = require('firebase-admin');
const workoutPlanService = require('../../../src/services/public/workoutplanService');

function makePlanDoc(id, data, exists = true) {
  return {
    id,
    exists,
    data: () => data
  };
}

function makeSnap(docs) {
  return { docs, size: docs.length, empty: docs.length === 0 };
}

beforeEach(() => jest.clearAllMocks());
afterAll(() => jest.restoreAllMocks());

// ==================== GET ALL WORKOUT PLANS ====================
describe('getAllWorkoutPlans', () => {

  it('returns list of plans without exercises array', async () => {
    const db = admin.firestore();

    const snap = makeSnap([
      makePlanDoc('plan_001', {
        name: 'Cardio Core Blast',
        category: 'Core',
        description: 'Cardio and core workout',
        difficulty: 'Hard',
        durationMinutes: 35,
        goal: 'Fat Loss & Core',
        equipmentRequired: false,
        aiModelIntegrated: false,
        exercises: [{ name: 'Burpee', sets: 3 }, { name: 'Plank', sets: 3 }]
      }),
      makePlanDoc('plan_002', {
        name: 'Upper Body Strength',
        category: 'Strength',
        description: 'Upper body workout',
        difficulty: 'Medium',
        durationMinutes: 40,
        goal: 'Muscle Gain',
        equipmentRequired: true,
        aiModelIntegrated: false,
        exercises: [{ name: 'Push-Up', sets: 4 }]
      })
    ]);

    db.collection('workoutPlans').get.mockResolvedValue(snap);

    const result = await workoutPlanService.getAllWorkoutPlans({});

    expect(result.plans).toHaveLength(2);
    expect(result.total).toBe(2);

    // exercises array should NOT be in list view
    expect(result.plans[0].exercises).toBeUndefined();

    // exerciseCount should be present instead
    expect(result.plans[0].exerciseCount).toBe(2);
    expect(result.plans[1].exerciseCount).toBe(1);
  });

  it('returns empty list when no plans exist', async () => {
    const db = admin.firestore();
    db.collection('workoutPlans').get.mockResolvedValue(makeSnap([]));

    const result = await workoutPlanService.getAllWorkoutPlans({});

    expect(result.plans).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('paginates correctly with limit and offset', async () => {
    const db = admin.firestore();

    const docs = Array.from({ length: 5 }, (_, i) =>
      makePlanDoc(`plan_00${i + 1}`, {
        name: `Plan ${i + 1}`,
        exercises: []
      })
    );

    db.collection('workoutPlans').get.mockResolvedValue(makeSnap(docs));

    const result = await workoutPlanService.getAllWorkoutPlans({ limit: 2, offset: 2 });

    expect(result.plans).toHaveLength(2);
    expect(result.plans[0].planId).toBe('plan_003');
  });

});

// ==================== GET WORKOUT PLAN BY ID ====================
describe('getWorkoutPlanById', () => {

  it('returns null when plan does not exist', async () => {
    const db = admin.firestore();
    db.collection('workoutPlans').doc().get.mockResolvedValue(
      makePlanDoc('plan_001', {}, false)
    );

    const result = await workoutPlanService.getWorkoutPlanById('plan_001');
    expect(result).toBeNull();
  });

  it('returns full plan with exercises array when plan exists', async () => {
    const db = admin.firestore();

    const exercises = [
      { name: 'Burpee', sets: 3, durationSeconds: 30, restSeconds: 20 },
      { name: 'Plank', sets: 3, durationSeconds: 40, restSeconds: 20 }
    ];

    db.collection('workoutPlans').doc().get.mockResolvedValue(
      makePlanDoc('plan_001', {
        name: 'Cardio Core Blast',
        category: 'Core',
        difficulty: 'Hard',
        durationMinutes: 35,
        exercises
      })
    );

    const result = await workoutPlanService.getWorkoutPlanById('plan_001');

    expect(result).not.toBeNull();
    expect(result.planId).toBe('plan_001');
    expect(result.exercises).toHaveLength(2);
    expect(result.exercises[0].name).toBe('Burpee');
  });

  it('returns empty exercises array when plan has no exercises', async () => {
    const db = admin.firestore();

    db.collection('workoutPlans').doc().get.mockResolvedValue(
      makePlanDoc('plan_001', { name: 'Empty Plan' })
    );

    const result = await workoutPlanService.getWorkoutPlanById('plan_001');
    expect(result.exercises).toEqual([]);
  });

});