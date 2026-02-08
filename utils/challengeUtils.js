/**
 * Challenge Utilities
 * Pure functions for challenge-related calculations and validations
 */

// ==================== CALCULATE CHALLENGE COMPLETION PERCENTAGE ====================
function calculateCompletionPercentage(currentProgress, targetValue) {
  if (!targetValue || targetValue <= 0) return 0;
  
  const percentage = (currentProgress / targetValue) * 100;
  return Math.min(Math.round(percentage * 100) / 100, 100);
}

// ==================== IS CHALLENGE ACTIVE ====================
function isChallengeActive(challenge) {
  const now = new Date();
  const startDate = challenge.startDate instanceof Date 
    ? challenge.startDate 
    : new Date(challenge.startDate);
  const endDate = challenge.endDate instanceof Date 
    ? challenge.endDate 
    : new Date(challenge.endDate);
  
  return challenge.status === 'active' && 
         now >= startDate && 
         now <= endDate;
}

// ==================== IS CHALLENGE EXPIRED ====================
function isChallengeExpired(challenge) {
  const now = new Date();
  const endDate = challenge.endDate instanceof Date 
    ? challenge.endDate 
    : new Date(challenge.endDate);
  
  return now > endDate;
}

// ==================== CALCULATE TIME REMAINING ====================
function calculateTimeRemaining(endDate) {
  const end = endDate instanceof Date ? endDate : new Date(endDate);
  const now = new Date();
  const diff = end - now;
  
  if (diff <= 0) {
    return {
      expired: true,
      days: 0,
      hours: 0,
      minutes: 0,
      totalSeconds: 0
    };
  }
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const totalSeconds = Math.floor(diff / 1000);
  
  return {
    expired: false,
    days,
    hours,
    minutes,
    totalSeconds,
    formatted: formatTimeRemaining(days, hours, minutes)
  };
}

// ==================== FORMAT TIME REMAINING ====================
function formatTimeRemaining(days, hours, minutes) {
  if (days > 0) {
    return `${days}d ${hours}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

// ==================== CALCULATE CHALLENGE DIFFICULTY ====================
function calculateChallengeDifficulty(challenge) {
  // Simple difficulty scoring based on target value and duration
  const targetValue = challenge.goal?.targetValue || 0;
  const startDate = new Date(challenge.startDate);
  const endDate = new Date(challenge.endDate);
  const durationDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  
  // Daily target required
  const dailyTarget = targetValue / Math.max(durationDays, 1);
  
  // Categorize difficulty
  if (challenge.type === 'workout_count') {
    if (dailyTarget >= 2) return 'hard';
    if (dailyTarget >= 1) return 'medium';
    return 'easy';
  } else if (challenge.type === 'calories') {
    if (dailyTarget >= 500) return 'hard';
    if (dailyTarget >= 300) return 'medium';
    return 'easy';
  } else if (challenge.type === 'exercise_count') {
    if (dailyTarget >= 50) return 'hard';
    if (dailyTarget >= 30) return 'medium';
    return 'easy';
  }
  
  return 'medium';
}

// ==================== SORT CHALLENGES ====================
function sortChallenges(challenges, sortBy = 'startDate', order = 'desc') {
  const sorted = [...challenges].sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case 'startDate':
        aValue = new Date(a.startDate).getTime();
        bValue = new Date(b.startDate).getTime();
        break;
      case 'endDate':
        aValue = new Date(a.endDate).getTime();
        bValue = new Date(b.endDate).getTime();
        break;
      case 'participants':
        aValue = a.participantCount || 0;
        bValue = b.participantCount || 0;
        break;
      case 'difficulty':
        const difficultyOrder = { easy: 1, medium: 2, hard: 3 };
        aValue = difficultyOrder[calculateChallengeDifficulty(a)] || 2;
        bValue = difficultyOrder[calculateChallengeDifficulty(b)] || 2;
        break;
      default:
        aValue = a[sortBy];
        bValue = b[sortBy];
    }
    
    if (order === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });
  
  return sorted;
}

// ==================== FILTER CHALLENGES BY TYPE ====================
function filterChallengesByType(challenges, type) {
  if (!type || type === 'all') return challenges;
  
  return challenges.filter(challenge => challenge.type === type);
}

// ==================== FILTER CHALLENGES BY DIFFICULTY ====================
function filterChallengesByDifficulty(challenges, difficulty) {
  if (!difficulty || difficulty === 'all') return challenges;
  
  return challenges.filter(challenge => 
    calculateChallengeDifficulty(challenge) === difficulty
  );
}

// ==================== CALCULATE RANK CHANGE ====================
function calculateRankChange(previousRank, currentRank) {
  if (!previousRank || !currentRank) return 0;
  
  return previousRank - currentRank; // Positive means improvement
}

// ==================== FORMAT CHALLENGE PROGRESS ====================
function formatChallengeProgress(progress, goal) {
  const percentage = calculateCompletionPercentage(progress, goal.targetValue);
  
  return {
    current: progress,
    target: goal.targetValue,
    percentage,
    remaining: Math.max(0, goal.targetValue - progress),
    isComplete: progress >= goal.targetValue
  };
}

// ==================== VALIDATE CHALLENGE DATA ====================
function validateChallengeData(challengeData) {
  const errors = [];
  
  if (!challengeData.name || challengeData.name.trim().length === 0) {
    errors.push('Challenge name is required');
  }
  
  if (!challengeData.type) {
    errors.push('Challenge type is required');
  }
  
  if (!challengeData.goal || !challengeData.goal.targetValue) {
    errors.push('Challenge goal with target value is required');
  }
  
  if (!challengeData.startDate) {
    errors.push('Start date is required');
  }
  
  if (!challengeData.endDate) {
    errors.push('End date is required');
  }
  
  if (challengeData.startDate && challengeData.endDate) {
    const start = new Date(challengeData.startDate);
    const end = new Date(challengeData.endDate);
    
    if (end <= start) {
      errors.push('End date must be after start date');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// ==================== GET CHALLENGE STATUS LABEL ====================
function getChallengeStatusLabel(challenge) {
  if (challenge.status === 'completed') return 'Completed';
  if (challenge.status === 'cancelled') return 'Cancelled';
  if (isChallengeExpired(challenge)) return 'Expired';
  if (isChallengeActive(challenge)) return 'Active';
  if (new Date(challenge.startDate) > new Date()) return 'Upcoming';
  
  return 'Unknown';
}

// ==================== CALCULATE ESTIMATED COMPLETION DATE ====================
function calculateEstimatedCompletionDate(currentProgress, targetValue, dailyAverage) {
  if (dailyAverage <= 0) return null;
  
  const remaining = targetValue - currentProgress;
  const daysNeeded = Math.ceil(remaining / dailyAverage);
  
  const estimatedDate = new Date();
  estimatedDate.setDate(estimatedDate.getDate() + daysNeeded);
  
  return estimatedDate;
}

// ==================== GROUP CHALLENGES BY STATUS ====================
function groupChallengesByStatus(challenges) {
  return challenges.reduce((groups, challenge) => {
    const status = getChallengeStatusLabel(challenge).toLowerCase();
    
    if (!groups[status]) {
      groups[status] = [];
    }
    
    groups[status].push(challenge);
    return groups;
  }, {});
}

module.exports = {
  calculateCompletionPercentage,
  isChallengeActive,
  isChallengeExpired,
  calculateTimeRemaining,
  calculateChallengeDifficulty,
  sortChallenges,
  filterChallengesByType,
  filterChallengesByDifficulty,
  calculateRankChange,
  formatChallengeProgress,
  validateChallengeData,
  getChallengeStatusLabel,
  calculateEstimatedCompletionDate,
  groupChallengesByStatus,
  formatTimeRemaining
};