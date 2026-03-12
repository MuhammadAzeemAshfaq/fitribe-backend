const {
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
} = require('../../../utils/badgeUtils');

describe('badgeUtils', () => {

  // ==================== calculateBadgeTier ====================
  describe('calculateBadgeTier', () => {
    it('should return legendary for 500+ points', () => {
      expect(calculateBadgeTier(500)).toBe('legendary');
      expect(calculateBadgeTier(1000)).toBe('legendary');
    });
    it('should return epic for 300-499 points', () => {
      expect(calculateBadgeTier(300)).toBe('epic');
      expect(calculateBadgeTier(499)).toBe('epic');
    });
    it('should return rare for 150-299 points', () => {
      expect(calculateBadgeTier(150)).toBe('rare');
    });
    it('should return uncommon for 50-149 points', () => {
      expect(calculateBadgeTier(50)).toBe('uncommon');
    });
    it('should return common for below 50 points', () => {
      expect(calculateBadgeTier(0)).toBe('common');
      expect(calculateBadgeTier(49)).toBe('common');
    });
  });

  // ==================== getBadgeTierColor ====================
  describe('getBadgeTierColor', () => {
    it('should return gold for legendary', () => {
      expect(getBadgeTierColor('legendary')).toBe('#FFD700');
    });
    it('should return purple for epic', () => {
      expect(getBadgeTierColor('epic')).toBe('#9B59B6');
    });
    it('should return blue for rare', () => {
      expect(getBadgeTierColor('rare')).toBe('#3498DB');
    });
    it('should return green for uncommon', () => {
      expect(getBadgeTierColor('uncommon')).toBe('#2ECC71');
    });
    it('should return gray for common', () => {
      expect(getBadgeTierColor('common')).toBe('#95A5A6');
    });
    it('should return common color for unknown tier', () => {
      expect(getBadgeTierColor('unknown')).toBe('#95A5A6');
    });
  });

  // ==================== formatBadgeRequirement ====================
  describe('formatBadgeRequirement', () => {
    it('should format workout_count condition', () => {
      expect(formatBadgeRequirement({ type: 'workout_count', value: 10 }))
        .toBe('Complete 10 workouts');
    });
    it('should use singular for value of 1', () => {
      expect(formatBadgeRequirement({ type: 'workout_count', value: 1 }))
        .toBe('Complete 1 workout');
    });
    it('should format total_calories condition', () => {
      expect(formatBadgeRequirement({ type: 'total_calories', value: 1000 }))
        .toBe('Burn 1000 total calories');
    });
    it('should format streak_days condition', () => {
      expect(formatBadgeRequirement({ type: 'streak_days', value: 7 }))
        .toBe('Maintain a 7-day workout streak');
    });
    it('should format level condition', () => {
      expect(formatBadgeRequirement({ type: 'level', value: 5 }))
        .toBe('Reach level 5');
    });
    it('should format total_minutes condition', () => {
      expect(formatBadgeRequirement({ type: 'total_minutes', value: 300 }))
        .toBe('Exercise for 300 total minutes');
    });
    it('should return Unknown requirement for null condition', () => {
      expect(formatBadgeRequirement(null)).toBe('Unknown requirement');
    });
    it('should return Unknown requirement when type missing', () => {
      expect(formatBadgeRequirement({ value: 10 })).toBe('Unknown requirement');
    });
    it('should handle unknown condition type with fallback', () => {
      const result = formatBadgeRequirement({ type: 'mystery_type', value: 5 });
      expect(result).toContain('mystery_type');
    });
  });

  // ==================== calculateBadgeCompletionPercentage ====================
  describe('calculateBadgeCompletionPercentage', () => {
    it('should return 50 for halfway progress', () => {
      expect(calculateBadgeCompletionPercentage(5, 10)).toBe(50);
    });
    it('should return 100 when complete', () => {
      expect(calculateBadgeCompletionPercentage(10, 10)).toBe(100);
    });
    it('should cap at 100 when over target', () => {
      expect(calculateBadgeCompletionPercentage(20, 10)).toBe(100);
    });
    it('should return 0 when target is 0', () => {
      expect(calculateBadgeCompletionPercentage(5, 0)).toBe(0);
    });
    it('should return 0 when no progress', () => {
      expect(calculateBadgeCompletionPercentage(0, 10)).toBe(0);
    });
  });

  // ==================== estimateTimeToEarn ====================
  describe('estimateTimeToEarn', () => {
    it('should return days needed to earn badge', () => {
      const result = estimateTimeToEarn(0, 10, 2);
      expect(result.days).toBe(5);
    });
    it('should return 0 when already earned', () => {
      const result = estimateTimeToEarn(10, 10, 2);
      expect(result).toBe(0);
    });
    it('should return null when averageDailyProgress is 0', () => {
      expect(estimateTimeToEarn(0, 10, 0)).toBeNull();
    });
    it('should include formatted string', () => {
      const result = estimateTimeToEarn(0, 10, 2);
      expect(result.formatted).toBeDefined();
    });
  });

  // ==================== formatDaysToCompletion ====================
  describe('formatDaysToCompletion', () => {
    it('should return "Ready to earn!" for 0 days', () => {
      expect(formatDaysToCompletion(0)).toBe('Ready to earn!');
    });
    it('should return "1 day" for 1 day', () => {
      expect(formatDaysToCompletion(1)).toBe('1 day');
    });
    it('should return days for less than 7', () => {
      expect(formatDaysToCompletion(5)).toBe('5 days');
    });
    it('should return weeks for 7-29 days', () => {
      expect(formatDaysToCompletion(7)).toBe('1 week');
      expect(formatDaysToCompletion(14)).toBe('2 weeks');
    });
    it('should return months for 30+ days', () => {
      expect(formatDaysToCompletion(30)).toBe('1 month');
      expect(formatDaysToCompletion(60)).toBe('2 months');
    });
  });

  // ==================== sortBadges ====================
  describe('sortBadges', () => {
    const badges = [
      { name: 'A', tier: 'common', points: 50, progressPercentage: 30 },
      { name: 'B', tier: 'legendary', points: 500, progressPercentage: 80 },
      { name: 'C', tier: 'rare', points: 200, progressPercentage: 60 }
    ];

    it('should sort by tier descending by default', () => {
      const result = sortBadges(badges);
      expect(result[0].tier).toBe('legendary');
    });
    it('should sort by points ascending', () => {
      const result = sortBadges(badges, 'points', 'asc');
      expect(result[0].points).toBe(50);
    });
    it('should sort by progress descending', () => {
      const result = sortBadges(badges, 'progress', 'desc');
      expect(result[0].progressPercentage).toBe(80);
    });
    it('should sort by name ascending', () => {
      const result = sortBadges(badges, 'name', 'asc');
      expect(result[0].name).toBe('A');
    });
    it('should sort by name descending', () => {
      const result = sortBadges(badges, 'name', 'desc');
      expect(result[0].name).toBe('C');
    });
    it('should not mutate original array', () => {
      const original = [...badges];
      sortBadges(badges, 'points', 'asc');
      expect(badges[0]).toEqual(original[0]);
    });
  });

  // ==================== filterBadgesByTier ====================
  describe('filterBadgesByTier', () => {
    const badges = [
      { name: 'A', tier: 'common' },
      { name: 'B', tier: 'rare' },
      { name: 'C', tier: 'common' }
    ];
    it('should filter by specific tier', () => {
      const result = filterBadgesByTier(badges, 'common');
      expect(result).toHaveLength(2);
    });
    it('should return all when tier is "all"', () => {
      expect(filterBadgesByTier(badges, 'all')).toHaveLength(3);
    });
    it('should return all when tier is null', () => {
      expect(filterBadgesByTier(badges, null)).toHaveLength(3);
    });
  });

  // ==================== filterBadgesByCategory ====================
  describe('filterBadgesByCategory', () => {
    const badges = [
      { name: 'A', category: 'milestone' },
      { name: 'B', category: 'streak' },
      { name: 'C', category: 'milestone' }
    ];
    it('should filter by specific category', () => {
      expect(filterBadgesByCategory(badges, 'milestone')).toHaveLength(2);
    });
    it('should return all when category is "all"', () => {
      expect(filterBadgesByCategory(badges, 'all')).toHaveLength(3);
    });
    it('should return all when category is null', () => {
      expect(filterBadgesByCategory(badges, null)).toHaveLength(3);
    });
  });

  // ==================== groupBadgesByCategory ====================
  describe('groupBadgesByCategory', () => {
    it('should group badges by category', () => {
      const badges = [
        { name: 'A', category: 'milestone' },
        { name: 'B', category: 'streak' },
        { name: 'C', category: 'milestone' }
      ];
      const result = groupBadgesByCategory(badges);
      expect(result.milestone).toHaveLength(2);
      expect(result.streak).toHaveLength(1);
    });
    it('should use "other" for missing category', () => {
      const result = groupBadgesByCategory([{ name: 'A' }]);
      expect(result.other).toHaveLength(1);
    });
  });

  // ==================== groupBadgesByTier ====================
  describe('groupBadgesByTier', () => {
    it('should group badges by tier', () => {
      const badges = [
        { name: 'A', tier: 'common' },
        { name: 'B', tier: 'rare' },
        { name: 'C', tier: 'common' }
      ];
      const result = groupBadgesByTier(badges);
      expect(result.common).toHaveLength(2);
      expect(result.rare).toHaveLength(1);
    });
    it('should use "common" for missing tier', () => {
      const result = groupBadgesByTier([{ name: 'A' }]);
      expect(result.common).toHaveLength(1);
    });
  });

  // ==================== calculateRarityScore ====================
  describe('calculateRarityScore', () => {
    it('should return 100 when totalUsers is 0', () => {
      expect(calculateRarityScore({}, 0, 0)).toBe(100);
    });
    it('should return high score when few users have badge', () => {
      const score = calculateRarityScore({}, 1000, 10);
      expect(score).toBeGreaterThan(90);
    });
    it('should return low score when most users have badge', () => {
      const score = calculateRarityScore({}, 100, 90);
      expect(score).toBeLessThan(20);
    });
    it('should never go below 0', () => {
      const score = calculateRarityScore({}, 100, 200);
      expect(score).toBeGreaterThanOrEqual(0);
    });
  });

  // ==================== getBadgeAchievementMessage ====================
  describe('getBadgeAchievementMessage', () => {
    it('should return milestone message', () => {
      const result = getBadgeAchievementMessage({ name: 'Test', category: 'milestone' });
      expect(result).toContain('Milestone');
      expect(result).toContain('Test');
    });
    it('should return streak message', () => {
      const result = getBadgeAchievementMessage({ name: 'Streak', category: 'streak' });
      expect(result).toContain('Streak');
    });
    it('should return default message for unknown category', () => {
      const result = getBadgeAchievementMessage({ name: 'Badge', category: 'unknown' });
      expect(result).toContain('Congratulations');
      expect(result).toContain('Badge');
    });
  });

  // ==================== formatBadgeStats ====================
  describe('formatBadgeStats', () => {
    it('should count badges by tier and category', () => {
      const badges = [
        { tier: 'common', category: 'milestone', points: 50 },
        { tier: 'rare', category: 'streak', points: 200 },
        { tier: 'common', category: 'milestone', points: 50 }
      ];
      const result = formatBadgeStats(badges);
      expect(result.total).toBe(3);
      expect(result.byTier.common).toBe(2);
      expect(result.byTier.rare).toBe(1);
      expect(result.byCategory.milestone).toBe(2);
      expect(result.totalPoints).toBe(300);
    });
    it('should handle empty array', () => {
      const result = formatBadgeStats([]);
      expect(result.total).toBe(0);
      expect(result.totalPoints).toBe(0);
    });
    it('should use "common" as default tier when missing', () => {
      const result = formatBadgeStats([{ category: 'milestone', points: 50 }]);
      expect(result.byTier.common).toBe(1);
    });
  });

  // ==================== getNextMilestoneBadges ====================
  describe('getNextMilestoneBadges', () => {
    const badges = [
      { name: 'A', isEarned: false, progressPercentage: 80 },
      { name: 'B', isEarned: false, progressPercentage: 60 },
      { name: 'C', isEarned: false, progressPercentage: 40 },
      { name: 'D', isEarned: true, progressPercentage: 100 },
      { name: 'E', isEarned: false, progressPercentage: 0 }
    ];
    it('should return top 3 unearned badges sorted by progress', () => {
      const result = getNextMilestoneBadges(badges);
      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('A');
    });
    it('should exclude earned badges', () => {
      expect(getNextMilestoneBadges(badges).every(b => !b.isEarned)).toBe(true);
    });
    it('should exclude 0 progress badges', () => {
      expect(getNextMilestoneBadges(badges).every(b => b.progressPercentage > 0)).toBe(true);
    });
    it('should respect custom limit', () => {
      expect(getNextMilestoneBadges(badges, 1)).toHaveLength(1);
    });
    it('should return empty array when all earned', () => {
      expect(getNextMilestoneBadges(badges.map(b => ({ ...b, isEarned: true })))).toEqual([]);
    });
  });

  // ==================== validateBadgeData ====================
  describe('validateBadgeData', () => {
    const validBadge = {
      name: 'Week Warrior',
      description: 'Complete 7 days in a row',
      category: 'streak',
      tier: 'common',
      condition: { type: 'streak_days', value: 7 },
      points: 100
    };
    it('should return isValid=true for valid data', () => {
      expect(validateBadgeData(validBadge).isValid).toBe(true);
    });
    it('should fail when name is empty', () => {
      expect(validateBadgeData({ ...validBadge, name: '' }).isValid).toBe(false);
    });
    it('should fail when description is empty', () => {
      expect(validateBadgeData({ ...validBadge, description: '' }).isValid).toBe(false);
    });
    it('should fail when category is missing', () => {
      expect(validateBadgeData({ ...validBadge, category: undefined }).isValid).toBe(false);
    });
    it('should fail when tier is missing', () => {
      expect(validateBadgeData({ ...validBadge, tier: undefined }).isValid).toBe(false);
    });
    it('should fail when condition has no type', () => {
      expect(validateBadgeData({ ...validBadge, condition: { value: 7 } }).isValid).toBe(false);
    });
    it('should fail when points is negative', () => {
      expect(validateBadgeData({ ...validBadge, points: -1 }).isValid).toBe(false);
    });
    it('should pass when points is 0', () => {
      expect(validateBadgeData({ ...validBadge, points: 0 }).isValid).toBe(true);
    });
  });

  // ==================== calculateCollectionCompletion ====================
  describe('calculateCollectionCompletion', () => {
    it('should return correct percentage', () => {
      expect(calculateCollectionCompletion(3, 10)).toBe(30);
    });
    it('should return 100 when all earned', () => {
      expect(calculateCollectionCompletion(10, 10)).toBe(100);
    });
    it('should return 0 when none earned', () => {
      expect(calculateCollectionCompletion(0, 10)).toBe(0);
    });
    it('should return 0 when total is 0', () => {
      expect(calculateCollectionCompletion(0, 0)).toBe(0);
    });
  });

  // ==================== getRecommendedNextBadge ====================
  describe('getRecommendedNextBadge', () => {
    const badges = [
      { name: 'A', isEarned: false, progressPercentage: 40, points: 100, condition: { type: 'workout_count' } },
      { name: 'B', isEarned: false, progressPercentage: 80, points: 50, condition: { type: 'streak_days' } },
      { name: 'C', isEarned: true, progressPercentage: 100, points: 200, condition: { type: 'workout_count' } }
    ];
    it('should return the highest scoring unearned badge', () => {
      const result = getRecommendedNextBadge(badges, null);
      expect(result).toBeDefined();
      expect(result.isEarned).toBe(false);
    });
    it('should return null when all badges are earned', () => {
      const allEarned = badges.map(b => ({ ...b, isEarned: true }));
      expect(getRecommendedNextBadge(allEarned, null)).toBeNull();
    });
    it('should return null when no badges have progress', () => {
      const noProgress = badges.map(b => ({ ...b, isEarned: false, progressPercentage: 0 }));
      expect(getRecommendedNextBadge(noProgress, null)).toBeNull();
    });
    it('should give bonus score for matching user activity', () => {
      const result = getRecommendedNextBadge(badges, 'workout_count');
      expect(result).toBeDefined();
    });
  });

});