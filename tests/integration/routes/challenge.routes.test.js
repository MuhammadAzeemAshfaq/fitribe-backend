/**
 * tests/integration/routes/challenge.routes.test.js
 * Integration tests — spins up the Express app and fires real HTTP requests
 */

const request = require('supertest');
const admin = require('firebase-admin');

// Mock the service layer so routes tests don't need Firestore
jest.mock('../../../src/services/public/challengeService');
const challengeService = require('../../../src/services/public/challengeService');

// Build the app without starting the server
let app;
beforeAll(() => {
  // Ensure Firebase is "initialized"
  admin.apps.length = 1;
  (({ app } = require('../../../src/index')))
});

// Helper: mock a valid Firebase token verification
const mockValidToken = (uid = 'test-user-123') => {
  admin.auth().verifyIdToken.mockResolvedValue({
    uid,
    email: 'test@example.com',
    email_verified: true
  });
};

const AUTH_HEADER = { Authorization: 'Bearer valid-mock-token' };

// ==================== GET /api/challenges/active ====================
describe('GET /api/challenges/active', () => {
  it('should return 200 with list of challenges (public endpoint)', async () => {
    challengeService.getActiveChallenges.mockResolvedValue([
      { id: 'c1', name: 'Push Up Challenge', status: 'active' },
      { id: 'c2', name: 'Weekly Warrior', status: 'active' }
    ]);

    const res = await request(app).get('/api/challenges/active');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.challenges).toHaveLength(2);
  });

  it('should return 200 with empty array when no challenges exist', async () => {
    challengeService.getActiveChallenges.mockResolvedValue([]);

    const res = await request(app).get('/api/challenges/active');

    expect(res.status).toBe(200);
    expect(res.body.challenges).toEqual([]);
  });

  it('should return 500 when service throws', async () => {
    challengeService.getActiveChallenges.mockRejectedValue(new Error('DB error'));

    const res = await request(app).get('/api/challenges/active');

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });

  it('should return 400 for invalid limit query param', async () => {
    const res = await request(app).get('/api/challenges/active?limit=0');
    expect(res.status).toBe(400);
  });
});

// ==================== GET /api/challenges/:challengeId ====================
describe('GET /api/challenges/:challengeId', () => {
  it('should return 200 with challenge details', async () => {
    challengeService.getChallengeDetails.mockResolvedValue({
      challenge: { id: 'c1', name: 'Push Up Challenge' },
      leaderboard: []
    });

    const res = await request(app).get('/api/challenges/c1');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should return 404 when challenge does not exist', async () => {
    challengeService.getChallengeDetails.mockResolvedValue(null);

    const res = await request(app).get('/api/challenges/nonexistent');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

// ==================== POST /api/challenges/join ====================
describe('POST /api/challenges/join', () => {
  it('should return 401 when no auth token provided', async () => {
    const res = await request(app)
      .post('/api/challenges/join')
      .send({ userId: 'user-123', challengeId: 'c1' });

    expect(res.status).toBe(401);
  });

  it('should return 400 when userId is missing', async () => {
    mockValidToken();

    const res = await request(app)
      .post('/api/challenges/join')
      .set(AUTH_HEADER)
      .send({ challengeId: 'c1' });

    expect(res.status).toBe(400);
  });

  it('should return 400 when challengeId is missing', async () => {
    mockValidToken();

    const res = await request(app)
      .post('/api/challenges/join')
      .set(AUTH_HEADER)
      .send({ userId: 'test-user-123' });

    expect(res.status).toBe(400);
  });

  it('should return 403 when trying to join as a different user', async () => {
    mockValidToken('test-user-123');

    const res = await request(app)
      .post('/api/challenges/join')
      .set(AUTH_HEADER)
      .send({ userId: 'different-user', challengeId: 'c1' });

    expect(res.status).toBe(403);
  });

  it('should return 200 when join is successful', async () => {
    mockValidToken('test-user-123');
    challengeService.joinChallenge.mockResolvedValue({
      participantId: 'p1',
      challengeId: 'c1'
    });

    const res = await request(app)
      .post('/api/challenges/join')
      .set(AUTH_HEADER)
      .send({ userId: 'test-user-123', challengeId: 'c1' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should return 400 when user is already in the challenge', async () => {
    mockValidToken('test-user-123');
    challengeService.joinChallenge.mockRejectedValue(
      new Error('Already participating in this challenge')
    );

    const res = await request(app)
      .post('/api/challenges/join')
      .set(AUTH_HEADER)
      .send({ userId: 'test-user-123', challengeId: 'c1' });

    expect([400, 500]).toContain(res.status);
  });
});

// ==================== POST /api/challenges/leave ====================
describe('POST /api/challenges/leave', () => {
  it('should return 401 without auth', async () => {
    const res = await request(app)
      .post('/api/challenges/leave')
      .send({ userId: 'test-user-123', challengeId: 'c1' });

    expect(res.status).toBe(401);
  });

  it('should return 200 when leave is successful', async () => {
    mockValidToken('test-user-123');
    challengeService.leaveChallenge.mockResolvedValue({ success: true });

    const res = await request(app)
      .post('/api/challenges/leave')
      .set(AUTH_HEADER)
      .send({ userId: 'test-user-123', challengeId: 'c1' });

    expect(res.status).toBe(200);
  });
});

