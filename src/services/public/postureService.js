const admin = require('firebase-admin');
const db = admin.firestore();
const badgeService = require('./badgeService');

/**
 * Posture Service
 * Handles AI posture analysis session storage and retrieval
 */

// ==================== SUBMIT AI SESSION ====================
async function submitPostureSession(userId, workoutSessionId, exercises) {
  if (!exercises || exercises.length === 0) {
    throw new Error('No exercises provided');
  }

  const sessionRef = db.collection('postureAnalysis').doc();
  const sessionId = sessionRef.id;

  // Calculate overall session form score (average across all exercises)
  const avgFormScore =
    exercises.reduce((sum, ex) => sum + (ex.avgFormScore || 0), 0) / exercises.length;

  const sessionData = {
    sessionId,
    userId,
    workoutSessionId: workoutSessionId || null,
    exerciseCount: exercises.length,
    overallFormScore: Math.round(avgFormScore * 100) / 100,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  };

  // Use a batch for all writes
  const batch = db.batch();

  // Save the top-level posture session
  batch.set(sessionRef, sessionData);

  const savedExercises = [];

  for (const exercise of exercises) {
    const {
      exerciseName,
      classifierId,
      totalReps,
      sets,
      durationSeconds,
      caloriesBurned,
      avgFormScore: exFormScore,
      keypoints,
      angles,
      corrections
    } = exercise;

    // ── exercisePerformance doc ──
    const perfRef = db.collection('exercisePerformance').doc();
    batch.set(perfRef, {
      performanceId: perfRef.id,
      sessionId,
      userId,
      exerciseName,
      classifierId: classifierId || null,
      totalReps: totalReps || 0,
      sets: sets || 1,
      durationSeconds: durationSeconds || 0,
      caloriesBurned: caloriesBurned || 0,
      avgFormScore: exFormScore || 0,
      keypoints: keypoints || {},
      angles: angles || {},
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // ── correctionSuggestions docs ──
    const savedCorrections = [];
    if (corrections && corrections.length > 0) {
      for (const correction of corrections) {
        const corrRef = db.collection('correctionSuggestions').doc();
        batch.set(corrRef, {
          correctionId: corrRef.id,
          sessionId,
          userId,
          exerciseName,
          type: correction.type || 'form',
          message: correction.message,
          severity: correction.severity || 'low', // low | medium | high
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        savedCorrections.push({ correctionId: corrRef.id, ...correction });
      }
    }

    savedExercises.push({
      exerciseName,
      avgFormScore: exFormScore || 0,
      totalReps: totalReps || 0,
      corrections: savedCorrections
    });
  }

  await batch.commit();

  // Update user's avgFormScore in userProgress
  await updateUserFormScore(userId, avgFormScore);

  // Check if perfect_form badge should be awarded (95%+ avg form score)
  if (avgFormScore >= 95) {
    await badgeService.checkAndAwardBadges(userId);
  }

  return {
    sessionId,
    overallFormScore: sessionData.overallFormScore,
    exerciseCount: exercises.length,
    exercises: savedExercises
  };
}

// ==================== UPDATE USER FORM SCORE IN PROGRESS ====================
async function updateUserFormScore(userId, newFormScore) {
  try {
    const progressRef = db.collection('userProgress').doc(userId);
    const progressDoc = await progressRef.get();

    if (!progressDoc.exists) return;

    const progress = progressDoc.data();
    const currentAvg = progress.avgFormScore || 0;
    const totalWorkouts = progress.totalWorkouts || 1;

    // Rolling average
    const updatedAvg =
      Math.round(
        ((currentAvg * (totalWorkouts - 1) + newFormScore) / totalWorkouts) * 100
      ) / 100;

    await progressRef.update({
      avgFormScore: updatedAvg,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating form score:', error);
    // Non-fatal — don't throw
  }
}

// ==================== GET SESSION DETAILS ====================
async function getSessionDetails(sessionId) {
  const sessionDoc = await db.collection('postureAnalysis').doc(sessionId).get();

  if (!sessionDoc.exists) return null;

  const session = { sessionId: sessionDoc.id, ...sessionDoc.data() };

  // Fetch exercise performances for this session
  const perfSnapshot = await db
    .collection('exercisePerformance')
    .where('sessionId', '==', sessionId)
    .get();

  // Fetch corrections for this session
  const correctionsSnapshot = await db
    .collection('correctionSuggestions')
    .where('sessionId', '==', sessionId)
    .get();

  const corrections = correctionsSnapshot.docs.map(doc => ({
    correctionId: doc.id,
    ...doc.data()
  }));

  const exercises = perfSnapshot.docs.map(doc => {
    const perf = { performanceId: doc.id, ...doc.data() };
    // Attach corrections for this exercise
    perf.corrections = corrections.filter(c => c.exerciseName === perf.exerciseName);
    return perf;
  });

  return { ...session, exercises };
}

// ==================== GET USER POSTURE HISTORY ====================
async function getUserPostureHistory(userId, limit = 20) {
  const snapshot = await db
    .collection('postureAnalysis')
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  return snapshot.docs.map(doc => ({
    sessionId: doc.id,
    ...doc.data()
  }));
}

// ==================== GET HISTORY FOR ONE EXERCISE ====================
async function getExerciseHistory(userId, exerciseName, limit = 20) {
  const snapshot = await db
    .collection('exercisePerformance')
    .where('userId', '==', userId)
    .where('exerciseName', '==', exerciseName)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  return snapshot.docs.map(doc => ({
    performanceId: doc.id,
    ...doc.data()
  }));
}

// ==================== GET CLASSIFIERS ====================
async function getClassifiers() {
  const snapshot = await db.collection('classifiers').get();

  return snapshot.docs.map(doc => ({
    classifierId: doc.id,
    ...doc.data()
  }));
}

module.exports = {
  submitPostureSession,
  getSessionDetails,
  getUserPostureHistory,
  getExerciseHistory,
  getClassifiers
};