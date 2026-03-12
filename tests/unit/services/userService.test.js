/**
 * Unit Tests - userService.js
 * Covers: registerUser, getUserProfile, updateUserProfile, followUser, unfollowUser
 */

// ==================== FIREBASE MOCK ====================
jest.mock('firebase-admin', () => {
  const mockGet = jest.fn();
  const mockSet = jest.fn().mockResolvedValue(true);
  const mockUpdate = jest.fn().mockResolvedValue(true);
  const mockDelete = jest.fn().mockResolvedValue(true);

  const mockDocRef = { get: mockGet, set: mockSet, update: mockUpdate, delete: mockDelete };

  const mockWhere = jest.fn();
  const mockOrderBy = jest.fn();
  mockWhere.mockReturnValue({ where: mockWhere, get: mockGet, orderBy: mockOrderBy });
  mockOrderBy.mockReturnValue({ get: mockGet });

  const mockCollection = jest.fn(() => ({
    doc: jest.fn(() => mockDocRef),
    where: mockWhere
  }));

  return {
    firestore: Object.assign(
      jest.fn(() => ({ collection: mockCollection })),
      {
        FieldValue: {
          serverTimestamp: jest.fn(() => 'mock-timestamp'),
          increment: jest.fn((n) => n)
        }
      }
    ),
    __mockGet: mockGet,
    __mockSet: mockSet,
    __mockUpdate: mockUpdate,
    __mockDelete: mockDelete,
    __mockCollection: mockCollection
  };
});

const admin = require('firebase-admin');
const userService = require('../../../src/services/public/userService');

function makeDoc(data, exists = true) {
  return { exists, data: () => data, id: data.userId || 'mock-id' };
}

function makeSnap(docs) {
  return { docs, size: docs.length, empty: docs.length === 0 };
}

beforeEach(() => jest.clearAllMocks());
afterAll(() => jest.restoreAllMocks());

// ==================== REGISTER USER ====================
describe('registerUser', () => {

  it('creates all three Firestore documents for a new user', async () => {
    const db = admin.firestore();
    db.collection('users').doc().get.mockResolvedValueOnce(makeDoc({}, false));

    const result = await userService.registerUser('uid123', {
      name: 'Ali Khan',
      email: 'ali@test.com'
    });

    expect(result.alreadyExists).toBe(false);
    expect(result.user.userId).toBe('uid123');
    expect(result.user.name).toBe('Ali Khan');
    expect(result.user.status).toBe('Active');
  });

  it('returns alreadyExists true without creating docs if user exists', async () => {
    const db = admin.firestore();
    db.collection('users').doc().get.mockResolvedValueOnce(
      makeDoc({ name: 'Existing User', email: 'existing@test.com' }, true)
    );

    const result = await userService.registerUser('uid123', {
      name: 'Ali Khan',
      email: 'ali@test.com'
    });

    expect(result.alreadyExists).toBe(true);
    expect(db.collection('users').doc().set).not.toHaveBeenCalled();
  });

  it('uses default values for optional fields', async () => {
    const db = admin.firestore();
    db.collection('users').doc().get.mockResolvedValueOnce(makeDoc({}, false));

    const result = await userService.registerUser('uid456', {
      name: 'New User',
      email: 'new@test.com'
    });

    expect(result.user.profilePicUrl).toBe('');
    expect(result.user.bio).toBe('');
    expect(result.user.fitnessLevel).toBe(1);
  });

});

// ==================== GET USER PROFILE ====================
describe('getUserProfile', () => {

  it('returns null when user does not exist', async () => {
    const db = admin.firestore();
    db.collection('users').doc().get.mockResolvedValueOnce(makeDoc({}, false));

    const result = await userService.getUserProfile('u1');
    expect(result).toBeNull();
  });

});

// ==================== UPDATE USER PROFILE ====================
describe('updateUserProfile', () => {

  it('throws error when no valid fields are provided', async () => {
    await expect(userService.updateUserProfile('u1', { password: 'hack' }))
      .rejects.toThrow('No valid fields provided for update');
  });

});

// ==================== FOLLOW USER ====================
describe('followUser', () => {

  it('throws error when user tries to follow themselves', async () => {
    await expect(userService.followUser('u1', 'u1'))
      .rejects.toThrow('You cannot follow yourself');
  });

});

// ==================== UNFOLLOW USER ====================
describe('unfollowUser', () => {

  it('throws error when not following the target user', async () => {
    const db = admin.firestore();
    db.collection('follows').doc().get.mockResolvedValueOnce(makeDoc({}, false));

    await expect(userService.unfollowUser('u1', 'u2'))
      .rejects.toThrow('You are not following this user');
  });

});