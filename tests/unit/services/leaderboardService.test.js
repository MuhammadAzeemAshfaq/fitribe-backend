/**
 * Unit Tests - leaderboardService.js
 * Tests for global leaderboard, user rank, and friends leaderboard
 */

// ==================== FIREBASE MOCK ====================
jest.mock('firebase-admin', () => {
  const mockGet = jest.fn();
  const mockWhere = jest.fn();
  const mockOrderBy = jest.fn();
  const mockLimit = jest.fn();

  mockWhere.mockReturnValue({ where: mockWhere, get: mockGet, orderBy: mockOrderBy, limit: mockLimit });
  mockOrderBy.mockReturnValue({ limit: mockLimit, get: mockGet });
  mockLimit.mockReturnValue({ get: mockGet });

  const mockCollection = jest.fn(() => ({
    doc: jest.fn(() => ({ get: mockGet })),
    where: mockWhere,
    orderBy: mockOrderBy
  }));

  return {
    firestore: Object.assign(
      jest.fn(() => ({ collection: mockCollection })),
      {
        FieldValue: {
          serverTimestamp: jest.fn(() => 'mock-timestamp'),
          increment: jest.fn((n) => n)
        },
        FieldPath: {
          documentId: jest.fn(() => '__name__')
        }
      }
    ),
    __mockGet: mockGet,
    __mockWhere: mockWhere,
    __mockCollection: mockCollection
  };
});

const leaderboardService = require('../../../src/services/public/leaderboardService');

// ==================== HELPERS ====================
function makeDoc(id, data, exists = true) {
  return { id, exists, data: () => data };
}

function makeSnap(docs) {
  return { docs, size: docs.length, empty: docs.length === 0 };
}

beforeEach(() => {
  jest.clearAllMocks();
});

afterAll(() => {
  jest.restoreAllMocks();
});

// ==================== GLOBAL LEADERBOARD ====================
describe('getGlobalLeaderboard', () => {
  it('throws error for invalid leaderboard type', async () => {
    await expect(leaderboardService.getGlobalLeaderboard('invalid_type'))
      .rejects.toThrow('type must be one of');
  });

  it('accepts all valid leaderboard types', async () => {
    const admin = require('firebase-admin');
    const db = admin.firestore();

    const progressSnap = makeSnap([
      makeDoc('u1', { experiencePoints: 500, currentStreak: 3, totalWorkouts: 10, level: 2 }),
      makeDoc('u2', { experiencePoints: 300, currentStreak: 1, totalWorkouts: 5, level: 1 })
    ]);

    const userDoc = makeDoc('u1', { name: 'Ali', profilePicUrl: '' });

    db.collection.mockImplementation((col) => {
      if (col === 'userProgress') return {
        orderBy: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({ get: jest.fn().mockResolvedValue(progressSnap) })
        })
      };
      if (col === 'users') return { doc: jest.fn().mockReturnValue({ get: jest.fn().mockResolvedValue(userDoc) }) };
      return { doc: jest.fn().mockReturnValue({ get: jest.fn() }) };
    });

    for (const type of ['xp', 'streak', 'workouts', 'calories']) {
      const result = await leaderboardService.getGlobalLeaderboard(type, 10, 0);
      expect(result.type).toBe(type);
      expect(Array.isArray(result.leaderboard)).toBe(true);
    }
  });
});

// ==================== USER RANK ====================
describe('getUserRank', () => {
  it('returns null when user progress does not exist', async () => {
    const admin = require('firebase-admin');
    const db = admin.firestore();

    db.collection.mockImplementation(() => ({
      doc: jest.fn().mockReturnValue({ get: jest.fn().mockResolvedValue(makeDoc('u1', {}, false)) })
    }));

    const result = await leaderboardService.getUserRank('u1', 'xp');
    expect(result).toBeNull();
  });

  it('throws error for invalid type', async () => {
    await expect(leaderboardService.getUserRank('u1', 'bad_type'))
      .rejects.toThrow('Invalid leaderboard type');
  });

  it('computes rank correctly based on users with higher value', async () => {
    const admin = require('firebase-admin');
    const db = admin.firestore();

    const userProgressDoc = makeDoc('u1', { experiencePoints: 300 });
    const higherSnap = makeSnap([makeDoc('u2', {}), makeDoc('u3', {})]);

    db.collection.mockImplementation(() => ({
      doc: jest.fn().mockReturnValue({ get: jest.fn().mockResolvedValue(userProgressDoc) }),
      where: jest.fn().mockReturnValue({ get: jest.fn().mockResolvedValue(higherSnap) })
    }));

    const result = await leaderboardService.getUserRank('u1', 'xp');
    expect(result.rank).toBe(3); // 2 users with higher XP => rank 3
    expect(result.value).toBe(300);
  });
});