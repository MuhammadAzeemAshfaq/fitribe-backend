/**
 * tests/unit/services/socialService.test.js
 */

const admin = require('firebase-admin');
const db = admin.firestore();

const {
  logActivity,
  getUserFeed,
  getFriendsFeed,
  followUser,
  unfollowUser,
  getFollowing
} = require('../../../src/services/public/socialService');

const makeWhereChain = (snap) => ({
  where:   jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit:   jest.fn().mockReturnThis(),
  get:     jest.fn().mockResolvedValue(snap)
});

const makeDocCol = (docRef) => ({ doc: jest.fn().mockReturnValue(docRef) });

beforeEach(() => jest.clearAllMocks());

// ==================== logActivity ====================
describe('logActivity', () => {
  it('should add an activity document', async () => {
    const addMock = jest.fn().mockResolvedValue({ id: 'a1' });
    db.collection.mockReturnValueOnce({ add: addMock });

    await logActivity('user-001', 'workout_completed', { durationMinutes: 30 });

    expect(addMock).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-001', type: 'workout_completed' }));
  });

  it('should not throw on DB error (non-fatal)', async () => {
    db.collection.mockReturnValueOnce({ add: jest.fn().mockRejectedValue(new Error('DB error')) });

    await expect(logActivity('user-001', 'badge_earned')).resolves.not.toThrow();
  });
});

// ==================== getUserFeed ====================
describe('getUserFeed', () => {
  it('should return feed items with user info attached', async () => {
    db.collection
      .mockReturnValueOnce(makeWhereChain(mockCollection([
        { data: { userId: 'user-001', type: 'badge_earned', data: {}, createdAt: null }, id: 'a1' }
      ])))
      .mockReturnValueOnce(makeDocCol({ get: jest.fn().mockResolvedValue(mockDoc({ name: 'John', profilePicUrl: '' }, 'user-001')) }));

    const result = await getUserFeed('user-001', 20);

    expect(result).toHaveLength(1);
    expect(result[0].activityId).toBe('a1');
    expect(result[0].user.name).toBe('John');
  });

  it('should return empty array when no activities exist', async () => {
    db.collection
      .mockReturnValueOnce(makeWhereChain(mockCollection([])))
      .mockReturnValueOnce(makeDocCol({ get: jest.fn().mockResolvedValue(mockDoc(null)) }));

    const result = await getUserFeed('user-001');
    expect(result).toEqual([]);
  });

  it('should attach Unknown user when user doc does not exist', async () => {
    db.collection
      .mockReturnValueOnce(makeWhereChain(mockCollection([
        { data: { userId: 'user-001', type: 'workout_completed', data: {}, createdAt: null }, id: 'a2' }
      ])))
      .mockReturnValueOnce(makeDocCol({ get: jest.fn().mockResolvedValue(mockDoc(null)) }));

    const result = await getUserFeed('user-001');
    expect(result[0].user.name).toBe('Unknown');
  });
});

// ==================== getFriendsFeed ====================
describe('getFriendsFeed', () => {
  it('should return empty array when user follows nobody', async () => {
    db.collection.mockReturnValueOnce(makeWhereChain(mockCollection([])));

    const result = await getFriendsFeed('user-001');
    expect(result).toEqual([]);
  });

  it('should return activities from followed users', async () => {
    db.collection
      .mockReturnValueOnce(makeWhereChain(mockCollection([
        { data: { followingId: 'user-002' }, id: 'f1' }
      ])))
      .mockReturnValueOnce(makeWhereChain(mockCollection([
        { data: { userId: 'user-002', type: 'workout_completed', data: {}, createdAt: null }, id: 'a1' }
      ])))
      .mockReturnValueOnce(makeDocCol({ get: jest.fn().mockResolvedValue(mockDoc({ name: 'Jane', profilePicUrl: '' }, 'user-002')) }));

    const result = await getFriendsFeed('user-001');
    expect(result).toHaveLength(1);
    expect(result[0].activityId).toBe('a1');
  });
});

// ==================== followUser ====================
describe('followUser', () => {
  it('should throw if trying to follow yourself', async () => {
    await expect(followUser('user-001', 'user-001')).rejects.toThrow('Cannot follow yourself');
  });

  it('should throw if target user does not exist', async () => {
    db.collection.mockReturnValueOnce(makeDocCol({ get: jest.fn().mockResolvedValue(mockDoc(null)) }));

    await expect(followUser('user-001', 'user-002')).rejects.toThrow('User not found');
  });

  it('should throw if already following', async () => {
    const existingFollow = { get: jest.fn().mockResolvedValue(mockDoc({ followingId: 'user-002' }, 'f1')) };
    db.collection
      .mockReturnValueOnce(makeDocCol({ get: jest.fn().mockResolvedValue(mockDoc({ name: 'Jane' }, 'user-002')) }))
      .mockReturnValueOnce(makeDocCol(existingFollow));

    await expect(followUser('user-001', 'user-002')).rejects.toThrow('Already following this user');
  });

  it('should follow successfully', async () => {
    const followRef = { get: jest.fn().mockResolvedValue(mockDoc(null)), set: jest.fn().mockResolvedValue(true) };
    db.collection
      .mockReturnValueOnce(makeDocCol({ get: jest.fn().mockResolvedValue(mockDoc({ name: 'Jane' }, 'user-002')) }))
      .mockReturnValueOnce(makeDocCol(followRef));

    const result = await followUser('user-001', 'user-002');

    expect(result).toEqual({ followerId: 'user-001', followingId: 'user-002' });
    expect(followRef.set).toHaveBeenCalled();
  });
});

// ==================== unfollowUser ====================
describe('unfollowUser', () => {
  it('should throw if not following the user', async () => {
    db.collection.mockReturnValueOnce(makeDocCol({ get: jest.fn().mockResolvedValue(mockDoc(null)) }));

    await expect(unfollowUser('user-001', 'user-002')).rejects.toThrow('Not following this user');
  });

  it('should unfollow successfully', async () => {
    const followRef = {
      get:    jest.fn().mockResolvedValue(mockDoc({ followingId: 'user-002' }, 'f1')),
      delete: jest.fn().mockResolvedValue(true)
    };
    db.collection.mockReturnValueOnce(makeDocCol(followRef));

    const result = await unfollowUser('user-001', 'user-002');

    expect(result).toEqual({ followerId: 'user-001', followingId: 'user-002' });
    expect(followRef.delete).toHaveBeenCalled();
  });
});

// ==================== getFollowing ====================
describe('getFollowing', () => {
  it('should return empty array when not following anyone', async () => {
    db.collection.mockReturnValueOnce(makeWhereChain(mockCollection([])));

    const result = await getFollowing('user-001');
    expect(result).toEqual([]);
  });

  it('should return list of followed users', async () => {
    db.collection
      .mockReturnValueOnce(makeWhereChain(mockCollection([
        { data: { followingId: 'user-002' }, id: 'f1' }
      ])))
      .mockReturnValueOnce(makeDocCol({ get: jest.fn().mockResolvedValue(mockDoc({ name: 'Jane', profilePicUrl: '' }, 'user-002')) }));

    const result = await getFollowing('user-001');

    expect(result).toHaveLength(1);
    expect(result[0].userId).toBe('user-002');
    expect(result[0].name).toBe('Jane');
  });
});
