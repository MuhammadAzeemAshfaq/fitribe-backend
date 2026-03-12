/**
 * tests/unit/middleware/validation.test.js
 * Unit tests for all validation middleware functions
 */

const {
  validateWorkoutSession,
  validateChallengeJoin,
  validateChallengeCreation,
  validatePagination,
  validatePeriod,
  validateIdParam,
  sanitizeInput
} = require('../../../src/middleware/validation');

// ==================== validateWorkoutSession ====================
describe('validateWorkoutSession', () => {
  const validBody = {
    userId: 'user-123',
    exercises: [{ exerciseName: 'Push Up', caloriesBurned: 50, totalReps: 10 }],
    durationMinutes: 30
  };

  it('should call next() for valid workout session data', () => {
    const req = mockReq({ body: validBody });
    const res = mockRes();
    const next = mockNext();

    validateWorkoutSession(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should return 400 when userId is missing', () => {
    const req = mockReq({ body: { ...validBody, userId: undefined } });
    const res = mockRes();
    const next = mockNext();

    validateWorkoutSession(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 400 when exercises array is empty', () => {
    const req = mockReq({ body: { ...validBody, exercises: [] } });
    const res = mockRes();
    const next = mockNext();

    validateWorkoutSession(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should return 400 when exercises is not an array', () => {
    const req = mockReq({ body: { ...validBody, exercises: 'not-an-array' } });
    const res = mockRes();
    const next = mockNext();

    validateWorkoutSession(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should return 400 when durationMinutes is 0', () => {
    const req = mockReq({ body: { ...validBody, durationMinutes: 0 } });
    const res = mockRes();
    const next = mockNext();

    validateWorkoutSession(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should return 400 when durationMinutes exceeds 600', () => {
    const req = mockReq({ body: { ...validBody, durationMinutes: 601 } });
    const res = mockRes();
    const next = mockNext();

    validateWorkoutSession(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should return 400 when exercise has negative caloriesBurned', () => {
    const req = mockReq({
      body: {
        ...validBody,
        exercises: [{ exerciseName: 'Push Up', caloriesBurned: -10 }]
      }
    });
    const res = mockRes();
    const next = mockNext();

    validateWorkoutSession(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should return 400 when exercise is missing exerciseName', () => {
    const req = mockReq({
      body: {
        ...validBody,
        exercises: [{ caloriesBurned: 50 }]
      }
    });
    const res = mockRes();
    const next = mockNext();

    validateWorkoutSession(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

// ==================== validateChallengeJoin ====================
describe('validateChallengeJoin', () => {
  it('should call next() for valid join data', () => {
    const req = mockReq({
      body: { userId: 'user-123', challengeId: 'challenge-456' }
    });
    const res = mockRes();
    const next = mockNext();

    validateChallengeJoin(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should return 400 when userId is missing', () => {
    const req = mockReq({ body: { challengeId: 'challenge-456' } });
    const res = mockRes();
    const next = mockNext();

    validateChallengeJoin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 400 when challengeId is missing', () => {
    const req = mockReq({ body: { userId: 'user-123' } });
    const res = mockRes();
    const next = mockNext();

    validateChallengeJoin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });
});

// ==================== validatePagination ====================
describe('validatePagination', () => {
  it('should call next() with no query params', () => {
    const req = mockReq({ query: {} });
    const res = mockRes();
    const next = mockNext();

    validatePagination(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should parse valid limit and offset to integers', () => {
    const req = mockReq({ query: { limit: '20', offset: '10' } });
    const res = mockRes();
    const next = mockNext();

    validatePagination(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.query.limit).toBe(20);
    expect(req.query.offset).toBe(10);
  });

  it('should return 400 for limit of 0', () => {
    const req = mockReq({ query: { limit: '0' } });
    const res = mockRes();
    const next = mockNext();

    validatePagination(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should return 400 for limit exceeding 100', () => {
    const req = mockReq({ query: { limit: '101' } });
    const res = mockRes();
    const next = mockNext();

    validatePagination(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should return 400 for negative offset', () => {
    const req = mockReq({ query: { offset: '-1' } });
    const res = mockRes();
    const next = mockNext();

    validatePagination(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

// ==================== validatePeriod ====================
describe('validatePeriod', () => {
  it('should call next() for valid period "week"', () => {
    const req = mockReq({ query: { period: 'week' } });
    const res = mockRes();
    const next = mockNext();

    validatePeriod(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should call next() for valid period "month"', () => {
    const req = mockReq({ query: { period: 'month' } });
    const res = mockRes();
    const next = mockNext();

    validatePeriod(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should call next() when period is absent', () => {
    const req = mockReq({ query: {} });
    const res = mockRes();
    const next = mockNext();

    validatePeriod(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should return 400 for invalid period value', () => {
    const req = mockReq({ query: { period: 'quarterly' } });
    const res = mockRes();
    const next = mockNext();

    validatePeriod(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });
});

// ==================== validateIdParam ====================
describe('validateIdParam', () => {
  it('should call next() when param exists', () => {
    const middleware = validateIdParam('userId');
    const req = mockReq({ params: { userId: 'user-123' } });
    const res = mockRes();
    const next = mockNext();

    middleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should return 400 when param is missing', () => {
    const middleware = validateIdParam('userId');
    const req = mockReq({ params: {} });
    const res = mockRes();
    const next = mockNext();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 400 when param is empty string', () => {
    const middleware = validateIdParam('userId');
    const req = mockReq({ params: { userId: '   ' } });
    const res = mockRes();
    const next = mockNext();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

// ==================== sanitizeInput ====================
describe('sanitizeInput', () => {
  it('should remove null bytes from body strings', () => {
    const req = mockReq({ body: { name: 'test\0value' } });
    const res = mockRes();
    const next = mockNext();

    sanitizeInput(req, res, next);

    expect(req.body.name).toBe('testvalue');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should handle nested objects', () => {
    const req = mockReq({
      body: { user: { name: 'test\0name', age: 25 } }
    });
    const res = mockRes();
    const next = mockNext();

    sanitizeInput(req, res, next);

    expect(req.body.user.name).toBe('testname');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should pass through arrays untouched if clean', () => {
    const req = mockReq({ body: { items: ['a', 'b', 'c'] } });
    const res = mockRes();
    const next = mockNext();

    sanitizeInput(req, res, next);

    expect(req.body.items).toEqual(['a', 'b', 'c']);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
