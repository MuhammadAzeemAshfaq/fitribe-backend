const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
require('dotenv').config();

// Initialize Firebase Admin
//const serviceAccount = require('./serviceAccountKey.json');

/*admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});*/
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
});


const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
const progressRoutes = require('./routes/progress');
const badgeRoutes = require('./routes/badge');
const challengeRoutes = require('./routes/challenge');

app.use('/api/progress', progressRoutes);
app.use('/api/badges', badgeRoutes);
app.use('/api/challenges', challengeRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'FiTribe API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    error: 'Something went wrong!' 
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 FiTribe API server running on port ${PORT}`);
});

module.exports = app;