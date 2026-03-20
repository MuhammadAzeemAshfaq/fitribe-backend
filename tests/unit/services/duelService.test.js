/**
 * tests/unit/services/duelService.test.js
 *
 * Key facts about duelService.js that shape every mock:
 *
 * 1. `const db = admin.firestore()` is called at module load — so
 *    admin.firestore() always returns the SAME mock object. We mock
 *    methods on that object, not replace it.
 *
 * 2. createDuel uses Promise.all for two doc lookups, then checks
 *    challengerId === opponentId AFTER the lookups. So the "duel
 *    yourself" test must still mock two collection calls.
 *
 * 3. acceptDuel / declineDuel use `db.collection('duels').doc(id)`
 *    which needs { doc: fn → { get, update } } — NOT a where chain.
 *
 * 4. admin.firestore.Timestamp.fromDate is called when creating/accepting
 *    duels. The global mock in setup.js doesn't set this up, so we mock
 *    it here.
 *
 * 5. submitPerformance checks duel status BEFORE checking existing perf,
 *    so the "not active" test must NOT mock a perfDoc.
 *
 * 6. getDuelStats calls getUserDuels internally, which calls
 *    db.collection('duels').where(...).get() TWICE (challenger + opponent).
 */
jest.mock('firebase-admin', () => {
  const mockDb = {
    collection: jest.fn()
  };
  const admin = {
    firestore: jest.fn(() => mockDb),
    auth: jest.fn()
  };
  admin.firestore.Timestamp = {
    fromDate: jest.fn(d => ({ toDate: () => d }))
  };
  admin.firestore.FieldValue = {
    increment: jest.fn(n => n),
    serverTimestamp: jest.fn(() => new Date())
  };
  return admin;
});

jest.mock('../../../src/index', () => ({ io: null }), { virtual: true });

jest.mock('../../../src/services/public/badgeService', () => ({
  checkAndAwardBadges: jest.fn().mockResolvedValue([])
}));

jest.mock('../../../src/services/public/socialService', () => ({
  logActivity: jest.fn().mockResolvedValue(true)
}), { virtual: true });

jest.mock('../../../src/services/public/notificationService', () => ({
  notifyDuelInvite:   jest.fn().mockResolvedValue(true),
  notifyDuelAccepted: jest.fn().mockResolvedValue(true),
  notifyDuelResolved: jest.fn().mockResolvedValue(true)
}), { virtual: true });

const admin = require('firebase-admin');
const db = admin.firestore();

const {
  createDuel,
  acceptDuel,
  declineDuel,
  submitPerformance,
  getDuelStats
} = require('../../../src/services/public/duelService');

// ==================== HELPERS ====================

// A duelRef object that has both get() and update()
const makeDuelRef = (data, id = 'duel-001') => ({
  get:    jest.fn().mockResolvedValue(mockDoc(data, id)),
  update: jest.fn().mockResolvedValue(true)
});

// Collection that returns a docRef when .doc() is called
const makeDocCollection = (docRef) => ({
  doc: jest.fn().mockReturnValue(docRef)
});

// Collection that supports .where().where()...get() chains
const makeWhereCollection = (snapshot) => ({
  where:   jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit:   jest.fn().mockReturnThis(),
  get:     jest.fn().mockResolvedValue(snapshot),
  add:     jest.fn()
});

const makeDuelData = (overrides = {}) => ({
  challengerId: 'user-001',
  opponentId:   'user-002',
  exercise:     'pushup',
  metric:       'rep_count',
  status:       'pending',
  winnerId:     null,
  expiresAt:    { toDate: () => new Date(Date.now() + 24 * 60 * 60 * 1000) },
  createdAt:    { toDate: () => new Date() },
  completedAt:  null,
  ...overrides
});

beforeEach(() => jest.clearAllMocks());

// ==================== createDuel ====================
describe('createDuel', () => {
  // createDuel does Promise.all([challenger.get(), opponent.get()]) FIRST,
  // then checks `challengerId === opponentId`. So even for the "yourself"
  // test we need two collection mocks.
  it('should throw if user tries to duel themselves', async () => {
    db.collection
      .mockReturnValueOnce(makeDocCollection({ get: jest.fn().mockResolvedValue(mockDoc({ name: 'John' }, 'user-001')) }))
      .mockReturnValueOnce(makeDocCollection({ get: jest.fn().mockResolvedValue(mockDoc({ name: 'John' }, 'user-001')) }));

    await expect(createDuel('user-001', 'user-001', 'pushup', 'rep_count'))
      .rejects.toThrow('Cannot duel yourself');
  });

  it('should throw if challenger does not exist', async () => {
    db.collection
      .mockReturnValueOnce(makeDocCollection({ get: jest.fn().mockResolvedValue(mockDoc(null)) }))
      .mockReturnValueOnce(makeDocCollection({ get: jest.fn().mockResolvedValue(mockDoc({ name: 'Jane' }, 'user-002')) }));

    await expect(createDuel('user-001', 'user-002', 'pushup', 'rep_count'))
      .rejects.toThrow('Challenger not found');
  });

  it('should throw if opponent does not exist', async () => {
    db.collection
      .mockReturnValueOnce(makeDocCollection({ get: jest.fn().mockResolvedValue(mockDoc({ name: 'John' }, 'user-001')) }))
      .mockReturnValueOnce(makeDocCollection({ get: jest.fn().mockResolvedValue(mockDoc(null)) }));

    await expect(createDuel('user-001', 'user-002', 'pushup', 'rep_count'))
      .rejects.toThrow('Opponent not found');
  });

  it('should throw if an active duel already exists between users', async () => {
    db.collection
      .mockReturnValueOnce(makeDocCollection({ get: jest.fn().mockResolvedValue(mockDoc({ name: 'John' }, 'user-001')) }))
      .mockReturnValueOnce(makeDocCollection({ get: jest.fn().mockResolvedValue(mockDoc({ name: 'Jane' }, 'user-002')) }))
      .mockReturnValueOnce(makeWhereCollection(
        mockCollection([{ data: makeDuelData({ status: 'pending' }), id: 'duel-existing' }])
      ));

    await expect(createDuel('user-001', 'user-002', 'pushup', 'rep_count'))
      .rejects.toThrow('A duel already exists between these users');
  });

  it('should create duel successfully when no conflicts exist', async () => {
    const addMock = jest.fn().mockResolvedValue({ id: 'duel-new-001' });

    db.collection
      .mockReturnValueOnce(makeDocCollection({ get: jest.fn().mockResolvedValue(mockDoc({ name: 'John' }, 'user-001')) }))
      .mockReturnValueOnce(makeDocCollection({ get: jest.fn().mockResolvedValue(mockDoc({ name: 'Jane' }, 'user-002')) }))
      .mockReturnValueOnce({ ...makeWhereCollection(mockCollection([])), add: addMock }) // existing duel check (empty)
      .mockReturnValueOnce({ add: addMock }); // the actual .add() call

    const result = await createDuel('user-001', 'user-002', 'pushup', 'rep_count');

    expect(addMock).toHaveBeenCalled();
    expect(result.duelId).toBe('duel-new-001');
    expect(result.status).toBe('pending');
  });
});

// ==================== acceptDuel ====================
// acceptDuel: db.collection('duels').doc(duelId) → { get, update }
describe('acceptDuel', () => {
  it('should throw if duel does not exist', async () => {
    const duelRef = { get: jest.fn().mockResolvedValue(mockDoc(null)), update: jest.fn() };
    db.collection.mockReturnValueOnce(makeDocCollection(duelRef));

    await expect(acceptDuel('duel-001', 'user-002'))
      .rejects.toThrow('Duel not found');
  });

  it('should throw if user is not the opponent', async () => {
    const duelRef = { get: jest.fn().mockResolvedValue(mockDoc(makeDuelData(), 'duel-001')), update: jest.fn() };
    db.collection.mockReturnValueOnce(makeDocCollection(duelRef));

    await expect(acceptDuel('duel-001', 'user-999'))
      .rejects.toThrow('Only the opponent can accept this duel');
  });

  it('should throw if duel is not pending', async () => {
    const duelRef = { get: jest.fn().mockResolvedValue(mockDoc(makeDuelData({ status: 'active' }), 'duel-001')), update: jest.fn() };
    db.collection.mockReturnValueOnce(makeDocCollection(duelRef));

    await expect(acceptDuel('duel-001', 'user-002'))
      .rejects.toThrow('Duel cannot be accepted');
  });

  it('should throw if duel has expired', async () => {
    const expiredData = makeDuelData({
      expiresAt: { toDate: () => new Date(Date.now() - 1000) } // in the past
    });
    const duelRef = { get: jest.fn().mockResolvedValue(mockDoc(expiredData, 'duel-001')), update: jest.fn().mockResolvedValue(true) };
    db.collection.mockReturnValueOnce(makeDocCollection(duelRef));

    await expect(acceptDuel('duel-001', 'user-002'))
      .rejects.toThrow('expired');
  });

  it('should accept duel and set status to active', async () => {
    const duelRef = {
      get:    jest.fn().mockResolvedValue(mockDoc(makeDuelData(), 'duel-001')),
      update: jest.fn().mockResolvedValue(true)
    };
    const userRef = { get: jest.fn().mockResolvedValue(mockDoc({ name: 'Jane' }, 'user-002')) };
    db.collection
      .mockReturnValueOnce(makeDocCollection(duelRef))   // duels
      .mockReturnValueOnce(makeDocCollection(userRef));  // users (opponent name lookup)

    const result = await acceptDuel('duel-001', 'user-002');

    expect(duelRef.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'active' }));
    expect(result.status).toBe('active');
  });
});

// ==================== declineDuel ====================
describe('declineDuel', () => {
  it('should throw if user is not the opponent', async () => {
    const duelRef = { get: jest.fn().mockResolvedValue(mockDoc(makeDuelData(), 'duel-001')), update: jest.fn() };
    db.collection.mockReturnValueOnce(makeDocCollection(duelRef));

    await expect(declineDuel('duel-001', 'user-999'))
      .rejects.toThrow('Only the opponent can decline this duel');
  });

  it('should throw if duel is not pending', async () => {
    // active duel → cannot decline
    const duelRef = {
      get:    jest.fn().mockResolvedValue(mockDoc(makeDuelData({ status: 'active' }), 'duel-001')),
      update: jest.fn().mockResolvedValue(true)
    };
    db.collection.mockReturnValueOnce(makeDocCollection(duelRef));

    await expect(declineDuel('duel-001', 'user-002'))
      .rejects.toThrow('Can only decline a pending duel');
  });

  it('should decline duel successfully', async () => {
    const duelRef = {
      get:    jest.fn().mockResolvedValue(mockDoc(makeDuelData(), 'duel-001')),
      update: jest.fn().mockResolvedValue(true)
    };
    db.collection.mockReturnValueOnce(makeDocCollection(duelRef));

    const result = await declineDuel('duel-001', 'user-002');

    expect(duelRef.update).toHaveBeenCalledWith({ status: 'declined' });
    expect(result.status).toBe('declined');
  });
});

// ==================== submitPerformance ====================
// Flow: get duel → validate → get my existing perf → set my perf → get other perf
// Each db.collection() call goes to a different collection
describe('submitPerformance', () => {
  it('should throw if user is not part of the duel', async () => {
    const duelRef = { get: jest.fn().mockResolvedValue(mockDoc(makeDuelData({ status: 'active' }), 'duel-001')), update: jest.fn() };
    db.collection.mockReturnValueOnce(makeDocCollection(duelRef));

    await expect(submitPerformance('duel-001', 'user-999', { reps: 20 }))
      .rejects.toThrow('not part of this duel');
  });

  it('should throw if duel is not active', async () => {
    // duel.status check comes BEFORE existingPerf check in the service
    const duelRef = { get: jest.fn().mockResolvedValue(mockDoc(makeDuelData({ status: 'pending' }), 'duel-001')), update: jest.fn() };
    db.collection.mockReturnValueOnce(makeDocCollection(duelRef));

    await expect(submitPerformance('duel-001', 'user-001', { reps: 20 }))
      .rejects.toThrow('Duel is not active');
  });

  it('should throw if user already submitted performance', async () => {
    const duelRef = {
      get: jest.fn().mockResolvedValue(mockDoc(makeDuelData({ status: 'active' }), 'duel-001')),
      update: jest.fn()
    };
    // existingPerf doc EXISTS → already submitted
    const perfRef = { get: jest.fn().mockResolvedValue(mockDoc({ reps: 20 }, 'duel-001_user-001')) };

    db.collection
      .mockReturnValueOnce(makeDocCollection(duelRef))   // duels
      .mockReturnValueOnce(makeDocCollection(perfRef));  // duelPerformance

    await expect(submitPerformance('duel-001', 'user-001', { reps: 25 }))
      .rejects.toThrow('already submitted');
  });

  it('should save performance and return waiting when opponent has not submitted', async () => {
    const duelRef = {
      get:    jest.fn().mockResolvedValue(mockDoc(makeDuelData({ status: 'active' }), 'duel-001')),
      update: jest.fn()
    };
    const myPerfRef = {
      get: jest.fn().mockResolvedValue(mockDoc(null)),   // I haven't submitted yet
      set: jest.fn().mockResolvedValue(true)
    };
    const opponentPerfRef = {
      get: jest.fn().mockResolvedValue(mockDoc(null))    // opponent hasn't submitted
    };

    // submitPerformance calls duelPerformance.doc() three times:
    //   1. check if I already submitted
    //   2. save my submission (.set)
    //   3. check if opponent submitted
    const perfDocMock = jest.fn()
      .mockReturnValueOnce(myPerfRef)        // check existing
      .mockReturnValueOnce(myPerfRef)        // save (same ref, has .set)
      .mockReturnValueOnce(opponentPerfRef); // check opponent

    db.collection
      .mockReturnValueOnce(makeDocCollection(duelRef))  // duels
      .mockReturnValueOnce({ doc: perfDocMock })        // duelPerformance (existing check)
      .mockReturnValueOnce({ doc: perfDocMock })        // duelPerformance (save)
      .mockReturnValueOnce({ doc: perfDocMock });       // duelPerformance (opponent check)

    const result = await submitPerformance('duel-001', 'user-001', { reps: 30 });

    expect(myPerfRef.set).toHaveBeenCalled();
    expect(result.status).toBe('waiting_for_opponent');
  });
});

// ==================== getDuelStats ====================
// getDuelStats → getUserDuels(userId, 'completed')
// getUserDuels does TWO where queries: challenger + opponent
describe('getDuelStats', () => {
  it('should return correct win/loss/draw counts', async () => {
    const challengerSnap = mockCollection([
      { data: makeDuelData({ status: 'completed', winnerId: 'user-001' }), id: 'd1' }, // win
      { data: makeDuelData({ status: 'completed', winnerId: 'user-002' }), id: 'd2' }  // loss
    ]);
    const opponentSnap = mockCollection([
      { data: makeDuelData({ status: 'completed', winnerId: null, challengerId: 'user-003', opponentId: 'user-001' }), id: 'd3' } // draw
    ]);

    db.collection
      .mockReturnValueOnce(makeWhereCollection(challengerSnap))  // challenger query
      .mockReturnValueOnce(makeWhereCollection(opponentSnap));   // opponent query

    const stats = await getDuelStats('user-001');

    expect(stats.wins).toBe(1);
    expect(stats.losses).toBe(1);
    expect(stats.draws).toBe(1);
    expect(stats.totalDuels).toBe(3);
    expect(stats.winRate).toBe(33);
  });

  it('should return zero stats when no duels exist', async () => {
    db.collection
      .mockReturnValueOnce(makeWhereCollection(mockCollection([])))
      .mockReturnValueOnce(makeWhereCollection(mockCollection([])));

    const stats = await getDuelStats('user-001');

    expect(stats.totalDuels).toBe(0);
    expect(stats.wins).toBe(0);
    expect(stats.losses).toBe(0);
    expect(stats.winRate).toBe(0);
  });
});