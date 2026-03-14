const admin = require('firebase-admin');
const db = admin.firestore();

/**
 * Social Service
 * Handles activity feed and user following
 */

// ==================== LOG ACTIVITY EVENT ====================
async function logActivity(userId, type, data = {}) {
  try {
    await db.collection('socialActivity').add({
      userId,
      type,
      data,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    // Non-fatal — never crash the main flow because of feed logging
    console.error('Error logging activity:', error);
  }
}

// ==================== GET USER'S OWN FEED ====================
async function getUserFeed(userId, limit = 20) {
  const snapshot = await db
    .collection('socialActivity')
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  // Attach user info to each event
  const userDoc = await db.collection('users').doc(userId).get();
  const user = userDoc.exists
    ? { name: userDoc.data().name, profilePicUrl: userDoc.data().profilePicUrl }
    : { name: 'Unknown', profilePicUrl: '' };

  return snapshot.docs.map(doc => ({
    activityId: doc.id,
    ...doc.data(),
    user,
    createdAt: doc.data().createdAt?.toDate()
  }));
}

// ==================== GET FRIENDS' FEED ====================
async function getFriendsFeed(userId, limit = 30) {
  // Get list of people this user follows
  const followingSnapshot = await db
    .collection('following')
    .where('followerId', '==', userId)
    .get();

  if (followingSnapshot.empty) return [];

  const followingIds = followingSnapshot.docs.map(doc => doc.data().followingId);

  // Firestore 'in' query supports max 10 — chunk if needed
  const chunks = [];
  for (let i = 0; i < followingIds.length; i += 10) {
    chunks.push(followingIds.slice(i, i + 10));
  }

  const allActivities = [];

  for (const chunk of chunks) {
    const snapshot = await db
      .collection('socialActivity')
      .where('userId', 'in', chunk)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    allActivities.push(...snapshot.docs.map(doc => ({
      activityId: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate()
    })));
  }

  // Fetch user info for all unique userIds in the feed
  const uniqueUserIds = [...new Set(allActivities.map(a => a.userId))];
  const userDocs = await Promise.all(
    uniqueUserIds.map(id => db.collection('users').doc(id).get())
  );

  const userMap = {};
  userDocs.forEach(doc => {
    if (doc.exists) {
      userMap[doc.id] = {
        name: doc.data().name,
        profilePicUrl: doc.data().profilePicUrl
      };
    }
  });

  // Attach user info and sort by date
  return allActivities
    .map(activity => ({
      ...activity,
      user: userMap[activity.userId] || { name: 'Unknown', profilePicUrl: '' }
    }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, limit);
}

// ==================== FOLLOW USER ====================
async function followUser(followerId, followingId) {
  if (followerId === followingId) throw new Error('Cannot follow yourself');

  // Check target user exists
  const targetDoc = await db.collection('users').doc(followingId).get();
  if (!targetDoc.exists) throw new Error('User not found');

  const followRef = db
    .collection('following')
    .doc(`${followerId}_${followingId}`);

  const existing = await followRef.get();
  if (existing.exists) throw new Error('Already following this user');

  await followRef.set({
    followerId,
    followingId,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return { followerId, followingId };
}

// ==================== UNFOLLOW USER ====================
async function unfollowUser(followerId, followingId) {
  const followRef = db
    .collection('following')
    .doc(`${followerId}_${followingId}`);

  const existing = await followRef.get();
  if (!existing.exists) throw new Error('Not following this user');

  await followRef.delete();

  return { followerId, followingId };
}

// ==================== GET FOLLOWING LIST ====================
async function getFollowing(userId) {
  const snapshot = await db
    .collection('following')
    .where('followerId', '==', userId)
    .get();

  const followingIds = snapshot.docs.map(doc => doc.data().followingId);

  if (followingIds.length === 0) return [];

  // Fetch user details
  const userDocs = await Promise.all(
    followingIds.map(id => db.collection('users').doc(id).get())
  );

  return userDocs
    .filter(doc => doc.exists)
    .map(doc => ({
      userId: doc.id,
      name: doc.data().name,
      profilePicUrl: doc.data().profilePicUrl
    }));
}

module.exports = {
  logActivity,
  getUserFeed,
  getFriendsFeed,
  followUser,
  unfollowUser,
  getFollowing
};
