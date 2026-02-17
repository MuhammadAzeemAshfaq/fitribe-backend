const admin = require('firebase-admin');
const db = admin.firestore();
const progressUtils = require('../../utils/progressUtils');
// const badgeService = require('./badgeService');
// const challengeService = require('./challengeService');

/**
 * Progress Service
 * Contains business logic for workout progress tracking
 */

// ==================== RECORD WORKOUT SESSION ====================
async function recordWorkoutSession({ userId, workoutPlanId, exercises, durationMinutes }) {
  // Calculate metrics using utilities
  const totalCalories = progressUtils.calculateTotalCalories(exercises);
  const avgFormScore = progressUtils.calculateAverageFormScore(exercises);
  
  // Create session document
  const sessionRef = await db.collection('workoutSessions').add({
    userId,
    workoutPlanId: workoutPlanId || null,
    startTime: admin.firestore.FieldValue.serverTimestamp(),
    endTime: admin.firestore.FieldValue.serverTimestamp(),
    durationMinutes,
    status: 'completed',
    totalCalories: Math.round(totalCalories),
    overallFormScore: Math.round(avgFormScore * 100) / 100,
    exercises,
    achievements: [],
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
  
  // Update user progress
  await updateUserProgress(userId, {
    totalCalories,
    durationMinutes,
    workoutCount: 1
  });
  
  const challengeService = require('./challengeService');
  const badgeService = require('./badgeService');

  // Update challenge progress
  await challengeService.updateChallengeProgress(userId, exercises);
  
  // Check for new badges
  const newBadges = await badgeService.checkAndAwardBadges(userId);
  
  return {
    sessionId: sessionRef.id,
    totalCalories: Math.round(totalCalories),
    avgFormScore: Math.round(avgFormScore * 100) / 100,
    badgesEarned: newBadges
  };
}

// ==================== GET USER PROGRESS ====================
async function getUserProgress(userId, period) {
   const snapshot = await db
    .collection('userProgress')
    .where('userId', '==', userId)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const progressData = snapshot.docs[0].data();

  const query = buildWorkoutHistoryQuery(userId, period);

  const sessions = await query.limit(50).get();
  const workoutHistory = sessions.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate()
  }));

  return {
    progress: {
      ...progressData,
      lastWorkoutDate: progressData.lastWorkoutDate?.toDate()
    },
    workoutHistory
  };
}

// ==================== GET WORKOUT STATISTICS ====================
async function getWorkoutStatistics(userId, period) {
  const startDate = progressUtils.getDateForPeriod(period);
  
  const sessions = await db.collection('workoutSessions')
    .where('userId', '==', userId)
    .where('createdAt', '>=', startDate)
    .get();
  
  // Calculate statistics using utility functions
  const stats = progressUtils.calculateWorkoutStats(sessions.docs);
  
  return stats;
}

// ==================== HELPER: BUILD WORKOUT HISTORY QUERY ====================
function buildWorkoutHistoryQuery(userId, period) {
  let query = db.collection('workoutSessions')
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc');
  
  if (period === 'week') {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    query = query.where('createdAt', '>=', weekAgo);
  } else if (period === 'month') {
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    query = query.where('createdAt', '>=', monthAgo);
  }
  
  return query;
}

// ==================== HELPER: UPDATE USER PROGRESS ====================
async function updateUserProgress(userId, updates) {
  const progressRef = db.collection('userProgress').doc(userId);
  const progressDoc = await progressRef.get();
  
  if (!progressDoc.exists) {
    await createInitialProgress(progressRef, userId, updates);
  } else {
    await updateExistingProgress(progressRef, progressDoc.data(), updates);
  }
}

// ==================== HELPER: CREATE INITIAL PROGRESS ====================
async function createInitialProgress(progressRef, userId, updates) {
  // Create new progress document
  await progressRef.set({
    userId,
    totalWorkouts: 1,
    totalCalories: updates.totalCalories,
    totalMinutes: updates.durationMinutes,
    currentStreak: 1,
    longestStreak: 1,
    level: 1,
    experiencePoints: 50,
    weeklyStats: {
      workouts: 1,
      calories: updates.totalCalories,
      minutes: updates.durationMinutes
    },
    monthlyStats: {
      workouts: 1,
      calories: updates.totalCalories,
      minutes: updates.durationMinutes
    },
    lastWorkoutDate: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
  
  // Create streak document
  await db.collection('workoutStreaks').doc(userId).set({
    userId,
    currentStreakDays: 1,
    longestStreakDays: 1,
    lastWorkoutDate: admin.firestore.FieldValue.serverTimestamp(),
    streakStatus: 'active'
  });
}

// ==================== HELPER: UPDATE EXISTING PROGRESS ====================
async function updateExistingProgress(progressRef, currentData, updates) {
  // Calculate streak using utility function
  const streakData = progressUtils.calculateStreak(
    currentData.lastWorkoutDate?.toDate(),
    currentData.currentStreak || 0,
    currentData.longestStreak || 0
  );
  
  // Calculate new level
  const newXP = (currentData.experiencePoints || 0) + 50;
  const newLevel = progressUtils.calculateLevel(newXP);
  
  // Update progress
  await progressRef.update({
    totalWorkouts: admin.firestore.FieldValue.increment(1),
    totalCalories: admin.firestore.FieldValue.increment(updates.totalCalories),
    totalMinutes: admin.firestore.FieldValue.increment(updates.durationMinutes),
    currentStreak: streakData.currentStreak,
    longestStreak: streakData.longestStreak,
    level: newLevel,
    experiencePoints: newXP,
    'weeklyStats.workouts': admin.firestore.FieldValue.increment(1),
    'weeklyStats.calories': admin.firestore.FieldValue.increment(updates.totalCalories),
    'weeklyStats.minutes': admin.firestore.FieldValue.increment(updates.durationMinutes),
    'monthlyStats.workouts': admin.firestore.FieldValue.increment(1),
    'monthlyStats.calories': admin.firestore.FieldValue.increment(updates.totalCalories),
    'monthlyStats.minutes': admin.firestore.FieldValue.increment(updates.durationMinutes),
    lastWorkoutDate: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
  
  // Update streak document
  await db.collection('workoutStreaks').doc(progressRef.id).update({
    currentStreakDays: streakData.currentStreak,
    longestStreakDays: streakData.longestStreak,
    lastWorkoutDate: admin.firestore.FieldValue.serverTimestamp(),
    streakStatus: streakData.currentStreak > 0 ? 'active' : 'broken'
  });
}

module.exports = {
  recordWorkoutSession,
  getUserProgress,
  getWorkoutStatistics
};