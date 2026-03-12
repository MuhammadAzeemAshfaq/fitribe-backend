/**
 * tests/integration/routes/progress.routes.test.js
 */

const request = require('supertest');
const admin = require('firebase-admin');

jest.mock('../../../services/public/progressService');
const progressService = require('../../../services/public/progressService');

let app;
beforeAll(() => {
  admin.apps.length = 1;
  app = require('../../../index');
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

// ==================== POST /api/progress/session ====================
describe('POST /api/progress/session', () => {
  const validBody = {
    userId: USER_ID,
    exercises: [{ exerciseName: 'Push Up', caloriesBurned: 80, totalReps: 20 }],
    durationMinutes: 30
  };

  it('should return 401 without auth token', async () => {
    const res = await request(app).post('/api/progress/session').send(validBody);
    expect(res.status).toBe(401);
  });

  it('should return 400 when exercises array is empty', async () => {
    mockValidToken();

    const res = await request(app)
      .post('/api/progress/session')
      .set(AUTH)
      .send({ ...validBody, exercises: [] });

    expect(res.status).toBe(400);
  });

  it('should return 400 when durationMinutes is 0', async () => {
    mockValidToken();

    const res = await request(app)
      .post('/api/progress/session')
      .set(AUTH)
      .send({ ...validBody, durationMinutes: 0 });

    expect(res.status).toBe(400);
  });

  it('should return 400 when durationMinutes exceeds 600', async () => {
    mockValidToken();

    const res = await request(app)
      .post('/api/progress/session')
      .set(AUTH)
      .send({ ...validBody, durationMinutes: 601 });

    expect(res.status).toBe(400);
  });

  it('should return 200 with session data for valid request', async () => {
    mockValidToken(USER_ID);
    progressService.recordWorkoutSession.mockResolvedValue({
      sessionId: 'session-new-1',
      totalCalories: 80,
      avgFormScore: 0.85
    });

    const res = await request(app)
      .post('/api/progress/session')
      .set(AUTH)
      .send(validBody);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.sessionId).toBe('session-new-1');
  });

  it('should return 403 when userId does not match token uid', async () => {
    mockValidToken('different-uid');

    const res = await request(app)
      .post('/api/progress/session')
      .set(AUTH)
      .send({ ...validBody, userId: USER_ID });

    expect(res.status).toBe(403);
  });
});

// ==================== GET /api/progress/:userId ====================
describe('GET /api/progress/:userId', () => {
  it('should return 401 without auth', async () => {
    const res = await request(app).get(`/api/progress/${USER_ID}`);
    expect(res.status).toBe(401);
  });

  it('should return 403 when accessing another user\'s progress', async () => {
    mockValidToken('other-user');

    const res = await request(app)
      .get(`/api/progress/${USER_ID}`)
      .set(AUTH);

    expect(res.status).toBe(403);
  });

  it('should return 200 with progress data', async () => {
    mockValidToken(USER_ID);
    progressService.getUserProgress.mockResolvedValue({
      totalWorkouts: 20,
      currentStreak: 5,
      level: 3
    });

    const res = await request(app)
      .get(`/api/progress/${USER_ID}`)
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should return 404 when user has no progress data', async () => {
    mockValidToken(USER_ID);
    progressService.getUserProgress.mockResolvedValue(null);

    const res = await request(app)
      .get(`/api/progress/${USER_ID}`)
      .set(AUTH);

    expect(res.status).toBe(404);
  });

  it('should return 400 for invalid period query param', async () => {
    mockValidToken(USER_ID);

    const res = await request(app)
      .get(`/api/progress/${USER_ID}?period=quarterly`)
      .set(AUTH);

    expect(res.status).toBe(400);
  });

  it('should accept valid period=week', async () => {
    mockValidToken(USER_ID);
    progressService.getUserProgress.mockResolvedValue({ totalWorkouts: 3 });

    const res = await request(app)
      .get(`/api/progress/${USER_ID}?period=week`)
      .set(AUTH);

    expect(res.status).toBe(200);
  });
});

// ==================== GET /api/progress/:userId/stats ====================
describe('GET /api/progress/:userId/stats', () => {
  it('should return 401 without auth', async () => {
    const res = await request(app).get(`/api/progress/${USER_ID}/stats`);
    expect(res.status).toBe(401);
  });

  it('should return 200 with stats data', async () => {
    mockValidToken(USER_ID);
    progressService.getWorkoutStatistics.mockResolvedValue({
      totalWorkouts: 20,
      avgDuration: 35
    });

    const res = await request(app)
      .get(`/api/progress/${USER_ID}/stats`)
      .set(AUTH);

    expect(res.status).toBe(200);
  });
});
