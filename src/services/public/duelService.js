const admin = require('firebase-admin');
const db = admin.firestore();
const badgeService = require('./badgeService');

/**
 * Duel Service
 * Handles 1v1 duel logic between users
 */

// ==================== CREATE DUEL (Send Invite) ====================
async function createDuel(challengerId, opponentId, exercise, metric) {
  // Validate both users exist
  const [challengerDoc, opponentDoc] = await Promise.all([
    db.collection('users').doc(challengerId).get(),
    db.collection('users').doc(opponentId).get()
  ]);

  if (!challengerDoc.exists) throw new Error('Challenger not found');
  if (!opponentDoc.exists) throw new Error('Opponent not found');
  if (challengerId === opponentId) throw new Error('Cannot duel yourself');

  // Check for existing pending/active duel between these two users
  const existingDuel = await db.collection('duels')
    .where('challengerId', '==', challengerId)
    .where('opponentId', '==', opponentId)
    .where('status', 'in', ['pending', 'active'])
    .get();

  if (!existingDuel.empty) {
    throw new Error('A duel already exists between these users');
  }

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours to accept

  const duelData = {
    challengerId,
    opponentId,
    exercise,      // e.g. 'pushup'
    metric,        // e.g. 'rep_count' or 'form_score'
    status: 'pending',
    winnerId: null,
    expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    completedAt: null
  };

  const duelRef = await db.collection('duels').add(duelData);

  return {
    duelId: duelRef.id,
    ...duelData,
    challengerName: challengerDoc.data().name,
    opponentName: opponentDoc.data().name
  };
}

// ==================== ACCEPT DUEL ====================
async function acceptDuel(duelId, userId) {
  const duelRef = db.collection('duels').doc(duelId);
  const duelDoc = await duelRef.get();

  if (!duelDoc.exists) throw new Error('Duel not found');

  const duel = duelDoc.data();

  if (duel.opponentId !== userId) {
    throw new Error('Only the opponent can accept this duel');
  }

  if (duel.status !== 'pending') {
    throw new Error(`Duel cannot be accepted — current status: ${duel.status}`);
  }

  // Check if expired
  if (duel.expiresAt.toDate() < new Date()) {
    await duelRef.update({ status: 'expired' });
    throw new Error('Duel invite has expired');
  }

  // Set a new deadline: 48 hours to complete the duel
  const completionDeadline = new Date();
  completionDeadline.setHours(completionDeadline.getHours() + 48);

  await duelRef.update({
    status: 'active',
    expiresAt: admin.firestore.Timestamp.fromDate(completionDeadline)
  });

  return { duelId, status: 'active' };
}

// ==================== DECLINE DUEL ====================
async function declineDuel(duelId, userId) {
  const duelRef = db.collection('duels').doc(duelId);
  const duelDoc = await duelRef.get();

  if (!duelDoc.exists) throw new Error('Duel not found');

  const duel = duelDoc.data();

  if (duel.opponentId !== userId) {
    throw new Error('Only the opponent can decline this duel');
  }

  if (duel.status !== 'pending') {
    throw new Error('Can only decline a pending duel');
  }

  await duelRef.update({ status: 'declined' });

  return { duelId, status: 'declined' };
}

// ==================== SUBMIT PERFORMANCE ====================
async function submitPerformance(duelId, userId, performanceData) {
  const duelRef = db.collection('duels').doc(duelId);
  const duelDoc = await duelRef.get();

  if (!duelDoc.exists) throw new Error('Duel not found');

  const duel = duelDoc.data();

  // Validate user is part of this duel
  if (duel.challengerId !== userId && duel.opponentId !== userId) {
    throw new Error('You are not part of this duel');
  }

  if (duel.status !== 'active') {
    throw new Error('Duel is not active');
  }

  if (duel.expiresAt.toDate() < new Date()) {
    await duelRef.update({ status: 'expired' });
    throw new Error('Duel has expired');
  }

  // Check if this user already submitted
  const existingPerf = await db.collection('duelPerformance')
    .doc(`${duelId}_${userId}`)
    .get();

  if (existingPerf.exists) {
    throw new Error('You have already submitted your performance');
  }

  // Save performance
  await db.collection('duelPerformance').doc(`${duelId}_${userId}`).set({
    duelId,
    userId,
    reps: performanceData.reps || 0,
    formScore: performanceData.formScore || 0,
    durationSeconds: performanceData.durationSeconds || 0,
    submittedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  // Check if both users have now submitted → auto-resolve
  const otherUserId = duel.challengerId === userId ? duel.opponentId : duel.challengerId;
  const otherPerf = await db.collection('duelPerformance')
    .doc(`${duelId}_${otherUserId}`)
    .get();

  if (otherPerf.exists) {
    // Both submitted — resolve the duel
    return await resolveDuel(duelId, duel);
  }

  return { duelId, status: 'waiting_for_opponent' };
}

// ==================== RESOLVE DUEL ====================
async function resolveDuel(duelId, duelData) {
  const { challengerId, opponentId, metric } = duelData;

  const [challengerPerf, opponentPerf] = await Promise.all([
    db.collection('duelPerformance').doc(`${duelId}_${challengerId}`).get(),
    db.collection('duelPerformance').doc(`${duelId}_${opponentId}`).get()
  ]);

  const cData = challengerPerf.data();
  const oData = opponentPerf.data();

  // Compare based on metric
  const cValue = metric === 'form_score' ? cData.formScore : cData.reps;
  const oValue = metric === 'form_score' ? oData.formScore : oData.reps;

  let winnerId = null;
  if (cValue > oValue) winnerId = challengerId;
  else if (oValue > cValue) winnerId = opponentId;
  // null = draw

  // Update duel status
  await db.collection('duels').doc(duelId).update({
    status: 'completed',
    winnerId,
    completedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  // If there's a winner, increment their duel_wins and check badges
  if (winnerId) {
    await incrementDuelWins(winnerId);
    await badgeService.checkAndAwardBadges(winnerId);
  }

  return {
    duelId,
    status: 'completed',
    winnerId,
    scores: {
      [challengerId]: cValue,
      [opponentId]: oValue
    }
  };
}

// ==================== INCREMENT DUEL WINS ====================
async function incrementDuelWins(userId) {
  const progressRef = db.collection('userProgress').doc(userId);
  const progressDoc = await progressRef.get();

  if (!progressDoc.exists) return;

  const currentWins = progressDoc.data().duelWins || 0;

  await progressRef.update({
    duelWins: currentWins + 1,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
}

// ==================== GET DUEL DETAILS ====================
async function getDuelDetails(duelId) {
  const duelDoc = await db.collection('duels').doc(duelId).get();

  if (!duelDoc.exists) return null;

  const duel = { duelId: duelDoc.id, ...duelDoc.data() };

  // Fetch both users' names
  const [challengerDoc, opponentDoc] = await Promise.all([
    db.collection('users').doc(duel.challengerId).get(),
    db.collection('users').doc(duel.opponentId).get()
  ]);

  // Fetch performances if available
  const [challengerPerf, opponentPerf] = await Promise.all([
    db.collection('duelPerformance').doc(`${duelId}_${duel.challengerId}`).get(),
    db.collection('duelPerformance').doc(`${duelId}_${duel.opponentId}`).get()
  ]);

  return {
    ...duel,
    challengerName: challengerDoc.exists ? challengerDoc.data().name : 'Unknown',
    opponentName: opponentDoc.exists ? opponentDoc.data().name : 'Unknown',
    performances: {
      [duel.challengerId]: challengerPerf.exists ? challengerPerf.data() : null,
      [duel.opponentId]: opponentPerf.exists ? opponentPerf.data() : null
    }
  };
}

// ==================== GET USER DUELS ====================
async function getUserDuels(userId, status = 'all') {
  let query = db.collection('duels').where('challengerId', '==', userId);

  // Get duels where user is challenger
  const challengerSnapshot = await (
    status !== 'all'
      ? query.where('status', '==', status)
      : query
  ).get();

  // Get duels where user is opponent
  let opponentQuery = db.collection('duels').where('opponentId', '==', userId);
  const opponentSnapshot = await (
    status !== 'all'
      ? opponentQuery.where('status', '==', status)
      : opponentQuery
  ).get();

  const duels = [
    ...challengerSnapshot.docs.map(doc => ({ duelId: doc.id, ...doc.data() })),
    ...opponentSnapshot.docs.map(doc => ({ duelId: doc.id, ...doc.data() }))
  ];

  // Sort by createdAt descending
  duels.sort((a, b) => {
    const aTime = a.createdAt?.toDate?.() || new Date(0);
    const bTime = b.createdAt?.toDate?.() || new Date(0);
    return bTime - aTime;
  });

  return duels;
}

// ==================== GET DUEL STATS ====================
async function getDuelStats(userId) {
  const allDuels = await getUserDuels(userId, 'completed');

  const wins = allDuels.filter(d => d.winnerId === userId).length;
  const losses = allDuels.filter(d => d.winnerId && d.winnerId !== userId).length;
  const draws = allDuels.filter(d => d.status === 'completed' && !d.winnerId).length;

  return {
    totalDuels: allDuels.length,
    wins,
    losses,
    draws,
    winRate: allDuels.length > 0 ? Math.round((wins / allDuels.length) * 100) : 0
  };
}

module.exports = {
  createDuel,
  acceptDuel,
  declineDuel,
  submitPerformance,
  resolveDuel,
  getDuelDetails,
  getUserDuels,
  getDuelStats
};