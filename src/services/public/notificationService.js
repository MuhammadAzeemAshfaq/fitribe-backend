const admin = require('firebase-admin');
const db = admin.firestore();

/**
 * Notification Service
 * Handles FCM push notifications + in-app notification storage
 */

// ==================== SAVE DEVICE TOKEN ====================
async function saveDeviceToken(userId, token, platform = 'mobile') {
  await db.collection('deviceTokens').doc(`${userId}_${token}`).set({
    userId,
    token,
    platform,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
}

// ==================== SEND NOTIFICATION ====================
async function sendNotification(userId, title, body, data = {}) {
  try {
    // Save in-app notification to Firestore regardless of push success
    await saveInAppNotification(userId, title, body, data);

    // Get user's device tokens
    const tokensSnapshot = await db
      .collection('deviceTokens')
      .where('userId', '==', userId)
      .get();

    if (tokensSnapshot.empty) return; // No device registered, in-app only

    const tokens = tokensSnapshot.docs.map(doc => doc.data().token);

    // Send FCM push to all user devices
    const message = {
      notification: { title, body },
      data: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      ),
      tokens
    };

    const response = await admin.messaging().sendEachForMulticast(message);

    // Clean up invalid tokens
    const invalidTokens = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const code = resp.error?.code;
        if (
          code === 'messaging/invalid-registration-token' ||
          code === 'messaging/registration-token-not-registered'
        ) {
          invalidTokens.push(tokens[idx]);
        }
      }
    });

    if (invalidTokens.length > 0) {
      await removeInvalidTokens(userId, invalidTokens);
    }

  } catch (error) {
    // Non-fatal — never crash the main flow
    console.error('Error sending notification:', error);
  }
}

// ==================== SAVE IN-APP NOTIFICATION ====================
async function saveInAppNotification(userId, title, body, data = {}) {
  await db.collection('notifications').add({
    userId,
    title,
    body,
    data,
    read: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
}

// ==================== REMOVE INVALID TOKENS ====================
async function removeInvalidTokens(userId, tokens) {
  const batch = db.batch();
  for (const token of tokens) {
    const ref = db.collection('deviceTokens').doc(`${userId}_${token}`);
    batch.delete(ref);
  }
  await batch.commit();
}

// ==================== GET USER NOTIFICATIONS ====================
async function getUserNotifications(userId, limit = 30) {
  const snapshot = await db
    .collection('notifications')
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  return snapshot.docs.map(doc => ({
    notificationId: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate()
  }));
}

// ==================== MARK ONE AS READ ====================
async function markAsRead(notificationId, userId) {
  const ref = db.collection('notifications').doc(notificationId);
  const doc = await ref.get();

  if (!doc.exists) throw new Error('Notification not found');
  if (doc.data().userId !== userId) throw new Error('Access denied');

  await ref.update({ read: true });
}

// ==================== MARK ALL AS READ ====================
async function markAllAsRead(userId) {
  const snapshot = await db
    .collection('notifications')
    .where('userId', '==', userId)
    .where('read', '==', false)
    .get();

  if (snapshot.empty) return 0;

  const batch = db.batch();
  snapshot.docs.forEach(doc => batch.update(doc.ref, { read: true }));
  await batch.commit();

  return snapshot.docs.length;
}

// ==================== GET UNREAD COUNT ====================
async function getUnreadCount(userId) {
  const snapshot = await db
    .collection('notifications')
    .where('userId', '==', userId)
    .where('read', '==', false)
    .get();

  return snapshot.size;
}

// ================================================================
// NOTIFICATION HELPERS — called from other services
// ================================================================

// Called from duelService.createDuel()
async function notifyDuelInvite(opponentId, challengerName, duelId, exercise) {
  await sendNotification(
    opponentId,
    '⚔️ Duel Challenge!',
    `${challengerName} challenged you to a ${exercise} duel!`,
    { type: 'duel_invite', duelId }
  );
}

// Called from duelService.acceptDuel()
async function notifyDuelAccepted(challengerId, opponentName, duelId) {
  await sendNotification(
    challengerId,
    '✅ Duel Accepted!',
    `${opponentName} accepted your duel challenge. Time to perform!`,
    { type: 'duel_accepted', duelId }
  );
}

// Called from duelService.resolveDuel()
async function notifyDuelResolved(winnerId, loserId, duelId, exercise) {
  await sendNotification(
    winnerId,
    '🏆 You won the duel!',
    `You beat your opponent in the ${exercise} duel!`,
    { type: 'duel_won', duelId }
  );
  await sendNotification(
    loserId,
    '💪 Duel result',
    `You lost the ${exercise} duel. Keep training!`,
    { type: 'duel_lost', duelId }
  );
}

// Called from badgeService.checkAndAwardBadges()
async function notifyBadgeEarned(userId, badgeName, badgeTier) {
  await sendNotification(
    userId,
    '🎖️ New Badge Earned!',
    `You earned the "${badgeName}" badge!`,
    { type: 'badge_earned', badgeName, badgeTier }
  );
}

// Called from challengeService.updateChallengeProgress()
async function notifyChallengeCompleted(userId, challengeName) {
  await sendNotification(
    userId,
    '🏅 Challenge Completed!',
    `You completed the "${challengeName}" challenge!`,
    { type: 'challenge_completed', challengeName }
  );
}

module.exports = {
  saveDeviceToken,
  sendNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  // Helpers for other services
  notifyDuelInvite,
  notifyDuelAccepted,
  notifyDuelResolved,
  notifyBadgeEarned,
  notifyChallengeCompleted
};
