const admin = require('firebase-admin');

/**
 * Authentication Middleware
 * Verifies Firebase ID tokens and attaches user info to request
 */

// ==================== VERIFY TOKEN ====================
async function verifyToken(req, res, next) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: No token provided'
      });
    }
    
    const token = authHeader.split('Bearer ')[1];
    
    // Verify Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Attach user info to request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified
    };
    
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    if (error.code === 'auth/argument-error') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token format',
        code: 'INVALID_TOKEN'
      });
    }
    
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid token',
      code: 'INVALID_TOKEN'
    });
  }
}

// ==================== VERIFY USER OWNERSHIP ====================
function verifyOwnership(req, res, next) {
  const requestedUserId = req.params.userId || req.body.userId;
  const authenticatedUserId = req.user.uid;
  
  if (requestedUserId !== authenticatedUserId) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: You can only access your own data',
      code: 'FORBIDDEN'
    });
  }
  
  next();
}

// ==================== OPTIONAL AUTH ====================
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1];
      const decodedToken = await admin.auth().verifyIdToken(token);
      
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified
      };
    }
    
    next();
  } catch (error) {
    // Continue without auth
    next();
  }
}

// ==================== CHECK ADMIN ====================
async function requireAdmin(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    // Check if user has admin claim
    const user = await admin.auth().getUser(req.user.uid);
    
    if (!user.customClaims || !user.customClaims.admin) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Admin access required',
        code: 'ADMIN_REQUIRED'
      });
    }
    
    next();
  } catch (error) {
    console.error('Admin check error:', error);
    return res.status(500).json({
      success: false,
      error: 'Error verifying admin status'
    });
  }
}

// ==================== RATE LIMITING ====================
const rateLimitStore = new Map();

function rateLimit(options = {}) {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    maxRequests = 100,
    message = 'Too many requests, please try again later'
  } = options;
  
  return (req, res, next) => {
    const key = req.user ? req.user.uid : req.ip;
    const now = Date.now();
    
    if (!rateLimitStore.has(key)) {
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }
    
    const record = rateLimitStore.get(key);
    
    if (now > record.resetTime) {
      // Reset window
      record.count = 1;
      record.resetTime = now + windowMs;
      return next();
    }
    
    if (record.count >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: message,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((record.resetTime - now) / 1000)
      });
    }
    
    record.count++;
    next();
  };
}

// ==================== CLEANUP RATE LIMIT STORE ====================
// Clean up expired entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 60 * 1000);

module.exports = {
  verifyToken,
  verifyOwnership,
  optionalAuth,
  requireAdmin,
  rateLimit
};