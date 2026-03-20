/**
 * tests/integration/routes/badge.routes.test.js
 */

const request = require('supertest');
const admin = require('firebase-admin');

jest.mock('../../../src/services/public/badgeService');
const badgeService = require('../../../src/services/public/badgeService');

let app;
beforeAll(() => {
  admin.apps.length = 1;
  (({ app } = require('../../../src/index')))
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

// ==================== GET /api/badges ====================
describe('GET /api/badges', () => {
  it('should return 200 with badges list (public)', async () => {
    badgeService.getAllBadges.mockResolvedValue([
      { id: 'b1', name: 'First Workout', category: 'milestone' },
      { id: 'b2', name: 'Week Warrior', category: 'streak' }
    ]);

    const res = await request(app).get('/api/badges');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.badges).toHaveLength(2);
  });

  it('should return 400 for limit > 100', async () => {
    const res = await request(app).get('/api/badges?limit=200');
    expect(res.status).toBe(400);
  });
});

// ==================== GET /api/badges/:badgeId ====================
describe('GET /api/badges/:badgeId', () => {
  it('should return 200 for a valid badge', async () => {
    // This calls Firestore directly in the controller, so mock db
    const db = admin.firestore();
    db.collection.mockReturnThis();
    db.doc.mockReturnThis();
    db.get.mockResolvedValue(mockDoc({ name: 'Week Warrior', category: 'streak' }, 'b1'));

    const res = await request(app).get('/api/badges/b1');

    expect(res.status).toBe(200);
  });

  it('should return 404 for non-existent badge', async () => {
    const db = admin.firestore();
    db.collection.mockReturnThis();
    db.doc.mockReturnThis();
    db.get.mockResolvedValue(mockDoc(null));

    const res = await request(app).get('/api/badges/nonexistent');

    expect(res.status).toBe(404);
  });
});

// ==================== GET /api/badges/user/:userId ====================
describe('GET /api/badges/user/:userId', () => {
  it('should return 401 without auth', async () => {
    const res = await request(app).get(`/api/badges/user/${USER_ID}`);
    expect(res.status).toBe(401);
  });

  it('should return 403 accessing another user\'s badges', async () => {
    mockValidToken('other-user');

    const res = await request(app)
      .get(`/api/badges/user/${USER_ID}`)
      .set(AUTH);

    expect(res.status).toBe(403);
  });

  it('should return 200 for own badges', async () => {
    mockValidToken(USER_ID);
    badgeService.getUserBadgesWithLocked.mockResolvedValue({
      earned: [{ id: 'b1', name: 'First Workout' }],
      locked: []
    });

    const res = await request(app)
      .get(`/api/badges/user/${USER_ID}`)
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ==================== GET /api/badges/user/:userId/progress ====================
describe('GET /api/badges/user/:userId/progress', () => {
  it('should return 401 without auth', async () => {
    const res = await request(app).get(`/api/badges/user/${USER_ID}/progress`);
    expect(res.status).toBe(401);
  });

  it('should return 200 with badge progress', async () => {
    mockValidToken(USER_ID);
    badgeService.getAvailableBadges.mockResolvedValue([
      { id: 'b2', name: 'Week Warrior', progress: 70 }
    ]);

    const res = await request(app)
      .get(`/api/badges/user/${USER_ID}/progress`)
      .set(AUTH);

    expect(res.status).toBe(200);
  });
});


