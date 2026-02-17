const admin = require('firebase-admin');
const db = admin.firestore();

/**
 * Badge Service
 * Handles badge awarding and management
 */

// ==================== GET ALL BADGES ====================
async function getAllBadges() {
  const badgesSnapshot = await db.collection('badges').get();
  
  return badgesSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

// ==================== CHECK AND AWARD BADGES ====================
async function checkAndAwardBadges(userId) {
  try {
    const progressDoc = await db.collection('userProgress').doc(userId).get();
    const progress = progressDoc.data();
    
    if (!progress) return [];
    
    // Get all badges
    const badgesSnapshot = await db.collection('badges').get();
    const allBadges = badgesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Get user's current badges
    const earnedBadgeIds = await getEarnedBadgeIds(userId);
    
    const newBadges = [];
    
    for (const badge of allBadges) {
      if (earnedBadgeIds.includes(badge.id)) continue;
      
      const earned = checkBadgeCondition(badge, progress);
      
      if (earned) {
        await awardBadge(userId, badge);
        newBadges.push(badge);
      }
    }
    
    return newBadges;
    
  } catch (error) {
    console.error('Error checking badges:', error);
    return [];
  }
}

// ==================== CHECK BADGE CONDITION ====================
function checkBadgeCondition(badge, progress) {
  if (!badge.condition || !badge.condition.type) return false;
  
  switch (badge.condition.type) {
    case 'workout_count':
      return progress.totalWorkouts >= badge.condition.value;
      
    case 'total_calories':
      return progress.totalCalories >= badge.condition.value;
      
    case 'streak_days':
      return progress.currentStreak >= badge.condition.value;
      
    case 'level':
      return progress.level >= badge.condition.value;
      
    case 'total_minutes':
      return progress.totalMinutes >= badge.condition.value;
      
    case 'perfect_form':
      // Requires additional data - would need to check recent sessions
      return false;
      
    default:
      return false;
  }
}

// ==================== AWARD BADGE ====================
async function awardBadge(userId, badge) {
  // Add badge to user's collection
  await db.collection('userBadges').add({
    userId,
    badgeId: badge.id,
    earnedAt: admin.firestore.FieldValue.serverTimestamp(),
    progress: 100
  });
  
  // Award XP if badge has points
  if (badge.points && badge.points > 0) {
    await db.collection('userProgress').doc(userId).update({
      experiencePoints: admin.firestore.FieldValue.increment(badge.points)
    });
  }
  
  console.log(`User ${userId} earned badge: ${badge.name}`);
}

// ==================== GET EARNED BADGE IDS ====================
async function getEarnedBadgeIds(userId) {
  const userBadgesSnapshot = await db.collection('userBadges')
    .where('userId', '==', userId)
    .get();
  
  return userBadgesSnapshot.docs.map(doc => doc.data().badgeId);
}

// ==================== GET USER BADGES ====================
async function getUserBadges(userId) {
  const userBadgesSnapshot = await db.collection('userBadges')
    .where('userId', '==', userId)
    .orderBy('earnedAt', 'desc')
    .get();
  
  const badges = [];
  
  for (const doc of userBadgesSnapshot.docs) {
    const userBadge = doc.data();
    const badgeDoc = await db.collection('badges').doc(userBadge.badgeId).get();
    
    if (badgeDoc.exists) {
      badges.push({
        id: doc.id,
        ...badgeDoc.data(),
        earnedAt: userBadge.earnedAt?.toDate(),
        progress: userBadge.progress
      });
    }
  }
  
  return badges;
}

// ==================== GET USER BADGES WITH LOCKED ====================
async function getUserBadgesWithLocked(userId) {
  try {
    // Get user's earned badges
    const earnedBadges = await getUserBadges(userId);
    
    // Get available (locked) badges
    const lockedBadges = await getAvailableBadges(userId);
    
    return {
      earned: earnedBadges,
      locked: lockedBadges,
      totalEarned: earnedBadges.length,
      totalAvailable: earnedBadges.length + lockedBadges.length
    };
    
  } catch (error) {
    console.error('Error getting user badges with locked:', error);
    throw error;
  }
}

// ==================== GET AVAILABLE BADGES ====================
async function getAvailableBadges(userId) {
  const allBadgesSnapshot = await db.collection('badges').get();
  const earnedBadgeIds = await getEarnedBadgeIds(userId);
  const progressDoc = await db.collection('userProgress').doc(userId).get();
  const progress = progressDoc.data() || {};
  
  const availableBadges = [];
  
  for (const doc of allBadgesSnapshot.docs) {
    const badge = { id: doc.id, ...doc.data() };
    
    if (!earnedBadgeIds.includes(badge.id)) {
      // Calculate progress towards this badge
      const badgeProgress = calculateBadgeProgress(badge, progress);
      
      availableBadges.push({
        ...badge,
        progress: badgeProgress,
        locked: true
      });
    }
  }
  
  return availableBadges;
}

// ==================== CALCULATE BADGE PROGRESS ====================
function calculateBadgeProgress(badge, progress) {
  if (!badge.condition || !badge.condition.type) return 0;
  
  let currentValue = 0;
  const targetValue = badge.condition.value || 1;
  
  switch (badge.condition.type) {
    case 'workout_count':
      currentValue = progress.totalWorkouts || 0;
      break;
      
    case 'total_calories':
      currentValue = progress.totalCalories || 0;
      break;
      
    case 'streak_days':
      currentValue = progress.currentStreak || 0;
      break;
      
    case 'level':
      currentValue = progress.level || 0;
      break;
      
    case 'total_minutes':
      currentValue = progress.totalMinutes || 0;
      break;
  }
  
  return Math.min(Math.round((currentValue / targetValue) * 100), 100);
}

module.exports = {
  getAllBadges,
  checkAndAwardBadges,
  getUserBadges,
  getUserBadgesWithLocked,  // ← Added
  getAvailableBadges,
  checkBadgeCondition,
  awardBadge,
  calculateBadgeProgress
};