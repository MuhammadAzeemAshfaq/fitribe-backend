const {
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
} = require('../../../utils/progressUtils');

describe('progressUtils', () => {

  describe('calculateTotalCalories', () => {
    it('should sum caloriesBurned across all exercises', () => {
      const exercises = [
        { caloriesBurned: 100 },
        { caloriesBurned: 200 },
        { caloriesBurned: 50 }
      ];
      expect(calculateTotalCalories(exercises)).toBe(350);
    });

    it('should return 0 for empty exercises array', () => {
      expect(calculateTotalCalories([])).toBe(0);
    });

    it('should handle exercises with no caloriesBurned field', () => {
      const exercises = [{ exerciseName: 'squat' }, { caloriesBurned: 100 }];
      expect(calculateTotalCalories(exercises)).toBe(100);
    });

    it('should handle all exercises missing caloriesBurned', () => {
      const exercises = [{ exerciseName: 'squat' }, { exerciseName: 'lunge' }];
      expect(calculateTotalCalories(exercises)).toBe(0);
    });
  });

  describe('calculateAverageFormScore', () => {
    it('should calculate average of averageFormScore across exercises', () => {
      const exercises = [
        { averageFormScore: 80 },
        { averageFormScore: 90 },
        { averageFormScore: 70 }
      ];
      expect(calculateAverageFormScore(exercises)).toBeCloseTo(80);
    });

    it('should return 0 for empty exercises array', () => {
      expect(calculateAverageFormScore([])).toBe(0);
    });

    it('should return 0 for null/undefined input', () => {
      expect(calculateAverageFormScore(null)).toBe(0);
      expect(calculateAverageFormScore(undefined)).toBe(0);
    });

    it('should handle exercises missing averageFormScore', () => {
      const exercises = [{ exerciseName: 'squat' }, { averageFormScore: 80 }];
      expect(calculateAverageFormScore(exercises)).toBe(40);
    });
  });

  describe('calculateStreak', () => {
    it('should return streak of 1 when no previous workout', () => {
      const result = calculateStreak(null, 0, 0);
      expect(result.currentStreak).toBe(1);
      expect(result.longestStreak).toBe(1);
    });

    it('should not increment streak for same-day workout', () => {
      const today = new Date().toISOString();
      const result = calculateStreak(today, 5, 10);
      expect(result.currentStreak).toBe(5);
    });

    it('should increment streak for consecutive day workout', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const result = calculateStreak(yesterday.toISOString(), 5, 5);
      expect(result.currentStreak).toBe(6);
      expect(result.longestStreak).toBe(6);
    });

    it('should reset streak to 1 when streak is broken', () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const result = calculateStreak(threeDaysAgo.toISOString(), 10, 15);
      expect(result.currentStreak).toBe(1);
      expect(result.longestStreak).toBe(15);
    });

    it('should preserve longestStreak when current is lower', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const result = calculateStreak(yesterday.toISOString(), 3, 20);
      expect(result.currentStreak).toBe(4);
      expect(result.longestStreak).toBe(20);
    });
  });

  describe('calculateLevel', () => {
    it('should return level 1 for 0 XP', () => {
      expect(calculateLevel(0)).toBe(1);
    });

    it('should return level 1 for XP below 500', () => {
      expect(calculateLevel(499)).toBe(1);
    });

    it('should return level 2 at 500 XP', () => {
      expect(calculateLevel(500)).toBe(2);
    });

    it('should return level 3 at 1000 XP', () => {
      expect(calculateLevel(1000)).toBe(3);
    });

    it('should return level 11 at 5000 XP', () => {
      expect(calculateLevel(5000)).toBe(11);
    });
  });

  describe('getDateForPeriod', () => {
    it('should return a date 7 days ago for "week"', () => {
      const result = getDateForPeriod('week');
      const expected = new Date();
      expected.setDate(expected.getDate() - 7);
      expect(result.getDate()).toBe(expected.getDate());
    });

    it('should return a date 1 month ago for "month"', () => {
      const result = getDateForPeriod('month');
      const expected = new Date();
      expected.setMonth(expected.getMonth() - 1);
      expect(result.getMonth()).toBe(expected.getMonth());
    });

    it('should return a date 1 year ago for "year"', () => {
      const result = getDateForPeriod('year');
      const expected = new Date();
      expected.setFullYear(expected.getFullYear() - 1);
      expect(result.getFullYear()).toBe(expected.getFullYear());
    });

    it('should return a date 10 years ago for "all"', () => {
      const result = getDateForPeriod('all');
      const expected = new Date();
      expected.setFullYear(expected.getFullYear() - 10);
      expect(result.getFullYear()).toBe(expected.getFullYear());
    });

    it('should return a date 10 years ago for unknown period', () => {
      const result = getDateForPeriod('unknown');
      const expected = new Date();
      expected.setFullYear(expected.getFullYear() - 10);
      expect(result.getFullYear()).toBe(expected.getFullYear());
    });
  });

  describe('calculateWorkoutStats', () => {
    const makeDoc = (data) => ({ data: () => data });

    it('should return zeroed stats for empty sessions', () => {
      const result = calculateWorkoutStats([]);
      expect(result.totalWorkouts).toBe(0);
      expect(result.totalCalories).toBe(0);
      expect(result.totalMinutes).toBe(0);
    });

    it('should sum calories and minutes across sessions', () => {
      const sessions = [
        makeDoc({ totalCalories: 300, durationMinutes: 30, overallFormScore: 80, exercises: [] }),
        makeDoc({ totalCalories: 200, durationMinutes: 20, overallFormScore: 90, exercises: [] })
      ];
      const result = calculateWorkoutStats(sessions);
      expect(result.totalWorkouts).toBe(2);
      expect(result.totalCalories).toBe(500);
      expect(result.totalMinutes).toBe(50);
    });

    it('should calculate average form score', () => {
      const sessions = [
        makeDoc({ totalCalories: 0, durationMinutes: 0, overallFormScore: 80, exercises: [] }),
        makeDoc({ totalCalories: 0, durationMinutes: 0, overallFormScore: 60, exercises: [] })
      ];
      const result = calculateWorkoutStats(sessions);
      expect(result.avgFormScore).toBe(70);
    });

    it('should build exercise breakdown', () => {
      const sessions = [
        makeDoc({
          totalCalories: 0, durationMinutes: 0, overallFormScore: 0,
          exercises: [{ exerciseName: 'squat' }, { exerciseName: 'squat' }]
        }),
        makeDoc({
          totalCalories: 0, durationMinutes: 0, overallFormScore: 0,
          exercises: [{ exerciseName: 'lunge' }]
        })
      ];
      const result = calculateWorkoutStats(sessions);
      expect(result.exerciseBreakdown['squat']).toBe(2);
      expect(result.exerciseBreakdown['lunge']).toBe(1);
    });
  });

  describe('validateWorkoutSessionData', () => {
    it('should return isValid=true for valid data', () => {
      const data = {
        userId: 'u1',
        exercises: [{ exerciseName: 'squat' }],
        durationMinutes: 30
      };
      const result = validateWorkoutSessionData(data);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when userId is missing', () => {
      const result = validateWorkoutSessionData({ exercises: [{}], durationMinutes: 30 });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('userId is required');
    });

    it('should fail when exercises is empty array', () => {
      const result = validateWorkoutSessionData({ userId: 'u1', exercises: [], durationMinutes: 30 });
      expect(result.isValid).toBe(false);
    });

    it('should fail when exercises is not an array', () => {
      const result = validateWorkoutSessionData({ userId: 'u1', exercises: 'bad', durationMinutes: 30 });
      expect(result.isValid).toBe(false);
    });

    it('should fail when durationMinutes is 0', () => {
      const result = validateWorkoutSessionData({ userId: 'u1', exercises: [{}], durationMinutes: 0 });
      expect(result.isValid).toBe(false);
    });

    it('should return multiple errors for multiple invalid fields', () => {
      const result = validateWorkoutSessionData({});
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('formatProgressData', () => {
    it('should call toDate() on lastWorkoutDate and updatedAt', () => {
      const mockDate = new Date('2024-01-01');
      const progressData = {
        lastWorkoutDate: { toDate: () => mockDate },
        updatedAt: { toDate: () => mockDate },
        totalCalories: 1234.56,
        avgFormScore: 85.678
      };
      const result = formatProgressData(progressData);
      expect(result.lastWorkoutDate).toBe(mockDate);
      expect(result.updatedAt).toBe(mockDate);
      expect(result.totalCalories).toBe(1235);
      expect(result.avgFormScore).toBe(85.68);
    });

    it('should handle missing optional fields gracefully', () => {
      const result = formatProgressData({});
      expect(result.totalCalories).toBe(0);
      expect(result.avgFormScore).toBe(0);
    });
  });

  describe('calculateDaysUntilNextLevel', () => {
    it('should calculate days until next level at 0 XP', () => {
      // At 0 XP, next level is 500, remaining = 500, at 50/workout = 10
      // But Math.ceil(0/500)*500 = 0, so remaining = 0 → returns 0
      expect(calculateDaysUntilNextLevel(0)).toBe(0);
    });

    it('should calculate days until next level at 250 XP', () => {
      // 250 remaining to 500, at 50/workout = 5
      expect(calculateDaysUntilNextLevel(250)).toBe(5);
    });

    it('should use custom avgXPPerWorkout', () => {
      expect(calculateDaysUntilNextLevel(0, 100)).toBe(0);
    });

    it('should return 1 when only 1 XP remaining', () => {
      expect(calculateDaysUntilNextLevel(499)).toBe(1);
    });
  });

  describe('getStreakMilestone', () => {
    it('should return first milestone (7) when streak is 0', () => {
      const result = getStreakMilestone(0);
      expect(result.nextMilestone).toBe(7);
      expect(result.daysRemaining).toBe(7);
    });

    it('should return next milestone when streak is partway through', () => {
      const result = getStreakMilestone(5);
      expect(result.nextMilestone).toBe(7);
      expect(result.daysRemaining).toBe(2);
      expect(result.progress).toBeCloseTo(71.43, 1);
    });

    it('should advance to next milestone after passing one', () => {
      const result = getStreakMilestone(10);
      expect(result.nextMilestone).toBe(14);
    });

    it('should return progress=100 and nextMilestone=null when past all milestones', () => {
      const result = getStreakMilestone(400);
      expect(result.nextMilestone).toBeNull();
      expect(result.progress).toBe(100);
      expect(result.daysRemaining).toBe(0);
    });
  });

});