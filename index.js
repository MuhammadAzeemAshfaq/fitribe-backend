const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config();

const swaggerSpecs = require('./config/swagger');
const { requestLogger } = require('./utils/logger');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const app = express();

// ==================== SECURITY (NEW) ====================
app.use(helmet());

// ==================== CORS (ENHANCED) ====================
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  credentials: true
}));

// ==================== BODY PARSING (ENHANCED WITH LIMITS) ====================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ==================== LOGGING (NEW) ====================
app.use(requestLogger);

// ==================== API DOCUMENTATION (NEW) ====================
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// ==================== ROUTES (SAME) ====================
const progressRoutes = require('./routes/public/progress');
const badgeRoutes = require('./routes/public/badge');
const challengeRoutes = require('./routes/public/challenge');

app.use('/api/progress', progressRoutes);
app.use('/api/badges', badgeRoutes);
app.use('/api/challenges', challengeRoutes);

// ==================== ADMIN ROUTES ====================
const adminChallengeRoutes = require('./routes/admin/challenge');
const adminBadgeRoutes = require('./routes/admin/badges');

app.use('/api/admin/challenges', adminChallengeRoutes);
app.use('/api/admin/badges', adminBadgeRoutes);

// ==================== HEALTH CHECK (ENHANCED) ====================
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'FiTribe API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ==================== API INFO ====================
app.get('/api', (req, res) => {
  res.json({
    name: 'FiTribe API',
    version: '1.0.0',
    documentation: '/api-docs',
    endpoints: {
      public: {
        progress: '/api/progress',
        badges: '/api/badges',
        challenges: '/api/challenges'
      },
      admin: {
        challenges: '/api/admin/challenges',
        badges: '/api/admin/badges'
      }
    }
  });
});

// ==================== 404 HANDLER (NEW) ====================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path
  });
});

// ==================== ERROR HANDLING (ENHANCED) ====================
app.use((err, req, res, next) => {
  // Log error
  const { logger } = require('./utils/logger');
  logger.error(`${err.message}`, { stack: err.stack });
  
  console.error(err.stack);
  
  res.status(err.status || 500).json({ 
    success: false, 
    error: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong!' 
      : err.message
  });
});

// ==================== GRACEFUL SHUTDOWN (NEW) ====================
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Closing server gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`🚀 FiTribe API server running on port ${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
  console.log(`🔐 Admin Endpoints:`);
  console.log(`   - Challenges: http://localhost:${PORT}/api/admin/challenges`);
  console.log(`   - Badges: http://localhost:${PORT}/api/admin/badges`);
});

module.exports = app;