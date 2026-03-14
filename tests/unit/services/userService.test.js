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

  it('unfollows successfully and returns success message', async () => {
    const { __mockGet: mockGet, __mockDelete: mockDelete } = require('firebase-admin');
    mockGet.mockResolvedValueOnce(makeDoc({ followerId: 'u1', followingId: 'u2' }));
    mockDelete.mockResolvedValueOnce(true);

    const result = await userService.unfollowUser('u1', 'u2');
    expect(result.success).toBe(true);
    expect(mockDelete).toHaveBeenCalled();
  });

});

// ==================== GET USER PROFILE (success path) ====================
describe('getUserProfile (success)', () => {

  it('returns full profile with stats and social counts', async () => {
    const { __mockGet: mockGet } = require('firebase-admin');
    const progressData = { totalWorkouts: 5, totalCalories: 300, totalMinutes: 120, currentStreak: 3, longestStreak: 7, level: 2, experiencePoints: 150 };

    // 1. users doc
    mockGet.mockResolvedValueOnce(makeDoc({ userId: 'u1', name: 'John', bio: 'hi', profilePicUrl: '', fitnessLevel: 2, status: 'Active', createdAt: null }));
    // 2-5. Promise.all: userProgress, follows (followers), follows (following), userBadges
    mockGet.mockResolvedValueOnce({ exists: true, data: () => progressData });
    mockGet.mockResolvedValueOnce(makeSnap([makeDoc({ followingId: 'u1' })]));
    mockGet.mockResolvedValueOnce(makeSnap([makeDoc({ followerId: 'u1' }), makeDoc({ followerId: 'u1' })]));
    mockGet.mockResolvedValueOnce({ size: 2, docs: [] });

    const result = await userService.getUserProfile('u1');

    expect(result.name).toBe('John');
    expect(result.stats.totalWorkouts).toBe(5);
    expect(result.social.followersCount).toBe(1);
    expect(result.social.followingCount).toBe(2);
  });

  it('returns zeroed stats when no progress document', async () => {
    const { __mockGet: mockGet } = require('firebase-admin');

    mockGet.mockResolvedValueOnce(makeDoc({ userId: 'u2', name: 'Jane', status: 'Active', createdAt: null }));
    mockGet.mockResolvedValueOnce({ exists: false, data: () => null });
    mockGet.mockResolvedValueOnce(makeSnap([]));
    mockGet.mockResolvedValueOnce(makeSnap([]));
    mockGet.mockResolvedValueOnce({ size: 0, docs: [] });

    const result = await userService.getUserProfile('u2');
    expect(result.stats.totalWorkouts).toBe(0);
    expect(result.stats.level).toBe(1);
  });

});

// ==================== FOLLOW USER (success path) ====================
describe('followUser (success)', () => {

  it('follows successfully when both users exist and not already following', async () => {
    const { __mockGet: mockGet, __mockSet: mockSet } = require('firebase-admin');
    // Promise.all: followerDoc, followingDoc
    mockGet.mockResolvedValueOnce(makeDoc({ name: 'Alice' }));
    mockGet.mockResolvedValueOnce(makeDoc({ name: 'Bob' }));
    // followRef.get() — not yet following
    mockGet.mockResolvedValueOnce(makeDoc({}, false));
    mockSet.mockResolvedValueOnce(true);

    const result = await userService.followUser('u1', 'u2');
    expect(result.success).toBe(true);
    expect(mockSet).toHaveBeenCalled();
  });

  it('throws when follower does not exist', async () => {
    const { __mockGet: mockGet } = require('firebase-admin');
    mockGet.mockResolvedValueOnce(makeDoc({}, false)); // follower missing
    mockGet.mockResolvedValueOnce(makeDoc({ name: 'Bob' }));

    await expect(userService.followUser('u1', 'u2')).rejects.toThrow('Follower user not found');
  });

  it('throws when target user does not exist', async () => {
    const { __mockGet: mockGet } = require('firebase-admin');
    mockGet.mockResolvedValueOnce(makeDoc({ name: 'Alice' }));
    mockGet.mockResolvedValueOnce(makeDoc({}, false)); // target missing

    await expect(userService.followUser('u1', 'u2')).rejects.toThrow('User to follow not found');
  });

  it('throws when already following', async () => {
    const { __mockGet: mockGet } = require('firebase-admin');
    mockGet.mockResolvedValueOnce(makeDoc({ name: 'Alice' }));
    mockGet.mockResolvedValueOnce(makeDoc({ name: 'Bob' }));
    mockGet.mockResolvedValueOnce(makeDoc({ followerId: 'u1', followingId: 'u2' })); // already following

    await expect(userService.followUser('u1', 'u2')).rejects.toThrow('Already following this user');
  });

});

// ==================== GET FOLLOWERS / GET FOLLOWING ====================
describe('getFollowers', () => {

  it('returns followers list', async () => {
    const { __mockGet: mockGet } = require('firebase-admin');
    const followDoc = { data: () => ({ followerId: 'u2', createdAt: null }), id: 'f1' };
    // follows.where().orderBy().get()
    mockGet.mockResolvedValueOnce({ docs: [followDoc], size: 1 });
    // users.doc(followerId).get()
    mockGet.mockResolvedValueOnce(makeDoc({ name: 'Jane', profilePicUrl: '', fitnessLevel: 1 }));

    const result = await userService.getFollowers('u1');
    expect(result.followers).toHaveLength(1);
    expect(result.followers[0].name).toBe('Jane');
  });

  it('filters out followers whose user doc no longer exists', async () => {
    const { __mockGet: mockGet } = require('firebase-admin');
    const followDoc = { data: () => ({ followerId: 'u2', createdAt: null }), id: 'f1' };
    mockGet.mockResolvedValueOnce({ docs: [followDoc], size: 1 });
    mockGet.mockResolvedValueOnce(makeDoc({}, false)); // user doc gone

    const result = await userService.getFollowers('u1');
    expect(result.followers).toHaveLength(0);
  });

});

describe('getFollowing', () => {

  it('returns following list', async () => {
    const { __mockGet: mockGet } = require('firebase-admin');
    const followDoc = { data: () => ({ followingId: 'u3', createdAt: null }), id: 'f1' };
    mockGet.mockResolvedValueOnce({ docs: [followDoc], size: 1 });
    mockGet.mockResolvedValueOnce(makeDoc({ name: 'Bob', profilePicUrl: '', fitnessLevel: 1 }));

    const result = await userService.getFollowing('u1');
    expect(result.following).toHaveLength(1);
    expect(result.following[0].name).toBe('Bob');
  });

});

// ==================== UPDATE USER PROFILE ====================
describe('updateUserProfile (success)', () => {

  it('updates allowed fields and returns the updated profile', async () => {
    const { __mockGet: mockGet, __mockUpdate: mockUpdate } = require('firebase-admin');
    mockUpdate.mockResolvedValueOnce(true);
    // getUserProfile calls inside updateUserProfile
    mockGet.mockResolvedValueOnce(makeDoc({ userId: 'u1', name: 'Updated Name', status: 'Active', createdAt: null }));
    mockGet.mockResolvedValueOnce({ exists: false, data: () => null }); // userProgress
    mockGet.mockResolvedValueOnce(makeSnap([]));
    mockGet.mockResolvedValueOnce(makeSnap([]));
    mockGet.mockResolvedValueOnce({ size: 0, docs: [] });

    const result = await userService.updateUserProfile('u1', { name: 'Updated Name' });
    expect(mockUpdate).toHaveBeenCalled();
    expect(result.name).toBe('Updated Name');
  });

});