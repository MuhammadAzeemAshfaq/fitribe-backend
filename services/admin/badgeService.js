const admin = require('firebase-admin');
const db = admin.firestore();

/**
 * Admin Badge Service
 * Business logic for admin badge operations
 */

// ==================== GET ALL BADGES ====================
async function getAllBadges(options = {}) {
  const { category, tier } = options;
  
  let query = db.collection('badges');
  
  // Filter by category
  if (category && category !== 'all') {
    query = query.where('category', '==', category);
  }
  
  // Filter by tier
  if (tier && tier !== 'all') {
    query = query.where('tier', '==', tier);
  }
  
  const snapshot = await query.get();
  
  const badges = await Promise.all(snapshot.docs.map(async (doc) => {
    const badgeData = doc.data();
    
    // Get count of users who earned this badge
    const earnedCount = await db.collection('userBadges')
      .where('badgeId', '==', doc.id)
      .count()
      .get();
    
    return {
      id: doc.id,
      ...badgeData,
      earnedByCount: earnedCount.data().count
    };
  }));
  
  return {
    badges,
    count: badges.length
  };
}

// ==================== GET BADGE DETAILS ====================
async function getBadgeDetails(badgeId) {
  const badgeDoc = await db.collection('badges').doc(badgeId).get();
  
  if (!badgeDoc.exists) {
    return null;
  }
  
  const badgeData = badgeDoc.data();
  
  // Get users who earned this badge
  const earnedSnapshot = await db.collection('userBadges')
    .where('badgeId', '==', badgeId)
    .get();
  
  // Get distribution by tier/category
  const stats = {
    totalEarned: earnedSnapshot.size,
    recentEarners: [],
    distribution: {
      thisWeek: 0,
      thisMonth: 0,
      allTime: earnedSnapshot.size
    }
  };
  
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  earnedSnapshot.docs.forEach(doc => {
    const data = doc.data();
    const earnedAt = data.earnedAt?.toDate();
    
    if (earnedAt > oneWeekAgo) stats.distribution.thisWeek++;
    if (earnedAt > oneMonthAgo) stats.distribution.thisMonth++;
  });
  
  // Get recent 5 earners
  stats.recentEarners = earnedSnapshot.docs
    .sort((a, b) => b.data().earnedAt?.toDate() - a.data().earnedAt?.toDate())
    .slice(0, 5)
    .map(doc => ({
      userId: doc.data().userId,
      earnedAt: doc.data().earnedAt?.toDate()
    }));
  
  return {
    badge: {
      id: badgeDoc.id,
      ...badgeData
    },
    statistics: stats
  };
}

// ==================== CREATE BADGE ====================
async function createBadge(badgeData) {
  // Validate condition types
  const validConditionTypes = [
    'workout_count',
    'total_calories',
    'streak_days',
    'level',
    'total_minutes',
    'perfect_form',
    'challenge_completion'
  ];
  
  if (!validConditionTypes.includes(badgeData.condition.type)) {
    throw new Error(
      `Invalid condition type. Must be one of: ${validConditionTypes.join(', ')}`
    );
  }
  
  // Validate category
  const validCategories = ['milestone', 'streak', 'social', 'challenge', 'performance'];
  if (!validCategories.includes(badgeData.category)) {
    throw new Error(
      `Invalid category. Must be one of: ${validCategories.join(', ')}`
    );
  }
  
  // Validate tier
  const validTiers = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
  if (badgeData.tier && !validTiers.includes(badgeData.tier)) {
    throw new Error(
      `Invalid tier. Must be one of: ${validTiers.join(', ')}`
    );
  }
  
  // Create badge document
  const badgeRef = await db.collection('badges').add({
    name: badgeData.name,
    description: badgeData.description,
    iconUrl: badgeData.iconUrl || '',
    tier: badgeData.tier || 'common',
    category: badgeData.category,
    points: badgeData.points || 50,
    condition: {
      type: badgeData.condition.type,
      value: badgeData.condition.value
    },
    createdBy: badgeData.createdBy,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
  
  return {
    badgeId: badgeRef.id,
    badge: {
      id: badgeRef.id,
      ...badgeData,
      createdAt: new Date()
    }
  };
}

// ==================== UPDATE BADGE ====================
async function updateBadge(badgeId, updateData, adminId) {
  const badgeRef = db.collection('badges').doc(badgeId);
  const badgeDoc = await badgeRef.get();
  
  if (!badgeDoc.exists) {
    throw new Error('Badge not found');
  }
  
  // Prepare update object (excluding condition)
  const updates = {
    ...updateData,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedBy: adminId
  };
  
  // Remove condition if accidentally included
  delete updates.condition;
  
  await badgeRef.update(updates);
  
  return {
    badgeId,
    updated: true
  };
}

// ==================== DELETE BADGE ====================
async function deleteBadge(badgeId) {
  const badgeRef = db.collection('badges').doc(badgeId);
  const badgeDoc = await badgeRef.get();
  
  if (!badgeDoc.exists) {
    throw new Error('Badge not found');
  }
  
  // Check if any users have earned this badge
  const earnedSnapshot = await db.collection('userBadges')
    .where('badgeId', '==', badgeId)
    .limit(1)
    .get();
  
  if (!earnedSnapshot.empty) {
    throw new Error(
      'Cannot delete badge that users have already earned. ' +
      'This would affect user achievements and progress.'
    );
  }
  
  // Safe to delete
  await badgeRef.delete();
  
  return {
    badgeId,
    deleted: true,
    message: 'Badge deleted successfully'
  };
}

// ==================== GET BADGE STATISTICS ====================
async function getBadgeStatistics(badgeId) {
  const badgeDoc = await db.collection('badges').doc(badgeId).get();
  
  if (!badgeDoc.exists) {
    throw new Error('Badge not found');
  }
  
  const earnedSnapshot = await db.collection('userBadges')
    .where('badgeId', '==', badgeId)
    .get();
  
  // Calculate time-based distribution
  const now = new Date();
  const distribution = {
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    thisYear: 0,
    allTime: earnedSnapshot.size
  };
  
  const todayStart = new Date(now.setHours(0, 0, 0, 0));
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const yearStart = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  
  earnedSnapshot.docs.forEach(doc => {
    const earnedAt = doc.data().earnedAt?.toDate();
    
    if (earnedAt > todayStart) distribution.today++;
    if (earnedAt > weekStart) distribution.thisWeek++;
    if (earnedAt > monthStart) distribution.thisMonth++;
    if (earnedAt > yearStart) distribution.thisYear++;
  });
  
  return {
    badgeId,
    totalEarned: earnedSnapshot.size,
    distribution,
    averagePerDay: earnedSnapshot.size > 0 
      ? (earnedSnapshot.size / 30).toFixed(2) 
      : 0
  };
}

// ==================== GET USERS WITH BADGE ====================
async function getUsersWithBadge(badgeId, limit = 50) {
  const earnedSnapshot = await db.collection('userBadges')
    .where('badgeId', '==', badgeId)
    .orderBy('earnedAt', 'desc')
    .limit(limit)
    .get();
  
  const users = await Promise.all(earnedSnapshot.docs.map(async (doc) => {
    const data = doc.data();
    
    // Get user details
    const userDoc = await db.collection('users').doc(data.userId).get();
    const userData = userDoc.exists ? userDoc.data() : {};
    
    return {
      userId: data.userId,
      userName: userData.name || 'Unknown',
      profilePicUrl: userData.profilePicUrl || '',
      earnedAt: data.earnedAt?.toDate(),
      progress: data.progress
    };
  }));
  
  return users;
}

module.exports = {
  getAllBadges,
  getBadgeDetails,
  createBadge,
  updateBadge,
  deleteBadge,
  getBadgeStatistics,
  getUsersWithBadge
};