/**
 * tests/integration/routes/user.routes.test.js
 */

const request = require('supertest');
const admin = require('firebase-admin');

jest.mock('../../../src/services/public/userService');
const userService = require('../../../src/services/public/userService');

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
  admin.auth().verifyIdToken.mockResolvedValue({ uid, email: 'test@example.com', email_verified: true });
};

const AUTH    = { Authorization: 'Bearer valid-mock-token' };
const USER_ID = 'test-user-123';

// ==================== POST /api/users/register ====================
describe('POST /api/users/register', () => {
  it('should return 401 without auth', async () => {
    const res = await request(app).post('/api/users/register').send({ name: 'John' });
    expect(res.status).toBe(401);
  });

  it('should return 400 when name is missing', async () => {
    mockValidToken();
    const res = await request(app).post('/api/users/register').set(AUTH).send({});
    expect(res.status).toBe(400);
  });

  it('should return 201 when user is registered successfully', async () => {
    mockValidToken();
    userService.registerUser.mockResolvedValue({
      alreadyExists: false,
      user: { uid: USER_ID, name: 'John' }
    });

    const res = await request(app).post('/api/users/register').set(AUTH).send({ name: 'John' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('should return 200 when user already exists', async () => {
    mockValidToken();
    userService.registerUser.mockResolvedValue({
      alreadyExists: true,
      user: { uid: USER_ID, name: 'John' }
    });

    const res = await request(app).post('/api/users/register').set(AUTH).send({ name: 'John' });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/already registered/);
  });

  it('should return 500 on service error', async () => {
    mockValidToken();
    userService.registerUser.mockRejectedValue(new Error('DB error'));

    const res = await request(app).post('/api/users/register').set(AUTH).send({ name: 'John' });
    expect(res.status).toBe(500);
  });
});

// ==================== GET /api/users/:userId/profile ====================
describe('GET /api/users/:userId/profile', () => {
  it('should return 200 with profile (unauthenticated)', async () => {
    userService.getUserProfile.mockResolvedValue({ uid: USER_ID, name: 'John' });

    const res = await request(app).get(`/api/users/${USER_ID}/profile`);

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('John');
  });

  it('should return 404 when user not found', async () => {
    userService.getUserProfile.mockResolvedValue(null);

    const res = await request(app).get(`/api/users/nonexistent/profile`);
    expect(res.status).toBe(404);
  });

  it('should include isFollowing when authenticated as a different user', async () => {
    mockValidToken('other-user');
    userService.getUserProfile.mockResolvedValue({ uid: USER_ID, name: 'John' });
    userService.isFollowing.mockResolvedValue(true);

    const res = await request(app).get(`/api/users/${USER_ID}/profile`).set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.data.isFollowing).toBe(true);
  });
});

// ==================== PATCH /api/users/:userId/profile ====================
describe('PATCH /api/users/:userId/profile', () => {
  it('should return 401 without auth', async () => {
    const res = await request(app).patch(`/api/users/${USER_ID}/profile`).send({ bio: 'Hello' });
    expect(res.status).toBe(401);
  });

  it('should return 200 when profile updated', async () => {
    mockValidToken(USER_ID);
    userService.updateUserProfile.mockResolvedValue({ uid: USER_ID, bio: 'Hello' });

    const res = await request(app)
      .patch(`/api/users/${USER_ID}/profile`)
      .set(AUTH)
      .send({ bio: 'Hello' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should return 400 when no valid fields are provided', async () => {
    mockValidToken(USER_ID);
    userService.updateUserProfile.mockRejectedValue(new Error('No valid fields provided for update'));

    const res = await request(app)
      .patch(`/api/users/${USER_ID}/profile`)
      .set(AUTH)
      .send({});

    expect(res.status).toBe(400);
  });
});

// ==================== POST /api/users/follow ====================
describe('POST /api/users/follow', () => {
  it('should return 401 without auth', async () => {
    const res = await request(app).post('/api/users/follow').send({ followingId: 'user-002' });
    expect(res.status).toBe(401);
  });

  it('should return 200 when followed successfully', async () => {
    mockValidToken(USER_ID);
    userService.followUser.mockResolvedValue({ message: 'Now following' });

    const res = await request(app).post('/api/users/follow').set(AUTH).send({ followingId: 'user-002' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should return 400 when already following', async () => {
    mockValidToken(USER_ID);
    userService.followUser.mockRejectedValue(new Error('Already following this user'));

    const res = await request(app).post('/api/users/follow').set(AUTH).send({ followingId: 'user-002' });
    expect(res.status).toBe(400);
  });
});

// ==================== POST /api/users/unfollow ====================
describe('POST /api/users/unfollow', () => {
  it('should return 401 without auth', async () => {
    const res = await request(app).post('/api/users/unfollow').send({ followingId: 'user-002' });
    expect(res.status).toBe(401);
  });

  it('should return 200 when unfollowed successfully', async () => {
    mockValidToken(USER_ID);
    userService.unfollowUser.mockResolvedValue({ message: 'Unfollowed' });

    const res = await request(app).post('/api/users/unfollow').set(AUTH).send({ followingId: 'user-002' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should return 400 when not following the user', async () => {
    mockValidToken(USER_ID);
    userService.unfollowUser.mockRejectedValue(new Error('You are not following this user'));

    const res = await request(app).post('/api/users/unfollow').set(AUTH).send({ followingId: 'user-002' });
    expect(res.status).toBe(400);
  });
});

// ==================== GET /api/users/:userId/followers ====================
describe('GET /api/users/:userId/followers', () => {
  it('should return 200 with followers list', async () => {
    userService.getFollowers.mockResolvedValue([{ userId: 'user-002', name: 'Jane' }]);

    const res = await request(app).get(`/api/users/${USER_ID}/followers`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('should return 500 on service error', async () => {
    userService.getFollowers.mockRejectedValue(new Error('DB error'));

    const res = await request(app).get(`/api/users/${USER_ID}/followers`);
    expect(res.status).toBe(500);
  });
});

// ==================== GET /api/users/:userId/following ====================
describe('GET /api/users/:userId/following', () => {
  it('should return 200 with following list', async () => {
    userService.getFollowing.mockResolvedValue([{ userId: 'user-003', name: 'Bob' }]);

    const res = await request(app).get(`/api/users/${USER_ID}/following`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('should return 500 on service error', async () => {
    userService.getFollowing.mockRejectedValue(new Error('DB error'));

    const res = await request(app).get(`/api/users/${USER_ID}/following`);
    expect(res.status).toBe(500);
  });
});
