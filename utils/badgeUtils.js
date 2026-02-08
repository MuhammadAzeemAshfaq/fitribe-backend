/**
 * Badge Utilities
 * Pure functions for badge-related calculations and formatting
 */

// ==================== CALCULATE BADGE TIER ====================
function calculateBadgeTier(points) {
  if (points >= 500) return 'legendary';
  if (points >= 300) return 'epic';
  if (points >= 150) return 'rare';
  if (points >= 50) return 'uncommon';
  return 'common';
}

// ==================== GET BADGE TIER COLOR ====================
function getBadgeTierColor(tier) {
  const colors = {
    'legendary': '#FFD700', // Gold
    'epic': '#9B59B6',      // Purple
    'rare': '#3498DB',      // Blue
    'uncommon': '#2ECC71',  // Green
    'common': '#95A5A6'     // Gray
  };
  
  return colors[tier] || colors.common;
}

// ==================== FORMAT BADGE REQUIREMENT ====================
function formatBadgeRequirement(condition) {
  if (!condition || !condition.type || !condition.value) {
    return 'Unknown requirement';
  }
  
  const { type, value } = condition;
  
  const formatMap = {
    'workout_count': `Complete ${value} workout${value > 1 ? 's' : ''}`,
    'total_calories': `Burn ${value} total calories`,
    'streak_days': `Maintain a ${value}-day workout streak`,
    'level': `Reach level ${value}`,
    'total_minutes': `Exercise for ${value} total minutes`,
    'perfect_form': `Complete ${value} exercises with perfect form`,
    'challenge_completion': `Complete ${value} challenge${value > 1 ? 's' : ''}`
  };
  
  return formatMap[type] || `${type}: ${value}`;
}

// ==================== CALCULATE COMPLETION PERCENTAGE ====================
function calculateBadgeCompletionPercentage(currentProgress, targetProgress) {
  if (!targetProgress || targetProgress <= 0) return 0;
  
  const percentage = (currentProgress / targetProgress) * 100;
  return Math.min(Math.round(percentage * 100) / 100, 100);
}

// ==================== ESTIMATE TIME TO EARN ====================
function estimateTimeToEarn(currentProgress, targetProgress, averageDailyProgress) {
  if (averageDailyProgress <= 0) return null;
  
  const remaining = targetProgress - currentProgress;
  if (remaining <= 0) return 0;
  
  const daysNeeded = Math.ceil(remaining / averageDailyProgress);
  
  return {
    days: daysNeeded,
    formatted: formatDaysToCompletion(daysNeeded)
  };
}

// ==================== FORMAT DAYS TO COMPLETION ====================
function formatDaysToCompletion(days) {
  if (days === 0) return 'Ready to earn!';
  if (days === 1) return '1 day';
  if (days < 7) return `${days} days`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''}`;
  }
  const months = Math.floor(days / 30);
  return `${months} month${months > 1 ? 's' : ''}`;
}

// ==================== SORT BADGES ====================
function sortBadges(badges, sortBy = 'tier', order = 'desc') {
  const tierOrder = {
    'legendary': 5,
    'epic': 4,
    'rare': 3,
    'uncommon': 2,
    'common': 1
  };
  
  const sorted = [...badges].sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case 'tier':
        aValue = tierOrder[a.tier] || 0;
        bValue = tierOrder[b.tier] || 0;
        break;
      case 'points':
        aValue = a.points || 0;
        bValue = b.points || 0;
        break;
      case 'progress':
        aValue = a.progressPercentage || 0;
        bValue = b.progressPercentage || 0;
        break;
      case 'earnedDate':
        aValue = a.earnedAt ? new Date(a.earnedAt).getTime() : 0;
        bValue = b.earnedAt ? new Date(b.earnedAt).getTime() : 0;
        break;
      case 'name':
        aValue = a.name || '';
        bValue = b.name || '';
        return order === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      default:
        aValue = a[sortBy] || 0;
        bValue = b[sortBy] || 0;
    }
    
    return order === 'asc' ? aValue - bValue : bValue - aValue;
  });
  
  return sorted;
}

// ==================== FILTER BADGES BY TIER ====================
function filterBadgesByTier(badges, tier) {
  if (!tier || tier === 'all') return badges;
  return badges.filter(badge => badge.tier === tier);
}

// ==================== FILTER BADGES BY CATEGORY ====================
function filterBadgesByCategory(badges, category) {
  if (!category || category === 'all') return badges;
  return badges.filter(badge => badge.category === category);
}

// ==================== GROUP BADGES BY CATEGORY ====================
function groupBadgesByCategory(badges) {
  return badges.reduce((groups, badge) => {
    const category = badge.category || 'other';
    
    if (!groups[category]) {
      groups[category] = [];
    }
    
    groups[category].push(badge);
    return groups;
  }, {});
}

// ==================== GROUP BADGES BY TIER ====================
function groupBadgesByTier(badges) {
  return badges.reduce((groups, badge) => {
    const tier = badge.tier || 'common';
    
    if (!groups[tier]) {
      groups[tier] = [];
    }
    
    groups[tier].push(badge);
    return groups;
  }, {});
}

// ==================== CALCULATE BADGE RARITY SCORE ====================
function calculateRarityScore(badge, totalUsers, usersWithBadge) {
  if (totalUsers === 0) return 100;
  
  const earningRate = (usersWithBadge / totalUsers) * 100;
  
  // Invert: lower earning rate = higher rarity
  return Math.max(0, 100 - earningRate);
}

// ==================== GET BADGE ACHIEVEMENT MESSAGE ====================
function getBadgeAchievementMessage(badge) {
  const messages = {
    'milestone': `🎯 Milestone reached! You've earned the ${badge.name} badge!`,
    'streak': `🔥 Streak master! You've earned the ${badge.name} badge!`,
    'social': `👥 Social butterfly! You've earned the ${badge.name} badge!`,
    'challenge': `🏆 Challenge conquered! You've earned the ${badge.name} badge!`,
    'performance': `💪 Performance excellence! You've earned the ${badge.name} badge!`
  };
  
  return messages[badge.category] || `🎉 Congratulations! You've earned the ${badge.name} badge!`;
}

// ==================== FORMAT BADGE STATS ====================
function formatBadgeStats(badges) {
  const stats = {
    total: badges.length,
    byTier: {},
    byCategory: {},
    totalPoints: 0
  };
  
  badges.forEach(badge => {
    // Count by tier
    const tier = badge.tier || 'common';
    stats.byTier[tier] = (stats.byTier[tier] || 0) + 1;
    
    // Count by category
    const category = badge.category || 'other';
    stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
    
    // Sum points
    stats.totalPoints += badge.points || 0;
  });
  
  return stats;
}

// ==================== GET NEXT MILESTONE BADGES ====================
function getNextMilestoneBadges(badges, limit = 3) {
  return badges
    .filter(badge => !badge.isEarned && badge.progressPercentage > 0)
    .sort((a, b) => b.progressPercentage - a.progressPercentage)
    .slice(0, limit);
}

// ==================== VALIDATE BADGE DATA ====================
function validateBadgeData(badgeData) {
  const errors = [];
  
  if (!badgeData.name || badgeData.name.trim().length === 0) {
    errors.push('Badge name is required');
  }
  
  if (!badgeData.description || badgeData.description.trim().length === 0) {
    errors.push('Badge description is required');
  }
  
  if (!badgeData.category) {
    errors.push('Badge category is required');
  }
  
  if (!badgeData.tier) {
    errors.push('Badge tier is required');
  }
  
  if (!badgeData.condition || !badgeData.condition.type || !badgeData.condition.value) {
    errors.push('Badge condition with type and value is required');
  }
  
  if (badgeData.points !== undefined && badgeData.points < 0) {
    errors.push('Badge points cannot be negative');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// ==================== CALCULATE BADGE COLLECTION COMPLETION ====================
function calculateCollectionCompletion(earnedCount, totalCount) {
  if (totalCount === 0) return 0;
  
  const percentage = (earnedCount / totalCount) * 100;
  return Math.round(percentage * 100) / 100;
}

// ==================== GET RECOMMENDED NEXT BADGE ====================
function getRecommendedNextBadge(badges, userActivity) {
  // Filter unearned badges
  const unearned = badges.filter(b => !b.isEarned && b.progressPercentage > 0);
  
  if (unearned.length === 0) return null;
  
  // Score badges based on:
  // 1. Progress percentage (closer = better)
  // 2. User's preferred activity type
  // 3. Badge points (higher = more rewarding)
  
  const scored = unearned.map(badge => {
    let score = badge.progressPercentage;
    
    // Bonus for matching user activity
    if (userActivity && badge.condition.type === userActivity) {
      score += 20;
    }
    
    // Bonus for higher points (scaled)
    score += (badge.points || 0) / 20;
    
    return { ...badge, score };
  });
  
  // Return highest scoring badge
  scored.sort((a, b) => b.score - a.score);
  return scored[0];
}

module.exports = {
  calculateBadgeTier,
  getBadgeTierColor,
  formatBadgeRequirement,
  calculateBadgeCompletionPercentage,
  estimateTimeToEarn,
  formatDaysToCompletion,
  sortBadges,
  filterBadgesByTier,
  filterBadgesByCategory,
  groupBadgesByCategory,
  groupBadgesByTier,
  calculateRarityScore,
  getBadgeAchievementMessage,
  formatBadgeStats,
  getNextMilestoneBadges,
  validateBadgeData,
  calculateCollectionCompletion,
  getRecommendedNextBadge
};