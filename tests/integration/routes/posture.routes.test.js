/**
 * tests/integration/routes/posture.routes.test.js
 */

const request = require('supertest');
const admin = require('firebase-admin');

jest.mock('../../../src/services/public/postureService');
const postureService = require('../../../src/services/public/postureService');

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
    uid, email: 'test@example.com', email_verified: true
  });
};

const AUTH = { Authorization: 'Bearer valid-mock-token' };
const USER_ID = 'test-user-123';

const validExercise = {
  exerciseName: 'pushup',
  totalReps: 20,
  sets: 3,
  durationSeconds: 120,
  caloriesBurned: 80,
  avgFormScore: 88.5
};

// ==================== GET /api/posture/classifiers ====================
describe('GET /api/posture/classifiers', () => {
  it('should return 200 without auth (public endpoint)', async () => {
    postureService.getClassifiers.mockResolvedValue([
      { classifierId: 'pushup_classifier_v1', exerciseId: 'pushup' }
    ]);

    const res = await request(app).get('/api/posture/classifiers');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.classifiers).toHaveLength(1);
  });

  it('should return 200 with empty array when no classifiers', async () => {
    postureService.getClassifiers.mockResolvedValue([]);
    const res = await request(app).get('/api/posture/classifiers');
    expect(res.status).toBe(200);
    expect(res.body.classifiers).toEqual([]);
  });
});

// ==================== POST /api/posture/session ====================
describe('POST /api/posture/session', () => {
  it('should return 401 without auth', async () => {
    const res = await request(app)
      .post('/api/posture/session')
      .send({ exercises: [validExercise] });
    expect(res.status).toBe(401);
  });

  it('should return 400 when exercises is missing', async () => {
    mockValidToken();
    const res = await request(app)
      .post('/api/posture/session')
      .set(AUTH)
      .send({});
    expect(res.status).toBe(400);
  });

  it('should return 400 when exercises array is empty', async () => {
    mockValidToken();
    const res = await request(app)
      .post('/api/posture/session')
      .set(AUTH)
      .send({ exercises: [] });
    expect(res.status).toBe(400);
  });

  it('should return 400 when exercise is missing exerciseName', async () => {
    mockValidToken();
    const res = await request(app)
      .post('/api/posture/session')
      .set(AUTH)
      .send({ exercises: [{ totalReps: 20 }] });
    expect(res.status).toBe(400);
  });

  it('should return 201 when session is saved successfully', async () => {
    mockValidToken();
    postureService.submitPostureSession.mockResolvedValue({
      sessionId: 'session-001',
      overallFormScore: 88.5,
      exerciseCount: 1,
      exercises: [{ exerciseName: 'pushup', avgFormScore: 88.5 }]
    });

    const res = await request(app)
      .post('/api/posture/session')
      .set(AUTH)
      .send({ exercises: [validExercise] });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.sessionId).toBe('session-001');
  });
});

// ==================== GET /api/posture/session/:sessionId ====================
describe('GET /api/posture/session/:sessionId', () => {
  it('should return 401 without auth', async () => {
    const res = await request(app).get('/api/posture/session/session-001');
    expect(res.status).toBe(401);
  });

  it('should return 404 when session does not exist', async () => {
    mockValidToken();
    postureService.getSessionDetails.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/posture/session/nonexistent')
      .set(AUTH);

    expect(res.status).toBe(404);
  });

  it('should return 403 when accessing another users session', async () => {
    mockValidToken(USER_ID);
    postureService.getSessionDetails.mockResolvedValue({
      sessionId: 'session-001',
      userId: 'other-user-999'
    });

    const res = await request(app)
      .get('/api/posture/session/session-001')
      .set(AUTH);

    expect(res.status).toBe(403);
  });

  it('should return 200 for own session', async () => {
    mockValidToken(USER_ID);
    postureService.getSessionDetails.mockResolvedValue({
      sessionId: 'session-001',
      userId: USER_ID,
      overallFormScore: 88.5
    });

    const res = await request(app)
      .get('/api/posture/session/session-001')
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.session.sessionId).toBe('session-001');
  });
});

// ==================== GET /api/posture/history/:userId ====================
describe('GET /api/posture/history/:userId', () => {
  it('should return 401 without auth', async () => {
    const res = await request(app).get(`/api/posture/history/${USER_ID}`);
    expect(res.status).toBe(401);
  });

  it('should return 403 when accessing another users history', async () => {
    mockValidToken(USER_ID);
    const res = await request(app)
      .get('/api/posture/history/other-user-999')
      .set(AUTH);
    expect(res.status).toBe(403);
  });

  it('should return 200 with history', async () => {
    mockValidToken(USER_ID);
    postureService.getUserPostureHistory.mockResolvedValue([
      { sessionId: 's1', overallFormScore: 88 },
      { sessionId: 's2', overallFormScore: 92 }
    ]);

    const res = await request(app)
      .get(`/api/posture/history/${USER_ID}`)
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.history).toHaveLength(2);
  });
});


