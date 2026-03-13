/**
 * tests/unit/services/duelService.test.js
 * Unit tests for duel business logic
 */

const admin = require('firebase-admin');
const db = admin.firestore();

jest.mock('../../../src/services/public/badgeService', () => ({
  checkAndAwardBadges: jest.fn().mockResolvedValue([])
}));

jest.mock('../../../src/services/public/socialService', () => ({
  logActivity: jest.fn().mockResolvedValue(true)
}));

jest.mock('../../../src/services/public/notificationService', () => ({
  notifyDuelInvite: jest.fn().mockResolvedValue(true),
  notifyDuelAccepted: jest.fn().mockResolvedValue(true),
  notifyDuelResolved: jest.fn().mockResolvedValue(true)
}));

const {
  createDuel,
  acceptDuel,
  declineDuel,
  submitPerformance,
  getDuelDetails,
  getUserDuels,
  getDuelStats
} = require('../../../src/services/public/duelService');

// ==================== HELPERS ====================

const makeDuel = (overrides = {}) => ({
  challengerId: 'user-001',
  opponentId: 'user-002',
  exercise: 'pushup',
  metric: 'rep_count',
  status: 'pending',
  winnerId: null,
  expiresAt: { toDate: () => new Date(Date.now() + 24 * 60 * 60 * 1000) },
  createdAt: new Date(),
  completedAt: null,
  ...overrides
});

beforeEach(() => jest.clearAllMocks());

// ==================== createDuel ====================
describe('createDuel', () => {
  it('should throw if challenger does not exist', async () => {
    db.collection.mockReturnThis();
    db.doc.mockReturnThis();
    db.get
      .mockResolvedValueOnce(mockDoc(null)) // challenger not found
      .mockResolvedValueOnce(mockDoc({ name: 'Jane' }, 'user-002'));

    await expect(createDuel('user-001', 'user-002', 'pushup', 'rep_count'))
      .rejects.toThrow('Challenger not found');
  });

  it('should throw if opponent does not exist', async () => {
    db.collection.mockReturnThis();
    db.doc.mockReturnThis();
    db.get
      .mockResolvedValueOnce(mockDoc({ name: 'John' }, 'user-001'))
      .mockResolvedValueOnce(mockDoc(null)); // opponent not found

    await expect(createDuel('user-001', 'user-002', 'pushup', 'rep_count'))
      .rejects.toThrow('Opponent not found');
  });

  it('should throw if user tries to duel themselves', async () => {
    await expect(createDuel('user-001', 'user-001', 'pushup', 'rep_count'))
      .rejects.toThrow('Cannot duel yourself');
  });

  it('should throw if an active duel already exists between users', async () => {
    db.collection.mockReturnThis();
    db.doc.mockReturnThis();
    db.where.mockReturnThis();
    db.get
      .mockResolvedValueOnce(mockDoc({ name: 'John' }, 'user-001'))
      .mockResolvedValueOnce(mockDoc({ name: 'Jane' }, 'user-002'))
      .mockResolvedValueOnce(mockCollection([
        { data: makeDuel({ status: 'pending' }), id: 'duel-existing' }
      ]));

    await expect(createDuel('user-001', 'user-002', 'pushup', 'rep_count'))
      .rejects.toThrow('A duel already exists between these users');
  });

  it('should create duel successfully', async () => {
    db.collection.mockReturnThis();
    db.doc.mockReturnThis();
    db.where.mockReturnThis();
    db.add.mockResolvedValue({ id: 'duel-new-001' });
    db.get
      .mockResolvedValueOnce(mockDoc({ name: 'John' }, 'user-001'))
      .mockResolvedValueOnce(mockDoc({ name: 'Jane' }, 'user-002'))
      .mockResolvedValueOnce(mockCollection([])); // no existing duel

    const result = await createDuel('user-001', 'user-002', 'pushup', 'rep_count');

    expect(result.duelId).toBe('duel-new-001');
    expect(result.challengerId).toBe('user-001');
    expect(result.opponentId).toBe('user-002');
    expect(result.status).toBe('pending');
  });
});

// ==================== acceptDuel ====================
describe('acceptDuel', () => {
  it('should throw if duel does not exist', async () => {
    db.collection.mockReturnThis();
    db.doc.mockReturnThis();
    db.get.mockResolvedValue(mockDoc(null));

    await expect(acceptDuel('duel-001', 'user-002'))
      .rejects.toThrow('Duel not found');
  });

  it('should throw if user is not the opponent', async () => {
    db.collection.mockReturnThis();
    db.doc.mockReturnThis();
    db.get.mockResolvedValue(mockDoc(makeDuel(), 'duel-001'));

    await expect(acceptDuel('duel-001', 'user-999'))
      .rejects.toThrow('Only the opponent can accept this duel');
  });

  it('should throw if duel is not pending', async () => {
    db.collection.mockReturnThis();
    db.doc.mockReturnThis();
    db.get.mockResolvedValue(mockDoc(makeDuel({ status: 'active' }), 'duel-001'));

    await expect(acceptDuel('duel-001', 'user-002'))
      .rejects.toThrow('Duel cannot be accepted');
  });

  it('should throw if duel has expired', async () => {
    db.collection.mockReturnThis();
    db.doc.mockReturnThis();
    db.update.mockResolvedValue(true);
    db.get.mockResolvedValue(mockDoc(
      makeDuel({ expiresAt: { toDate: () => new Date(Date.now() - 1000) } }),
      'duel-001'
    ));

    await expect(acceptDuel('duel-001', 'user-002'))
      .rejects.toThrow('expired');
  });

  it('should accept duel and set status to active', async () => {
    db.collection.mockReturnThis();
    db.doc.mockReturnThis();
    db.update.mockResolvedValue(true);
    db.get.mockResolvedValue(mockDoc(makeDuel(), 'duel-001'));

    const result = await acceptDuel('duel-001', 'user-002');

    expect(db.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'active' }));
    expect(result.status).toBe('active');
  });
});

// ==================== declineDuel ====================
describe('declineDuel', () => {
  it('should throw if user is not the opponent', async () => {
    db.collection.mockReturnThis();
    db.doc.mockReturnThis();
    db.get.mockResolvedValue(mockDoc(makeDuel(), 'duel-001'));

    await expect(declineDuel('duel-001', 'user-999'))
      .rejects.toThrow('Only the opponent can decline this duel');
  });

  it('should throw if duel is not pending', async () => {
    db.collection.mockReturnThis();
    db.doc.mockReturnThis();
    db.get.mockResolvedValue(mockDoc(makeDuel({ status: 'active' }), 'duel-001'));

    await expect(declineDuel('duel-001', 'user-002'))
      .rejects.toThrow('Can only decline a pending duel');
  });

  it('should decline duel successfully', async () => {
    db.collection.mockReturnThis();
    db.doc.mockReturnThis();
    db.update.mockResolvedValue(true);
    db.get.mockResolvedValue(mockDoc(makeDuel(), 'duel-001'));

    const result = await declineDuel('duel-001', 'user-002');

    expect(db.update).toHaveBeenCalledWith({ status: 'declined' });
    expect(result.status).toBe('declined');
  });
});

// ==================== submitPerformance ====================
describe('submitPerformance', () => {
  it('should throw if user is not part of the duel', async () => {
    db.collection.mockReturnThis();
    db.doc.mockReturnThis();
    db.get.mockResolvedValue(mockDoc(makeDuel({ status: 'active' }), 'duel-001'));

    await expect(submitPerformance('duel-001', 'user-999', { reps: 20 }))
      .rejects.toThrow('not part of this duel');
  });

  it('should throw if duel is not active', async () => {
    db.collection.mockReturnThis();
    db.doc.mockReturnThis();
    db.get.mockResolvedValue(mockDoc(makeDuel({ status: 'pending' }), 'duel-001'));

    await expect(submitPerformance('duel-001', 'user-001', { reps: 20 }))
      .rejects.toThrow('not active');
  });

  it('should throw if user already submitted', async () => {
    db.collection.mockReturnThis();
    db.doc.mockReturnThis();
    db.get
      .mockResolvedValueOnce(mockDoc(makeDuel({ status: 'active' }), 'duel-001'))
      .mockResolvedValueOnce(mockDoc({ reps: 20 }, 'duel-001_user-001')); // already exists

    await expect(submitPerformance('duel-001', 'user-001', { reps: 25 }))
      .rejects.toThrow('already submitted');
  });

  it('should save performance and return waiting status when opponent has not submitted', async () => {
    db.collection.mockReturnThis();
    db.doc.mockReturnThis();
    db.set.mockResolvedValue(true);
    db.get
      .mockResolvedValueOnce(mockDoc(makeDuel({ status: 'active' }), 'duel-001'))
      .mockResolvedValueOnce(mockDoc(null)) // no existing submission
      .mockResolvedValueOnce(mockDoc(null)); // opponent hasn't submitted yet

    const result = await submitPerformance('duel-001', 'user-001', { reps: 30 });

    expect(db.set).toHaveBeenCalled();
    expect(result.status).toBe('waiting_for_opponent');
  });
});

// ==================== getDuelStats ====================
describe('getDuelStats', () => {
  it('should return correct win/loss/draw counts', async () => {
    db.collection.mockReturnThis();
    db.where.mockReturnThis();
    db.get
      .mockResolvedValueOnce(mockCollection([
        { data: { status: 'completed', winnerId: 'user-001', challengerId: 'user-001', opponentId: 'user-002', createdAt: { toDate: () => new Date() } } },
        { data: { status: 'completed', winnerId: 'user-002', challengerId: 'user-002', opponentId: 'user-001', createdAt: { toDate: () => new Date() } } }
      ]))
      .mockResolvedValueOnce(mockCollection([]));

    const stats = await getDuelStats('user-001');

    expect(stats.wins).toBe(1);
    expect(stats.losses).toBe(1);
    expect(stats.totalDuels).toBe(2);
    expect(stats.winRate).toBe(50);
  });

  it('should return zero stats when no duels exist', async () => {
    db.collection.mockReturnThis();
    db.where.mockReturnThis();
    db.get
      .mockResolvedValueOnce(mockCollection([]))
      .mockResolvedValueOnce(mockCollection([]));

    const stats = await getDuelStats('user-001');

    expect(stats.totalDuels).toBe(0);
    expect(stats.winRate).toBe(0);
  });
});