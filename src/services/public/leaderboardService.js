const admin = require('firebase-admin');
const db = admin.firestore();

// ==================== GET GLOBAL LEADERBOARD ====================
async function getGlobalLeaderboard(type = 'xp', limit = 20, offset = 0) {
  const validTypes = ['xp', 'streak', 'workouts', 'calories'];
  if (!validTypes.includes(type)) {
    throw new Error(`type must be one of: ${validTypes.join(', ')}`);
  }

  // Map leaderboard type to the field in userProgress
  const fieldMap = {
    xp: 'experiencePoints',
    streak: 'currentStreak',
    workouts: 'totalWorkouts',
    calories: 'totalCalories'
  };

  const sortField = fieldMap[type];

  const snap = await db.collection('userProgress')
    .orderBy(sortField, 'desc')
    .limit(offset + limit)
    .get();

  const paginated = snap.docs.slice(offset, offset + limit);

  const entries = await Promise.all(paginated.map(async (doc, index) => {
    const data = doc.data();
    const userDoc = await db.collection('users').doc(doc.id).get();
    const userData = userDoc.exists ? userDoc.data() : {};

    return {
      rank: offset + index + 1,
      userId: doc.id,
      name: userData.name || 'Unknown',
      profilePicUrl: userData.profilePicUrl || '',
      level: data.level || 1,
      value: data[sortField] || 0,
      // Always include XP and streak for context
      experiencePoints: data.experiencePoints || 0,
      currentStreak: data.currentStreak || 0,
      totalWorkouts: data.totalWorkouts || 0
    };
  }));

  return {
    type,
    leaderboard: entries,
    limit,
    offset
  };
}

// ==================== GET USER RANK ====================
async function getUserRank(userId, type = 'xp') {
  const fieldMap = {
    xp: 'experiencePoints',
    streak: 'currentStreak',
    workouts: 'totalWorkouts',
    calories: 'totalCalories'
  };

  const sortField = fieldMap[type];
  if (!sortField) throw new Error(`Invalid leaderboard type: ${type}`);

  // Get the user's own value first
  const userProgressDoc = await db.collection('userProgress').doc(userId).get();
  if (!userProgressDoc.exists) {
    return null;
  }

  const userValue = userProgressDoc.data()[sortField] || 0;

  // Count how many users have a strictly higher value (rank = count + 1)
  const higherSnap = await db.collection('userProgress')
    .where(sortField, '>', userValue)
    .get();

  const rank = higherSnap.size + 1;

  return {
    userId,
    rank,
    value: userValue,
    type
  };
}

// ==================== GET FRIENDS LEADERBOARD ====================
async function getFriendsLeaderboard(userId, type = 'xp', limit = 20) {
  const fieldMap = {
    xp: 'experiencePoints',
    streak: 'currentStreak',
    workouts: 'totalWorkouts',
    calories: 'totalCalories'
  };

  const sortField = fieldMap[type];
  if (!sortField) throw new Error(`Invalid leaderboard type: ${type}`);

  // Get all users the current user is following
  const followingSnap = await db.collection('follows')
    .where('followerId', '==', userId)
    .get();

  const followingIds = followingSnap.docs.map(doc => doc.data().followingId);

  // Include the user themselves
  const userIds = [userId, ...followingIds];

  if (userIds.length === 0) {
    return { type, leaderboard: [], limit };
  }

  // Fetch all progress docs for these users (Firestore 'in' supports up to 30 items)
  const chunks = [];
  for (let i = 0; i < userIds.length; i += 30) {
    chunks.push(userIds.slice(i, i + 30));
  }

  const progressDocs = [];
  for (const chunk of chunks) {
    const snap = await db.collection('userProgress')
      .where(admin.firestore.FieldPath.documentId(), 'in', chunk)
      .get();
    progressDocs.push(...snap.docs);
  }

  // Sort by the chosen field
  progressDocs.sort((a, b) => (b.data()[sortField] || 0) - (a.data()[sortField] || 0));

  const limited = progressDocs.slice(0, limit);

  const entries = await Promise.all(limited.map(async (doc, index) => {
    const data = doc.data();
    const userDoc = await db.collection('users').doc(doc.id).get();
    const userData = userDoc.exists ? userDoc.data() : {};

    return {
      rank: index + 1,
      userId: doc.id,
      name: userData.name || 'Unknown',
      profilePicUrl: userData.profilePicUrl || '',
      level: data.level || 1,
      value: data[sortField] || 0,
      experiencePoints: data.experiencePoints || 0,
      currentStreak: data.currentStreak || 0,
      totalWorkouts: data.totalWorkouts || 0,
      isCurrentUser: doc.id === userId
    };
  }));

  return {
    type,
    leaderboard: entries,
    limit
  };
}

module.exports = {
  getGlobalLeaderboard,
  getUserRank,
  getFriendsLeaderboard
};