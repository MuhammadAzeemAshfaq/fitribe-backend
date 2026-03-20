/**
 * tests/integration/routes/duel.routes.test.js
 */

const request = require('supertest');
const admin = require('firebase-admin');

jest.mock('../../../src/services/public/duelService');
const duelService = require('../../../src/services/public/duelService');

let app;
beforeAll(() => {
  admin.apps.length = 1;
  (({ app } = require('../../../src/index')))
});

afterAll(() => {
  const { server } = require('../../../src/index');
  if (server) server.close();
});

const mockValidToken = (uid = 'test-user-123') => {
  admin.auth().verifyIdToken.mockResolvedValue({
    uid,
    email: 'test@example.com',
    email_verified: true
  });
};

const AUTH = { Authorization: 'Bearer valid-mock-token' };
const USER_ID = 'test-user-123';

// ==================== POST /api/duels ====================
describe('POST /api/duels', () => {
  const validBody = {
    opponentId: 'opponent-456',
    exercise: 'pushup',
    metric: 'rep_count'
  };

  it('should return 401 without auth', async () => {
    const res = await request(app).post('/api/duels').send(validBody);
    expect(res.status).toBe(401);
  });

  it('should return 400 when opponentId is missing', async () => {
    mockValidToken();
    const res = await request(app)
      .post('/api/duels')
      .set(AUTH)
      .send({ exercise: 'pushup', metric: 'rep_count' });
    expect(res.status).toBe(400);
  });

  it('should return 400 when metric is invalid', async () => {
    mockValidToken();
    const res = await request(app)
      .post('/api/duels')
      .set(AUTH)
      .send({ ...validBody, metric: 'invalid_metric' });
    expect(res.status).toBe(400);
  });

  it('should return 201 when duel is created successfully', async () => {
    mockValidToken();
    duelService.createDuel.mockResolvedValue({
      duelId: 'duel-001',
      challengerId: USER_ID,
      opponentId: 'opponent-456',
      status: 'pending'
    });

    const res = await request(app)
      .post('/api/duels')
      .set(AUTH)
      .send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.duel.duelId).toBe('duel-001');
  });

  it('should return 400 when duel already exists', async () => {
    mockValidToken();
    duelService.createDuel.mockRejectedValue(
      new Error('A duel already exists between these users')
    );

    const res = await request(app)
      .post('/api/duels')
      .set(AUTH)
      .send(validBody);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ==================== GET /api/duels ====================
describe('GET /api/duels', () => {
  it('should return 401 without auth', async () => {
    const res = await request(app).get('/api/duels');
    expect(res.status).toBe(401);
  });

  it('should return 200 with list of duels', async () => {
    mockValidToken();
    duelService.getUserDuels.mockResolvedValue([
      { duelId: 'd1', status: 'active' },
      { duelId: 'd2', status: 'pending' }
    ]);

    const res = await request(app).get('/api/duels').set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.duels).toHaveLength(2);
    expect(res.body.count).toBe(2);
  });

  it('should return 400 for invalid status query param', async () => {
    mockValidToken();
    const res = await request(app).get('/api/duels?status=invalid').set(AUTH);
    expect(res.status).toBe(400);
  });

  it('should return 200 with empty array when no duels', async () => {
    mockValidToken();
    duelService.getUserDuels.mockResolvedValue([]);

    const res = await request(app).get('/api/duels').set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.duels).toEqual([]);
  });
});

// ==================== GET /api/duels/stats/me ====================
describe('GET /api/duels/stats/me', () => {
  it('should return 401 without auth', async () => {
    const res = await request(app).get('/api/duels/stats/me');
    expect(res.status).toBe(401);
  });

  it('should return 200 with duel stats', async () => {
    mockValidToken();
    duelService.getDuelStats.mockResolvedValue({
      totalDuels: 10,
      wins: 7,
      losses: 2,
      draws: 1,
      winRate: 70
    });

    const res = await request(app).get('/api/duels/stats/me').set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.stats.wins).toBe(7);
    expect(res.body.stats.winRate).toBe(70);
  });
});

// ==================== PUT /api/duels/:duelId/accept ====================
describe('PUT /api/duels/:duelId/accept', () => {
  it('should return 401 without auth', async () => {
    const res = await request(app).put('/api/duels/duel-001/accept');
    expect(res.status).toBe(401);
  });

  it('should return 200 when duel is accepted', async () => {
    mockValidToken();
    duelService.acceptDuel.mockResolvedValue({ duelId: 'duel-001', status: 'active' });

    const res = await request(app)
      .put('/api/duels/duel-001/accept')
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('active');
  });

  it('should return 400 when duel cannot be accepted', async () => {
    mockValidToken();
    duelService.acceptDuel.mockRejectedValue(new Error('Duel cannot be accepted — current status: active'));

    const res = await request(app)
      .put('/api/duels/duel-001/accept')
      .set(AUTH);

    expect(res.status).toBe(400);
  });
});

// ==================== PUT /api/duels/:duelId/decline ====================
describe('PUT /api/duels/:duelId/decline', () => {
  it('should return 200 when duel is declined', async () => {
    mockValidToken();
    duelService.declineDuel.mockResolvedValue({ duelId: 'duel-001', status: 'declined' });

    const res = await request(app)
      .put('/api/duels/duel-001/decline')
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('declined');
  });
});

// ==================== POST /api/duels/:duelId/performance ====================
describe('POST /api/duels/:duelId/performance', () => {
  it('should return 401 without auth', async () => {
    const res = await request(app)
      .post('/api/duels/duel-001/performance')
      .send({ reps: 30 });
    expect(res.status).toBe(401);
  });

  it('should return 400 when no performance data provided', async () => {
    mockValidToken();
    const res = await request(app)
      .post('/api/duels/duel-001/performance')
      .set(AUTH)
      .send({});
    expect(res.status).toBe(400);
  });

  it('should return 200 when performance submitted and waiting for opponent', async () => {
    mockValidToken();
    duelService.submitPerformance.mockResolvedValue({
      duelId: 'duel-001',
      status: 'waiting_for_opponent'
    });

    const res = await request(app)
      .post('/api/duels/duel-001/performance')
      .set(AUTH)
      .send({ reps: 30, durationSeconds: 120 });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('waiting_for_opponent');
  });

  it('should return 200 with winner when duel is resolved', async () => {
    mockValidToken();
    duelService.submitPerformance.mockResolvedValue({
      duelId: 'duel-001',
      status: 'completed',
      winnerId: USER_ID
    });

    const res = await request(app)
      .post('/api/duels/duel-001/performance')
      .set(AUTH)
      .send({ reps: 35 });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('completed');
    expect(res.body.winnerId).toBe(USER_ID);
  });
});