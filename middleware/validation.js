/**
 * Validation Middleware
 * Validates request data before processing
 */

// ==================== VALIDATE WORKOUT SESSION ====================
function validateWorkoutSession(req, res, next) {
  const { userId, exercises, durationMinutes } = req.body;
  const errors = [];
  
  // Required fields
  if (!userId || typeof userId !== 'string') {
    errors.push('userId is required and must be a string');
  }
  
  if (!exercises || !Array.isArray(exercises) || exercises.length === 0) {
    errors.push('exercises must be a non-empty array');
  } else {
    // Validate each exercise
    exercises.forEach((exercise, index) => {
      if (!exercise.exerciseName) {
        errors.push(`exercises[${index}].exerciseName is required`);
      }
      if (exercise.caloriesBurned !== undefined && exercise.caloriesBurned < 0) {
        errors.push(`exercises[${index}].caloriesBurned cannot be negative`);
      }
      if (exercise.totalReps !== undefined && exercise.totalReps < 0) {
        errors.push(`exercises[${index}].totalReps cannot be negative`);
      }
    });
  }
  
  if (!durationMinutes || durationMinutes <= 0) {
    errors.push('durationMinutes must be greater than 0');
  }
  
  if (durationMinutes > 600) {
    errors.push('durationMinutes cannot exceed 600 (10 hours)');
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      errors
    });
  }
  
  next();
}

// ==================== VALIDATE CHALLENGE JOIN ====================
function validateChallengeJoin(req, res, next) {
  const { userId, challengeId } = req.body;
  const errors = [];
  
  if (!userId || typeof userId !== 'string') {
    errors.push('userId is required and must be a string');
  }
  
  if (!challengeId || typeof challengeId !== 'string') {
    errors.push('challengeId is required and must be a string');
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      errors
    });
  }
  
  next();
}

// ==================== VALIDATE PAGINATION ====================
function validatePagination(req, res, next) {
  const { limit, offset, page } = req.query;
  
  if (limit !== undefined) {
    const limitNum = parseInt(limit);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        error: 'limit must be between 1 and 100'
      });
    }
    req.query.limit = limitNum;
  }
  
  if (offset !== undefined) {
    const offsetNum = parseInt(offset);
    if (isNaN(offsetNum) || offsetNum < 0) {
      return res.status(400).json({
        success: false,
        error: 'offset must be 0 or greater'
      });
    }
    req.query.offset = offsetNum;
  }
  
  if (page !== undefined) {
    const pageNum = parseInt(page);
    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        success: false,
        error: 'page must be 1 or greater'
      });
    }
    req.query.page = pageNum;
  }
  
  next();
}

// ==================== VALIDATE PERIOD ====================
function validatePeriod(req, res, next) {
  const { period } = req.query;
  const validPeriods = ['week', 'month', 'year', 'all'];
  
  if (period && !validPeriods.includes(period)) {
    return res.status(400).json({
      success: false,
      error: `period must be one of: ${validPeriods.join(', ')}`
    });
  }
  
  next();
}

// ==================== VALIDATE STATUS ====================
function validateStatus(validStatuses) {
  return (req, res, next) => {
    const { status } = req.query;
    
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `status must be one of: ${validStatuses.join(', ')}`
      });
    }
    
    next();
  };
}

// ==================== VALIDATE ID PARAM ====================
function validateIdParam(paramName = 'id') {
  return (req, res, next) => {
    const id = req.params[paramName];
    
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: `${paramName} is required and must be a non-empty string`
      });
    }
    
    next();
  };
}

// ==================== SANITIZE INPUT ====================
function sanitizeInput(req, res, next) {
  // Remove any null bytes from strings
  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      return obj.replace(/\0/g, '');
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }
    if (obj && typeof obj === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitize(value);
      }
      return sanitized;
    }
    return obj;
  };
  
  req.body = sanitize(req.body);
  req.query = sanitize(req.query);
  req.params = sanitize(req.params);
  
  next();
}

// ==================== VALIDATE CHALLENGE CREATION ====================
function validateChallengeCreation(req, res, next) {
  const { name, type, goal, startDate, endDate } = req.body;
  const errors = [];
  
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push('name is required and must be a non-empty string');
  }
  
  if (name && name.length > 100) {
    errors.push('name cannot exceed 100 characters');
  }
  
  const validTypes = ['exercise_count', 'calories', 'duration', 'workout_count'];
  if (!type || !validTypes.includes(type)) {
    errors.push(`type must be one of: ${validTypes.join(', ')}`);
  }
  
  if (!goal || typeof goal !== 'object') {
    errors.push('goal is required and must be an object');
  } else {
    if (!goal.targetValue || goal.targetValue <= 0) {
      errors.push('goal.targetValue must be greater than 0');
    }
    if (goal.targetValue > 1000000) {
      errors.push('goal.targetValue cannot exceed 1,000,000');
    }
  }
  
  if (!startDate) {
    errors.push('startDate is required');
  }
  
  if (!endDate) {
    errors.push('endDate is required');
  }
  
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime())) {
      errors.push('startDate must be a valid date');
    }
    
    if (isNaN(end.getTime())) {
      errors.push('endDate must be a valid date');
    }
    
    if (start.getTime() >= end.getTime()) {
      errors.push('endDate must be after startDate');
    }
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      errors
    });
  }
  
  next();
}

module.exports = {
  validateWorkoutSession,
  validateChallengeJoin,
  validatePagination,
  validatePeriod,
  validateStatus,
  validateIdParam,
  sanitizeInput,
  validateChallengeCreation
};