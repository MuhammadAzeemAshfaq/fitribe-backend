/**
 * Logging Utility
 * Centralized logging for the application
 */

const winston = require('winston');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(colors);

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} [${info.level}]: ${info.message}`
  )
);

// Define transports
const transports = [
  // Console output
  new winston.transports.Console(),
  
  // Error logs
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
  }),
  
  // Combined logs
  new winston.transports.File({
    filename: 'logs/combined.log',
  }),
];

// Create logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  levels,
  format,
  transports,
});

// ==================== STRUCTURED LOGGING HELPERS ====================

function logWorkoutCompleted(userId, sessionId, stats) {
  logger.info(`Workout completed - User: ${userId}, Session: ${sessionId}, Calories: ${stats.calories}, Duration: ${stats.duration}min`);
}

function logBadgeEarned(userId, badgeName) {
  logger.info(`🏆 Badge earned - User: ${userId}, Badge: ${badgeName}`);
}

function logChallengeJoined(userId, challengeId, challengeName) {
  logger.info(`Challenge joined - User: ${userId}, Challenge: ${challengeId} (${challengeName})`);
}

function logChallengeCompleted(userId, challengeId, challengeName) {
  logger.info(`🎉 Challenge completed - User: ${userId}, Challenge: ${challengeId} (${challengeName})`);
}

function logAuthAttempt(email, success) {
  if (success) {
    logger.info(`Auth successful - Email: ${email}`);
  } else {
    logger.warn(`Auth failed - Email: ${email}`);
  }
}

function logError(error, context = '') {
  logger.error(`${context ? context + ' - ' : ''}${error.message}`, {
    stack: error.stack,
    code: error.code
  });
}

function logApiRequest(method, path, userId, statusCode, responseTime) {
  logger.http(`${method} ${path} - User: ${userId || 'anonymous'} - Status: ${statusCode} - ${responseTime}ms`);
}

// ==================== REQUEST LOGGING MIDDLEWARE ====================
function requestLogger(req, res, next) {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    const userId = req.user ? req.user.uid : null;
    
    logApiRequest(
      req.method,
      req.path,
      userId,
      res.statusCode,
      responseTime
    );
  });
  
  next();
}

module.exports = {
  logger,
  logWorkoutCompleted,
  logBadgeEarned,
  logChallengeJoined,
  logChallengeCompleted,
  logAuthAttempt,
  logError,
  logApiRequest,
  requestLogger
};