const admin = require('firebase-admin');
const db = admin.firestore();
const badgeService = require('./badgeService');
const socialService = require('./socialService');
const notificationService = require('./notificationService');

/**
 * Duel Service
 * Handles 1v1 duel logic between users
 */

function getIO() {
  try {
    return require('../../index').io;
  } catch {
    return null;
  }
}

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

  // Check for existing pending/active duel between these two users (both directions)
  const [existingAsChallenger, existingAsOpponent] = await Promise.all([
    db.collection('duels')
      .where('challengerId', '==', challengerId)
      .where('opponentId', '==', opponentId)
      .where('status', 'in', ['pending', 'active'])
      .get(),
    db.collection('duels')
      .where('challengerId', '==', opponentId)
      .where('opponentId', '==', challengerId)
      .where('status', 'in', ['pending', 'active'])
      .get()
  ]);

  if (!existingAsChallenger.empty || !existingAsOpponent.empty) {
    throw new Error('A duel already exists between these users');
  }

  // FIX: Two separate expiry timestamps for the two phases
  const inviteExpiresAt = new Date();
  inviteExpiresAt.setHours(inviteExpiresAt.getHours() + 24); // 24h to accept

  const duelData = {
    challengerId,
    opponentId,
    exercise,             // e.g. 'pushup'
    metric,               // e.g. 'rep_count' or 'form_score'
    status: 'pending',
    winnerId: null,
    inviteExpiresAt: admin.firestore.Timestamp.fromDate(inviteExpiresAt),
    completionDeadline: null, // set when accepted
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    completedAt: null
  };

  const duelRef = await db.collection('duels').add(duelData);

  await notificationService.notifyDuelInvite(
    opponentId,
    challengerDoc.data().name,
    duelRef.id,
    exercise
  );

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

  // Check invite expiry
  if (duel.inviteExpiresAt.toDate() < new Date()) {
    await duelRef.update({ status: 'expired' });
    throw new Error('Duel invite has expired');
  }

  // FIX: Set a named completionDeadline field (48h), keep inviteExpiresAt untouched
  const completionDeadline = new Date();
  completionDeadline.setHours(completionDeadline.getHours() + 48);

  await duelRef.update({
    status: 'active',
    completionDeadline: admin.firestore.Timestamp.fromDate(completionDeadline)
  });

  const opponentUserDoc = await db.collection('users').doc(userId).get();
  const opponentName = opponentUserDoc.exists ? opponentUserDoc.data().name : 'Your opponent';
  await notificationService.notifyDuelAccepted(duel.challengerId, opponentName, duelId);

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

  // FIX: Check expiry for consistency — mark expired instead of declined if window passed
  if (duel.inviteExpiresAt.toDate() < new Date()) {
    await duelRef.update({ status: 'expired' });
    throw new Error('Duel invite has already expired');
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

  if (duel.challengerId !== userId && duel.opponentId !== userId) {
    throw new Error('You are not part of this duel');
  }

  if (duel.status !== 'active') {
    throw new Error('Duel is not active');
  }

  // FIX: Check the correct field — completionDeadline (not inviteExpiresAt)
  if (duel.completionDeadline && duel.completionDeadline.toDate() < new Date()) {
    await duelRef.update({ status: 'expired' });
    throw new Error('Duel has expired');
  }

  const existingPerf = await db.collection('duelPerformance')
    .doc(`${duelId}_${userId}`)
    .get();

  if (existingPerf.exists) {
    throw new Error('You have already submitted your performance');
  }

  await db.collection('duelPerformance').doc(`${duelId}_${userId}`).set({
    duelId,
    userId,
    reps: performanceData.reps || 0,
    formScore: performanceData.formScore || 0,
    durationSeconds: performanceData.durationSeconds || 0,
    submittedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  const otherUserId = duel.challengerId === userId ? duel.opponentId : duel.challengerId;
  const otherPerf = await db.collection('duelPerformance')
    .doc(`${duelId}_${otherUserId}`)
    .get();

  if (otherPerf.exists) {
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

  const cValue = metric === 'form_score' ? cData.formScore : cData.reps;
  const oValue = metric === 'form_score' ? oData.formScore : oData.reps;

  let winnerId = null;
  if (cValue > oValue) winnerId = challengerId;
  else if (oValue > cValue) winnerId = opponentId;
  // null = draw

  await db.collection('duels').doc(duelId).update({
    status: 'completed',
    winnerId,
    completedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  // FIX: loserId is only meaningful when there's a winner; draw has no loser
  const loserId = winnerId
    ? (winnerId === challengerId ? opponentId : challengerId)
    : null;

  if (winnerId) {
    await incrementDuelWins(winnerId);
    await badgeService.checkAndAwardBadges(winnerId);
    await socialService.logActivity(winnerId, 'duel_won', {
      duelId,
      loserId,
      exercise: duelData.exercise
    });

    // FIX: Emit the metric-appropriate score fields
    const io = getIO();
    if (io) {
      io.to(`duel:${duelId}`).emit('duel:result', {
        winnerId,
        metric,
        challengerScore: cValue,
        opponentScore: oValue,
        exercise: duelData.exercise
      });
    }
  }

  // Always notify both players
  await notificationService.notifyDuelResolved(winnerId, loserId, duelId, duelData.exercise);

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

  // FIX: Use FieldValue.increment() — atomic, no read-then-write race condition
  await progressRef.update({
    duelWins: admin.firestore.FieldValue.increment(1),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
}

// ==================== GET DUEL DETAILS ====================
async function getDuelDetails(duelId) {
  const duelDoc = await db.collection('duels').doc(duelId).get();

  if (!duelDoc.exists) return null;

  const duel = { duelId: duelDoc.id, ...duelDoc.data() };

  const [challengerDoc, opponentDoc] = await Promise.all([
    db.collection('users').doc(duel.challengerId).get(),
    db.collection('users').doc(duel.opponentId).get()
  ]);

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
  let challengerQuery = db.collection('duels').where('challengerId', '==', userId);
  let opponentQuery = db.collection('duels').where('opponentId', '==', userId);

  const [challengerSnapshot, opponentSnapshot] = await Promise.all([
    (status !== 'all' ? challengerQuery.where('status', '==', status) : challengerQuery).get(),
    (status !== 'all' ? opponentQuery.where('status', '==', status) : opponentQuery).get()
  ]);

  const duels = [
    ...challengerSnapshot.docs.map(doc => ({ duelId: doc.id, ...doc.data() })),
    ...opponentSnapshot.docs.map(doc => ({ duelId: doc.id, ...doc.data() }))
  ];

  const now = new Date();

  // FIX: Lazy expiry cleanup — mark stale pending/active duels as expired on read
  const expiredUpdates = [];
  for (const duel of duels) {
    if (duel.status === 'pending' && duel.inviteExpiresAt?.toDate() < now) {
      duel.status = 'expired';
      expiredUpdates.push(
        db.collection('duels').doc(duel.duelId).update({ status: 'expired' })
      );
    } else if (duel.status === 'active' && duel.completionDeadline?.toDate() < now) {
      duel.status = 'expired';
      expiredUpdates.push(
        db.collection('duels').doc(duel.duelId).update({ status: 'expired' })
      );
    }
  }

  if (expiredUpdates.length > 0) {
    await Promise.all(expiredUpdates);
  }

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