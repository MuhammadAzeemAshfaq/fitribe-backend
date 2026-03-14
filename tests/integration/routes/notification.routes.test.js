/**
 * tests/integration/routes/notification.routes.test.js
 */

const request = require('supertest');
const admin = require('firebase-admin');

jest.mock('../../../src/services/public/notificationService');
const notificationService = require('../../../src/services/public/notificationService');

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

// ==================== POST /api/notifications/token ====================
describe('POST /api/notifications/token', () => {
  it('should return 401 without auth', async () => {
    const res = await request(app).post('/api/notifications/token').send({ token: 'abc' });
    expect(res.status).toBe(401);
  });

  it('should return 400 when token is missing', async () => {
    mockValidToken();
    const res = await request(app)
      .post('/api/notifications/token')
      .set(AUTH)
      .send({});
    expect(res.status).toBe(400);
  });

  it('should return 200 when token is saved', async () => {
    mockValidToken();
    notificationService.saveDeviceToken.mockResolvedValue(true);

    const res = await request(app)
      .post('/api/notifications/token')
      .set(AUTH)
      .send({ token: 'fcm-token-abc' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ==================== GET /api/notifications/:userId ====================
describe('GET /api/notifications/:userId', () => {
  it('should return 401 without auth', async () => {
    const res = await request(app).get(`/api/notifications/${USER_ID}`);
    expect(res.status).toBe(401);
  });

  it('should return 403 when accessing another users notifications', async () => {
    mockValidToken(USER_ID);
    const res = await request(app)
      .get('/api/notifications/other-user-999')
      .set(AUTH);
    expect(res.status).toBe(403);
  });

  it('should return 200 with notifications and unread count', async () => {
    mockValidToken(USER_ID);
    notificationService.getUserNotifications.mockResolvedValue([
      { notificationId: 'n1', title: 'Badge!', read: false }
    ]);
    notificationService.getUnreadCount.mockResolvedValue(1);

    const res = await request(app)
      .get(`/api/notifications/${USER_ID}`)
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.notifications).toHaveLength(1);
    expect(res.body.unreadCount).toBe(1);
  });
});

// ==================== PUT /api/notifications/:userId/read-all ====================
describe('PUT /api/notifications/:userId/read-all', () => {
  it('should return 401 without auth', async () => {
    const res = await request(app).put(`/api/notifications/${USER_ID}/read-all`);
    expect(res.status).toBe(401);
  });

  it('should return 200 with updated count', async () => {
    mockValidToken(USER_ID);
    notificationService.markAllAsRead.mockResolvedValue(3);

    const res = await request(app)
      .put(`/api/notifications/${USER_ID}/read-all`)
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.updatedCount).toBe(3);
  });
});

// ==================== PUT /api/notifications/:notificationId/read ====================
describe('PUT /api/notifications/:notificationId/read', () => {
  it('should return 401 without auth', async () => {
    const res = await request(app).put('/api/notifications/notif-001/read');
    expect(res.status).toBe(401);
  });

  it('should return 200 when marked as read', async () => {
    mockValidToken(USER_ID);
    notificationService.markAsRead.mockResolvedValue(true);

    const res = await request(app)
      .put('/api/notifications/notif-001/read')
      .set(AUTH);

    expect(res.status).toBe(200);
  });

  it('should return 404 when notification does not exist', async () => {
    mockValidToken(USER_ID);
    notificationService.markAsRead.mockRejectedValue(new Error('Notification not found'));

    const res = await request(app)
      .put('/api/notifications/nonexistent/read')
      .set(AUTH);

    expect(res.status).toBe(404);
  });
});