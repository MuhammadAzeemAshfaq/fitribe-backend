/**
 * Unit Tests - exerciseService.js
 */

jest.mock('firebase-admin', () => {
  const mockGet = jest.fn();
  const mockWhere = jest.fn();
  const mockOrderBy = jest.fn();
  const mockLimit = jest.fn();

  mockLimit.mockReturnValue({ get: mockGet });
  mockOrderBy.mockReturnValue({ get: mockGet });
  mockWhere.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy, limit: mockLimit, get: mockGet });

  const mockCollection = jest.fn(() => ({
    doc: jest.fn(() => ({ get: mockGet })),
    where: mockWhere,
    orderBy: mockOrderBy,
    get: mockGet
  }));

  return {
    firestore: Object.assign(
      jest.fn(() => ({ collection: mockCollection })),
      { FieldValue: { serverTimestamp: jest.fn(() => 'mock-timestamp') } }
    ),
    __mockGet: mockGet,
    __mockCollection: mockCollection
  };
});

const admin = require('firebase-admin');
const exerciseService = require('../../../src/services/public/exerciseService');

function makeDoc(id, data, exists = true) {
  return { id, exists, data: () => data };
}

function makeSnap(docs) {
  return { docs, size: docs.length, empty: docs.length === 0 };
}

beforeEach(() => jest.clearAllMocks());
afterAll(() => jest.restoreAllMocks());

// ==================== GET ALL EXERCISES ====================
describe('getAllExercises', () => {

  it('returns list without correctPoseData', async () => {
    const db = admin.firestore();

    db.collection('exercises').orderBy().get.mockResolvedValue(makeSnap([
      makeDoc('ex_001', {
        name: 'Calf Raise',
        category: 'Isolation Strength',
        difficulty: 'Easy',
        desc: 'Strengthens calf muscles',
        equipmentRequired: false,
        aiModelIntegrated: false,
        index: 1,
        correctPoseData: { angles: { ankleFlexion: '0° to 45°' } }
      })
    ]));

    const result = await exerciseService.getAllExercises({});

    expect(result.exercises).toHaveLength(1);
    expect(result.exercises[0].name).toBe('Calf Raise');
    // correctPoseData should NOT be in list response
    expect(result.exercises[0].correctPoseData).toBeUndefined();
  });

  it('returns empty list when no exercises exist', async () => {
    const db = admin.firestore();
    db.collection('exercises').orderBy().get.mockResolvedValue(makeSnap([]));

    const result = await exerciseService.getAllExercises({});
    expect(result.exercises).toHaveLength(0);
    expect(result.total).toBe(0);
  });

});

// ==================== GET EXERCISE BY ID ====================
describe('getExerciseById', () => {

  it('returns null when exercise does not exist', async () => {
    const db = admin.firestore();
    db.collection('exercises').doc().get.mockResolvedValue(makeDoc('ex_001', {}, false));

    const result = await exerciseService.getExerciseById('ex_001');
    expect(result).toBeNull();
  });

  it('returns full exercise with correctPoseData when found', async () => {
    const db = admin.firestore();
    db.collection('exercises').doc().get.mockResolvedValue(
      makeDoc('ex_001', {
        name: 'Calf Raise',
        correctPoseData: {
          angles: { ankleFlexion: '0° to 45°' },
          keypoints: { ankles: 'neutral alignment' }
        }
      })
    );

    const result = await exerciseService.getExerciseById('ex_001');
    expect(result).not.toBeNull();
    expect(result.exerciseId).toBe('ex_001');
    expect(result.correctPoseData).toBeDefined();
    expect(result.correctPoseData.angles.ankleFlexion).toBe('0° to 45°');
  });

});

// ==================== GET EXERCISE BY NAME ====================
describe('getExerciseByName', () => {

  it('returns exercise when exact name matches', async () => {
    const db = admin.firestore();

    db.collection('exercises').where().limit().get.mockResolvedValueOnce(
      makeSnap([makeDoc('ex_001', { name: 'Burpee', correctPoseData: {} })])
    );

    const result = await exerciseService.getExerciseByName('Burpee');
    expect(result).not.toBeNull();
    expect(result.name).toBe('Burpee');
  });

  it('returns null when no exercise matches name', async () => {
    const db = admin.firestore();

    // Both exact and capitalised fallback return empty
    db.collection('exercises').where().limit().get
      .mockResolvedValueOnce(makeSnap([]))
      .mockResolvedValueOnce(makeSnap([]));

    const result = await exerciseService.getExerciseByName('NonExistentExercise');
    expect(result).toBeNull();
  });

});