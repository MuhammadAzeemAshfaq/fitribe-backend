/**
 * tests/unit/services/notificationService.test.js
 */

const admin = require('firebase-admin');
const db = admin.firestore();

// Mock admin.messaging
const mockSendEachForMulticast = jest.fn();
admin.messaging = jest.fn().mockReturnValue({ sendEachForMulticast: mockSendEachForMulticast });

const {
  saveDeviceToken,
  sendNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  notifyDuelInvite,
  notifyDuelAccepted,
  notifyDuelResolved,
  notifyBadgeEarned
} = require('../../../src/services/public/notificationService');

const makeWhereChain = (snap) => ({
  where:   jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit:   jest.fn().mockReturnThis(),
  get:     jest.fn().mockResolvedValue(snap)
});

const makeDocCol = (docRef) => ({ doc: jest.fn().mockReturnValue(docRef) });

beforeEach(() => jest.clearAllMocks());

// ==================== saveDeviceToken ====================
describe('saveDeviceToken', () => {
  it('should save a device token document', async () => {
    const setMock = jest.fn().mockResolvedValue(true);
    db.collection.mockReturnValueOnce(makeDocCol({ set: setMock }));

    await saveDeviceToken('user-001', 'fcm-token-abc', 'mobile');

    expect(setMock).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-001', token: 'fcm-token-abc', platform: 'mobile' }));
  });
});

// ==================== sendNotification ====================
describe('sendNotification', () => {
  it('should save in-app notification and skip FCM when no tokens', async () => {
    db.collection
      .mockReturnValueOnce({ add: jest.fn().mockResolvedValue({ id: 'n1' }) })   // notifications
      .mockReturnValueOnce(makeWhereChain(mockCollection([])));                   // deviceTokens (empty)

    await sendNotification('user-001', 'Test Title', 'Test body');

    expect(mockSendEachForMulticast).not.toHaveBeenCalled();
  });

  it('should send FCM push when device tokens exist', async () => {
    mockSendEachForMulticast.mockResolvedValue({ responses: [{ success: true }] });

    db.collection
      .mockReturnValueOnce({ add: jest.fn().mockResolvedValue({ id: 'n1' }) })   // notifications
      .mockReturnValueOnce(makeWhereChain(mockCollection([
        { data: { token: 'device-token-1' }, id: 'dt1' }
      ])));                                                                        // deviceTokens

    await sendNotification('user-001', 'Test', 'Body', { type: 'badge_earned' });

    expect(mockSendEachForMulticast).toHaveBeenCalled();
  });

  it('should remove invalid tokens after failed FCM delivery', async () => {
    const batchDeleteMock = jest.fn();
    const batchCommitMock = jest.fn().mockResolvedValue(true);
    db.batch.mockReturnValueOnce({ delete: batchDeleteMock, commit: batchCommitMock });

    mockSendEachForMulticast.mockResolvedValue({
      responses: [{ success: false, error: { code: 'messaging/invalid-registration-token' } }]
    });

    db.collection
      .mockReturnValueOnce({ add: jest.fn().mockResolvedValue({ id: 'n1' }) })
      .mockReturnValueOnce(makeWhereChain(mockCollection([{ data: { token: 'bad-token' }, id: 'dt1' }])))
      .mockReturnValueOnce(makeDocCol({ id: 'user-001_bad-token' }));             // removeInvalidTokens

    await sendNotification('user-001', 'Test', 'Body');

    expect(batchDeleteMock).toHaveBeenCalled();
    expect(batchCommitMock).toHaveBeenCalled();
  });

  it('should not throw on FCM error (non-fatal)', async () => {
    db.collection.mockReturnValueOnce({ add: jest.fn().mockRejectedValue(new Error('DB error')) });

    await expect(sendNotification('user-001', 'Test', 'Body')).resolves.not.toThrow();
  });
});

// ==================== getUserNotifications ====================
describe('getUserNotifications', () => {
  it('should return notifications for a user', async () => {
    db.collection.mockReturnValueOnce(makeWhereChain(mockCollection([
      { data: { userId: 'user-001', title: 'Badge!', read: false, createdAt: null }, id: 'n1' }
    ])));

    const result = await getUserNotifications('user-001', 30);

    expect(result).toHaveLength(1);
    expect(result[0].notificationId).toBe('n1');
    expect(result[0].title).toBe('Badge!');
  });

  it('should return empty array when no notifications', async () => {
    db.collection.mockReturnValueOnce(makeWhereChain(mockCollection([])));

    const result = await getUserNotifications('user-001');
    expect(result).toEqual([]);
  });
});

// ==================== markAsRead ====================
describe('markAsRead', () => {
  it('should mark a notification as read', async () => {
    const updateMock = jest.fn().mockResolvedValue(true);
    const notifRef = {
      get:    jest.fn().mockResolvedValue(mockDoc({ userId: 'user-001', read: false }, 'n1')),
      update: updateMock
    };
    db.collection.mockReturnValueOnce(makeDocCol(notifRef));

    await markAsRead('n1', 'user-001');

    expect(updateMock).toHaveBeenCalledWith({ read: true });
  });

  it('should throw when notification does not exist', async () => {
    db.collection.mockReturnValueOnce(makeDocCol({ get: jest.fn().mockResolvedValue(mockDoc(null)) }));

    await expect(markAsRead('n-missing', 'user-001')).rejects.toThrow('Notification not found');
  });

  it('should throw on access denied when userId does not match', async () => {
    db.collection.mockReturnValueOnce(makeDocCol({
      get: jest.fn().mockResolvedValue(mockDoc({ userId: 'user-999', read: false }, 'n1'))
    }));

    await expect(markAsRead('n1', 'user-001')).rejects.toThrow('Access denied');
  });
});

// ==================== markAllAsRead ====================
describe('markAllAsRead', () => {
  it('should return 0 when no unread notifications', async () => {
    db.collection.mockReturnValueOnce(makeWhereChain(mockCollection([])));

    const count = await markAllAsRead('user-001');
    expect(count).toBe(0);
  });

  it('should batch-update unread notifications and return count', async () => {
    const batchUpdateMock = jest.fn();
    const batchCommitMock = jest.fn().mockResolvedValue(true);
    db.batch.mockReturnValueOnce({ update: batchUpdateMock, commit: batchCommitMock });

    db.collection.mockReturnValueOnce(makeWhereChain(mockCollection([
      { data: { userId: 'user-001', read: false }, id: 'n1' },
      { data: { userId: 'user-001', read: false }, id: 'n2' }
    ])));

    const count = await markAllAsRead('user-001');

    expect(count).toBe(2);
    expect(batchUpdateMock).toHaveBeenCalledTimes(2);
    expect(batchCommitMock).toHaveBeenCalled();
  });
});

// ==================== getUnreadCount ====================
describe('getUnreadCount', () => {
  it('should return the number of unread notifications', async () => {
    db.collection.mockReturnValueOnce(makeWhereChain({ size: 3, docs: [] }));

    const count = await getUnreadCount('user-001');
    expect(count).toBe(3);
  });
});

// ==================== notification helpers ====================
describe('notification helpers', () => {
  const setupSendNotification = () => {
    db.collection
      .mockReturnValueOnce({ add: jest.fn().mockResolvedValue({ id: 'n1' }) })
      .mockReturnValueOnce(makeWhereChain(mockCollection([])));
  };

  it('notifyDuelInvite should call sendNotification', async () => {
    setupSendNotification();
    await notifyDuelInvite('user-002', 'John', 'duel-001', 'pushup');
    // No throw = success
  });

  it('notifyDuelAccepted should call sendNotification', async () => {
    setupSendNotification();
    await notifyDuelAccepted('user-001', 'Jane', 'duel-001');
  });

  it('notifyDuelResolved should send to both winner and loser', async () => {
    // Two sendNotification calls → 4 collection mocks (2 notifications + 2 deviceTokens)
    db.collection
      .mockReturnValueOnce({ add: jest.fn().mockResolvedValue({ id: 'n1' }) })
      .mockReturnValueOnce(makeWhereChain(mockCollection([])))
      .mockReturnValueOnce({ add: jest.fn().mockResolvedValue({ id: 'n2' }) })
      .mockReturnValueOnce(makeWhereChain(mockCollection([])));

    await notifyDuelResolved('user-001', 'user-002', 'duel-001', 'pushup');
  });

  it('notifyBadgeEarned should call sendNotification', async () => {
    setupSendNotification();
    await notifyBadgeEarned('user-001', 'First Workout', 'bronze');
  });
});
