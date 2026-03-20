/**
 * tests/integration/routes/exercises.routes.test.js
 */

const request = require('supertest');
const admin = require('firebase-admin');

jest.mock('../../../src/services/public/exerciseService');
const exerciseService = require('../../../src/services/public/exerciseService');

let app;
beforeAll(() => {
  admin.apps.length = 1;
  (({ app } = require('../../../src/index')))
});

afterAll(() => {
  const { server } = require('../../../src/index');
  if (server) server.close();
});

// ==================== GET /api/exercises ====================
describe('GET /api/exercises', () => {
  it('should return 200 with exercise list', async () => {
    exerciseService.getAllExercises.mockResolvedValue({
      exercises: [
        { exerciseId: 'ex-001', name: 'Pushup', category: 'Strength' },
        { exerciseId: 'ex-002', name: 'Squat',  category: 'Strength' }
      ],
      total: 2
    });

    const res = await request(app).get('/api/exercises');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.exercises).toHaveLength(2);
  });

  it('should pass category and difficulty query params to service', async () => {
    exerciseService.getAllExercises.mockResolvedValue({ exercises: [], total: 0 });

    await request(app).get('/api/exercises?category=Strength&difficulty=Easy');

    expect(exerciseService.getAllExercises).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'Strength', difficulty: 'Easy' })
    );
  });

  it('should return 500 on service error', async () => {
    exerciseService.getAllExercises.mockRejectedValue(new Error('DB error'));

    const res = await request(app).get('/api/exercises');
    expect(res.status).toBe(500);
  });
});

// ==================== GET /api/exercises/categories ====================
describe('GET /api/exercises/categories', () => {
  it('should return 200 with categories', async () => {
    exerciseService.getCategories.mockResolvedValue(['Strength', 'Cardio', 'Flexibility']);

    const res = await request(app).get('/api/exercises/categories');

    expect(res.status).toBe(200);
    expect(res.body.data.categories).toHaveLength(3);
  });

  it('should return 500 on service error', async () => {
    exerciseService.getCategories.mockRejectedValue(new Error('fail'));

    const res = await request(app).get('/api/exercises/categories');
    expect(res.status).toBe(500);
  });
});

// ==================== GET /api/exercises/byName/:name ====================
describe('GET /api/exercises/byName/:name', () => {
  it('should return 200 when exercise is found', async () => {
    exerciseService.getExerciseByName.mockResolvedValue({ exerciseId: 'ex-001', name: 'Pushup' });

    const res = await request(app).get('/api/exercises/byName/Pushup');

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Pushup');
  });

  it('should return 404 when exercise is not found', async () => {
    exerciseService.getExerciseByName.mockResolvedValue(null);

    const res = await request(app).get('/api/exercises/byName/UnknownExercise');
    expect(res.status).toBe(404);
  });
});

// ==================== GET /api/exercises/:exerciseId ====================
describe('GET /api/exercises/:exerciseId', () => {
  it('should return 200 when exercise is found', async () => {
    exerciseService.getExerciseById.mockResolvedValue({ exerciseId: 'ex-001', name: 'Pushup' });

    const res = await request(app).get('/api/exercises/ex-001');

    expect(res.status).toBe(200);
    expect(res.body.data.exerciseId).toBe('ex-001');
  });

  it('should return 404 when exercise is not found', async () => {
    exerciseService.getExerciseById.mockResolvedValue(null);

    const res = await request(app).get('/api/exercises/nonexistent');
    expect(res.status).toBe(404);
  });

  it('should return 500 on service error', async () => {
    exerciseService.getExerciseById.mockRejectedValue(new Error('DB error'));

    const res = await request(app).get('/api/exercises/ex-001');
    expect(res.status).toBe(500);
  });
});
