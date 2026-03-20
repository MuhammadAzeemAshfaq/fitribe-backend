/**
 * tests/integration/routes/workoutplans.routes.test.js
 */

const request = require('supertest');
const admin = require('firebase-admin');

jest.mock('../../../src/services/public/workoutplanService');
const workoutPlanService = require('../../../src/services/public/workoutplanService');

let app;
beforeAll(() => {
  admin.apps.length = 1;
  (({ app } = require('../../../src/index')))
});

afterAll(() => {
  const { server } = require('../../../src/index');
  if (server) server.close();
});

// ==================== GET /api/workoutplans ====================
describe('GET /api/workoutplans', () => {
  it('should return 200 with workout plans', async () => {
    workoutPlanService.getAllWorkoutPlans.mockResolvedValue({
      plans: [
        { planId: 'plan-001', name: 'Beginner Full Body', difficulty: 'Easy' },
        { planId: 'plan-002', name: 'Core Crusher',       difficulty: 'Hard' }
      ],
      total: 2
    });

    const res = await request(app).get('/api/workoutplans');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.plans).toHaveLength(2);
  });

  it('should pass category and difficulty filters to service', async () => {
    workoutPlanService.getAllWorkoutPlans.mockResolvedValue({ plans: [], total: 0 });

    await request(app).get('/api/workoutplans?category=Core&difficulty=Hard');

    expect(workoutPlanService.getAllWorkoutPlans).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'Core', difficulty: 'Hard' })
    );
  });

  it('should return 500 on service error', async () => {
    workoutPlanService.getAllWorkoutPlans.mockRejectedValue(new Error('DB error'));

    const res = await request(app).get('/api/workoutplans');
    expect(res.status).toBe(500);
  });
});

// ==================== GET /api/workoutplans/categories ====================
describe('GET /api/workoutplans/categories', () => {
  it('should return 200 with categories', async () => {
    workoutPlanService.getCategories.mockResolvedValue(['Core', 'Strength', 'Cardio']);

    const res = await request(app).get('/api/workoutplans/categories');

    expect(res.status).toBe(200);
    expect(res.body.data.categories).toHaveLength(3);
  });

  it('should return 500 on service error', async () => {
    workoutPlanService.getCategories.mockRejectedValue(new Error('fail'));

    const res = await request(app).get('/api/workoutplans/categories');
    expect(res.status).toBe(500);
  });
});

// ==================== GET /api/workoutplans/:planId ====================
describe('GET /api/workoutplans/:planId', () => {
  it('should return 200 when plan is found', async () => {
    workoutPlanService.getWorkoutPlanById.mockResolvedValue({
      planId: 'plan-001',
      name: 'Beginner Full Body',
      exercises: []
    });

    const res = await request(app).get('/api/workoutplans/plan-001');

    expect(res.status).toBe(200);
    expect(res.body.data.planId).toBe('plan-001');
  });

  it('should return 404 when plan is not found', async () => {
    workoutPlanService.getWorkoutPlanById.mockResolvedValue(null);

    const res = await request(app).get('/api/workoutplans/nonexistent');
    expect(res.status).toBe(404);
  });

  it('should return 500 on service error', async () => {
    workoutPlanService.getWorkoutPlanById.mockRejectedValue(new Error('DB error'));

    const res = await request(app).get('/api/workoutplans/plan-001');
    expect(res.status).toBe(500);
  });
});
