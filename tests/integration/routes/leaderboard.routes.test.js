/**
 * tests/integration/routes/leaderboard.routes.test.js
 */

const request = require('supertest');
const admin = require('firebase-admin');

jest.mock('../../../src/services/public/leaderboardService');
const leaderboardService = require('../../../src/services/public/leaderboardService');

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
  admin.auth().verifyIdToken.mockResolvedValue({ uid, email: 'test@example.com', email_verified: true });
};

const AUTH    = { Authorization: 'Bearer valid-mock-token' };
const USER_ID = 'test-user-123';

// ==================== GET /api/leaderboard/global ====================
describe('GET /api/leaderboard/global', () => {
  it('should return 200 with leaderboard data', async () => {
    leaderboardService.getGlobalLeaderboard.mockResolvedValue([
      { rank: 1, userId: 'user-001', name: 'Alice', xp: 1500 },
      { rank: 2, userId: 'user-002', name: 'Bob',   xp: 1200 }
    ]);

    const res = await request(app).get('/api/leaderboard/global');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
  });

  it('should return 400 for invalid type', async () => {
    leaderboardService.getGlobalLeaderboard.mockRejectedValue(
      new Error('type must be one of: xp, streak, workouts, calories')
    );

    const res = await request(app).get('/api/leaderboard/global?type=invalid');
    expect(res.status).toBe(400);
  });

  it('should return 500 on service error', async () => {
    leaderboardService.getGlobalLeaderboard.mockRejectedValue(new Error('DB error'));

    const res = await request(app).get('/api/leaderboard/global');
    expect(res.status).toBe(500);
  });
});

// ==================== GET /api/leaderboard/friends ====================
describe('GET /api/leaderboard/friends', () => {
  it('should return 401 without auth', async () => {
    const res = await request(app).get('/api/leaderboard/friends');
    expect(res.status).toBe(401);
  });

  it('should return 200 with friends leaderboard', async () => {
    mockValidToken();
    leaderboardService.getFriendsLeaderboard.mockResolvedValue([
      { rank: 1, userId: 'user-002', name: 'Jane', xp: 900 }
    ]);

    const res = await request(app).get('/api/leaderboard/friends').set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('should return 400 for invalid type', async () => {
    mockValidToken();
    leaderboardService.getFriendsLeaderboard.mockRejectedValue(
      new Error('Invalid leaderboard type: bad')
    );

    const res = await request(app).get('/api/leaderboard/friends?type=bad').set(AUTH);
    expect(res.status).toBe(400);
  });
});

// ==================== GET /api/leaderboard/rank/:userId ====================
describe('GET /api/leaderboard/rank/:userId', () => {
  it('should return 200 with user rank', async () => {
    leaderboardService.getUserRank.mockResolvedValue({ rank: 5, userId: USER_ID, xp: 750 });

    const res = await request(app).get(`/api/leaderboard/rank/${USER_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.data.rank).toBe(5);
  });

  it('should return 404 when user has no progress', async () => {
    leaderboardService.getUserRank.mockResolvedValue(null);

    const res = await request(app).get(`/api/leaderboard/rank/${USER_ID}`);
    expect(res.status).toBe(404);
  });

  it('should return 400 for invalid type', async () => {
    leaderboardService.getUserRank.mockRejectedValue(new Error('Invalid leaderboard type: bad'));

    const res = await request(app).get(`/api/leaderboard/rank/${USER_ID}?type=bad`);
    expect(res.status).toBe(400);
  });
});
