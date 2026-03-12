const admin = require('firebase-admin');
const db = admin.firestore();

// ==================== REGISTER USER ====================
async function registerUser(uid, { name, email, profilePicUrl = '', bio = '', fitnessLevel = 1 }) {

  // Check if user document already exists (idempotent - safe to call twice)
  const userRef = db.collection('users').doc(uid);
  const existing = await userRef.get();

  if (existing.exists) {
    return { alreadyExists: true, user: { userId: uid, ...existing.data() } };
  }

  const now = admin.firestore.FieldValue.serverTimestamp();

  // Create all three documents in parallel
  await Promise.all([

    // 1. users document
    userRef.set({
      name: name || '',
      email: email || '',
      profilePicUrl,
      bio,
      fitnessLevel,
      status: 'Active',
      createdAt: now,
      updatedAt: now
    }),

    // 2. userProgress document (initialized to zero)
    db.collection('userProgress').doc(uid).set({
      userId: uid,
      totalWorkouts: 0,
      totalCalories: 0,
      totalMinutes: 0,
      currentStreak: 0,
      longestStreak: 0,
      level: 1,
      experiencePoints: 0,
      weeklyStats: { workouts: 0, calories: 0, minutes: 0 },
      monthlyStats: { workouts: 0, calories: 0, minutes: 0 },
      lastWorkoutDate: null,
      updatedAt: now
    }),

    // 3. workoutStreaks document
    db.collection('workoutStreaks').doc(uid).set({
      userId: uid,
      currentStreakDays: 0,
      longestStreakDays: 0,
      lastWorkoutDate: null,
      streakStatus: 'broken',
      createdAt: now
    })

  ]);

  return {
    alreadyExists: false,
    user: { userId: uid, name, email, profilePicUrl, bio, fitnessLevel, status: 'Active' }
  };
}

// ==================== GET USER PROFILE ====================
async function getUserProfile(userId) {
  const userDoc = await db.collection('users').doc(userId).get();

  if (!userDoc.exists) return null;

  const userData = userDoc.data();

  // Fetch progress, follower counts, and badge count in parallel
  const [progressDoc, followersSnap, followingSnap, badgesSnap] = await Promise.all([
    db.collection('userProgress').doc(userId).get(),
    db.collection('follows').where('followingId', '==', userId).get(),
    db.collection('follows').where('followerId', '==', userId).get(),
    db.collection('userBadges').where('userId', '==', userId).get()
  ]);

  const progress = progressDoc.exists ? progressDoc.data() : {};

  return {
    userId: userDoc.id,
    name: userData.name,
    bio: userData.bio || '',
    profilePicUrl: userData.profilePicUrl || '',
    fitnessLevel: userData.fitnessLevel || 1,
    status: userData.status,
    createdAt: userData.createdAt?.toDate(),
    stats: {
      totalWorkouts: progress.totalWorkouts || 0,
      totalCalories: progress.totalCalories || 0,
      totalMinutes: progress.totalMinutes || 0,
      currentStreak: progress.currentStreak || 0,
      longestStreak: progress.longestStreak || 0,
      level: progress.level || 1,
      experiencePoints: progress.experiencePoints || 0,
      badgesEarned: badgesSnap.size
    },
    social: {
      followersCount: followersSnap.size,
      followingCount: followingSnap.size
    }
  };
}

// ==================== UPDATE USER PROFILE ====================
async function updateUserProfile(userId, updates) {
  const allowedFields = ['name', 'bio', 'profilePicUrl', 'fitnessLevel'];
  const sanitized = {};

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      sanitized[field] = updates[field];
    }
  }

  if (Object.keys(sanitized).length === 0) {
    throw new Error('No valid fields provided for update');
  }

  sanitized.updatedAt = admin.firestore.FieldValue.serverTimestamp();

  await db.collection('users').doc(userId).update(sanitized);

  return getUserProfile(userId);
}

// ==================== FOLLOW USER ====================
async function followUser(followerId, followingId) {
  if (followerId === followingId) {
    throw new Error('You cannot follow yourself');
  }

  const [followerDoc, followingDoc] = await Promise.all([
    db.collection('users').doc(followerId).get(),
    db.collection('users').doc(followingId).get()
  ]);

  if (!followerDoc.exists) throw new Error('Follower user not found');
  if (!followingDoc.exists) throw new Error('User to follow not found');

  const followRef = db.collection('follows').doc(`${followerId}_${followingId}`);
  const existing = await followRef.get();

  if (existing.exists) throw new Error('Already following this user');

  await followRef.set({
    followerId,
    followingId,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return { success: true, message: `Now following user ${followingId}` };
}

// ==================== UNFOLLOW USER ====================
async function unfollowUser(followerId, followingId) {
  const followRef = db.collection('follows').doc(`${followerId}_${followingId}`);
  const existing = await followRef.get();

  if (!existing.exists) throw new Error('You are not following this user');

  await followRef.delete();

  return { success: true, message: `Unfollowed user ${followingId}` };
}

// ==================== GET FOLLOWERS ====================
async function getFollowers(userId, limit = 20, offset = 0) {
  const snap = await db.collection('follows')
    .where('followingId', '==', userId)
    .orderBy('createdAt', 'desc')
    .get();

  const paginated = snap.docs.slice(offset, offset + limit);

  const users = await Promise.all(paginated.map(async (doc) => {
    const { followerId, createdAt } = doc.data();
    const userDoc = await db.collection('users').doc(followerId).get();
    if (!userDoc.exists) return null;
    const u = userDoc.data();
    return { userId: followerId, name: u.name, profilePicUrl: u.profilePicUrl || '', fitnessLevel: u.fitnessLevel || 1, followedAt: createdAt?.toDate() };
  }));

  return { followers: users.filter(Boolean), total: snap.size, limit, offset };
}

// ==================== GET FOLLOWING ====================
async function getFollowing(userId, limit = 20, offset = 0) {
  const snap = await db.collection('follows')
    .where('followerId', '==', userId)
    .orderBy('createdAt', 'desc')
    .get();

  const paginated = snap.docs.slice(offset, offset + limit);

  const users = await Promise.all(paginated.map(async (doc) => {
    const { followingId, createdAt } = doc.data();
    const userDoc = await db.collection('users').doc(followingId).get();
    if (!userDoc.exists) return null;
    const u = userDoc.data();
    return { userId: followingId, name: u.name, profilePicUrl: u.profilePicUrl || '', fitnessLevel: u.fitnessLevel || 1, followedAt: createdAt?.toDate() };
  }));

  return { following: users.filter(Boolean), total: snap.size, limit, offset };
}

// ==================== CHECK IF FOLLOWING ====================
async function isFollowing(followerId, followingId) {
  const doc = await db.collection('follows').doc(`${followerId}_${followingId}`).get();
  return doc.exists;
}

module.exports = {
  registerUser,
  getUserProfile,
  updateUserProfile,
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  isFollowing
};