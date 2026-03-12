/**
 * Progress Utilities
 * Pure functions for calculations and data transformations
 */

// ==================== CALCULATE TOTAL CALORIES ====================
function calculateTotalCalories(exercises) {
  return exercises.reduce((sum, ex) => sum + (ex.caloriesBurned || 0), 0);
}

// ==================== CALCULATE AVERAGE FORM SCORE ====================
function calculateAverageFormScore(exercises) {
  if (!exercises || exercises.length === 0) return 0;
  
  const totalScore = exercises.reduce((sum, ex) => sum + (ex.averageFormScore || 0), 0);
  return totalScore / exercises.length;
}

// ==================== CALCULATE STREAK ====================
function calculateStreak(lastWorkoutDate, currentStreak, longestStreak) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let newStreak = currentStreak || 0;
  
  if (lastWorkoutDate) {
    const lastWorkout = new Date(lastWorkoutDate);
    lastWorkout.setHours(0, 0, 0, 0);
    
    const daysDiff = Math.floor((today - lastWorkout) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 0) {
      // Same day workout, don't increment streak
      newStreak = currentStreak;
    } else if (daysDiff === 1) {
      // Consecutive day, increment streak
      newStreak = (currentStreak || 0) + 1;
    } else {
      // Streak broken, reset to 1
      newStreak = 1;
    }
  } else {
    newStreak = 1;
  }
  
  return {
    currentStreak: newStreak,
    longestStreak: Math.max(newStreak, longestStreak || 0)
  };
}

// ==================== CALCULATE LEVEL ====================
function calculateLevel(experiencePoints) {
  return Math.floor(experiencePoints / 500) + 1;
}

// ==================== GET DATE FOR PERIOD ====================
function getDateForPeriod(period) {
  const date = new Date();
  
  switch (period) {
    case 'week':
      date.setDate(date.getDate() - 7);
      break;
    case 'month':
      date.setMonth(date.getMonth() - 1);
      break;
    case 'year':
      date.setFullYear(date.getFullYear() - 1);
      break;
    default:
      // Return a date far in the past for 'all'
      date.setFullYear(date.getFullYear() - 10);
  }
  
  return date;
}

// ==================== CALCULATE WORKOUT STATS ====================
function calculateWorkoutStats(sessionDocs) {
  const stats = {
    totalWorkouts: sessionDocs.length,
    totalCalories: 0,
    totalMinutes: 0,
    avgFormScore: 0,
    exerciseBreakdown: {},
    dailyActivity: []
  };
  
  if (sessionDocs.length === 0) {
    return stats;
  }
  
  sessionDocs.forEach(doc => {
    const data = doc.data();
    stats.totalCalories += data.totalCalories || 0;
    stats.totalMinutes += data.durationMinutes || 0;
    stats.avgFormScore += data.overallFormScore || 0;
    
    // Exercise breakdown
    data.exercises?.forEach(ex => {
      if (!stats.exerciseBreakdown[ex.exerciseName]) {
        stats.exerciseBreakdown[ex.exerciseName] = 0;
      }
      stats.exerciseBreakdown[ex.exerciseName]++;
    });
  });
  
  // Calculate average form score
  stats.avgFormScore = Math.round((stats.avgFormScore / sessionDocs.length) * 100) / 100;
  
  return stats;
}

// ==================== VALIDATE WORKOUT SESSION DATA ====================
function validateWorkoutSessionData(data) {
  const errors = [];
  
  if (!data.userId) {
    errors.push('userId is required');
  }
  
  if (!data.exercises || !Array.isArray(data.exercises) || data.exercises.length === 0) {
    errors.push('exercises must be a non-empty array');
  }
  
  if (!data.durationMinutes || data.durationMinutes <= 0) {
    errors.push('durationMinutes must be greater than 0');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// ==================== FORMAT PROGRESS DATA ====================
function formatProgressData(progressData) {
  return {
    ...progressData,
    lastWorkoutDate: progressData.lastWorkoutDate?.toDate(),
    updatedAt: progressData.updatedAt?.toDate(),
    // Round decimal values
    totalCalories: Math.round(progressData.totalCalories || 0),
    avgFormScore: Math.round((progressData.avgFormScore || 0) * 100) / 100
  };
}

// ==================== CALCULATE DAYS UNTIL NEXT LEVEL ====================
function calculateDaysUntilNextLevel(currentXP, avgXPPerWorkout = 50) {
  const xpNeededForNextLevel = Math.ceil(currentXP / 500) * 500;
  const xpRemaining = xpNeededForNextLevel - currentXP;
  
  return Math.ceil(xpRemaining / avgXPPerWorkout);
}

// ==================== GET STREAK MILESTONE ====================
function getStreakMilestone(currentStreak) {
  const milestones = [7, 14, 30, 60, 100, 365];
  
  for (const milestone of milestones) {
    if (currentStreak < milestone) {
      return {
        nextMilestone: milestone,
        daysRemaining: milestone - currentStreak,
        progress: (currentStreak / milestone) * 100
      };
    }
  }
  
  // If past all milestones
  return {
    nextMilestone: null,
    daysRemaining: 0,
    progress: 100
  };
}

module.exports = {
  calculateTotalCalories,
  calculateAverageFormScore,
  calculateStreak,
  calculateLevel,
  getDateForPeriod,
  calculateWorkoutStats,
  validateWorkoutSessionData,
  formatProgressData,
  calculateDaysUntilNextLevel,
  getStreakMilestone
};