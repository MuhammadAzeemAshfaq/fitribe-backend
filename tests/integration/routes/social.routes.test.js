/**
 * tests/integration/routes/social.routes.test.js
 */

const request = require('supertest');
const admin = require('firebase-admin');

jest.mock('../../../src/services/public/socialService');
const socialService = require('../../../src/services/public/socialService');

let app;
beforeAll(() => {
  admin.apps.length = 1;
  app = require('../../../src/index');
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

// ==================== GET /api/feed/:userId ====================
describe('GET /api/feed/:userId', () => {
  it('should return 401 without auth', async () => {
    const res = await request(app).get(`/api/feed/${USER_ID}`);
    expect(res.status).toBe(401);
  });

  it('should return 403 when accessing another users feed', async () => {
    mockValidToken(USER_ID);
    const res = await request(app)
      .get('/api/feed/other-user-999')
      .set(AUTH);
    expect(res.status).toBe(403);
  });

  it('should return 200 with feed', async () => {
    mockValidToken(USER_ID);
    socialService.getUserFeed.mockResolvedValue([
      { activityId: 'a1', type: 'badge_earned' },
      { activityId: 'a2', type: 'workout_completed' }
    ]);

    const res = await request(app)
      .get(`/api/feed/${USER_ID}`)
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.feed).toHaveLength(2);
  });
});

// ==================== POST /api/feed/follow ====================
describe('POST /api/feed/follow', () => {
  it('should return 401 without auth', async () => {
    const res = await request(app).post('/api/feed/follow').send({ followingId: 'user-002' });
    expect(res.status).toBe(401);
  });

  it('should return 400 when followingId is missing', async () => {
    mockValidToken();
    const res = await request(app).post('/api/feed/follow').set(AUTH).send({});
    expect(res.status).toBe(400);
  });

  it('should return 200 when follow is successful', async () => {
    mockValidToken(USER_ID);
    socialService.followUser.mockResolvedValue({
      followerId: USER_ID,
      followingId: 'user-002'
    });

    const res = await request(app)
      .post('/api/feed/follow')
      .set(AUTH)
      .send({ followingId: 'user-002' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should return 400 when already following', async () => {
    mockValidToken(USER_ID);
    socialService.followUser.mockRejectedValue(new Error('Already following this user'));

    const res = await request(app)
      .post('/api/feed/follow')
      .set(AUTH)
      .send({ followingId: 'user-002' });

    expect(res.status).toBe(400);
  });
});

// ==================== DELETE /api/feed/follow/:targetId ====================
describe('DELETE /api/feed/follow/:targetId', () => {
  it('should return 401 without auth', async () => {
    const res = await request(app).delete('/api/feed/follow/user-002');
    expect(res.status).toBe(401);
  });

  it('should return 200 when unfollow is successful', async () => {
    mockValidToken(USER_ID);
    socialService.unfollowUser.mockResolvedValue({
      followerId: USER_ID,
      followingId: 'user-002'
    });

    const res = await request(app)
      .delete('/api/feed/follow/user-002')
      .set(AUTH);

    expect(res.status).toBe(200);
  });
});

