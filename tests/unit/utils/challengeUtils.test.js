const {
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
} = require('../../../utils/challengeUtils');

describe('challengeUtils', () => {

  // ==================== calculateCompletionPercentage ====================
  describe('calculateCompletionPercentage', () => {
    it('should return 50 when halfway done', () => {
      expect(calculateCompletionPercentage(50, 100)).toBe(50);
    });
    it('should return 100 when complete', () => {
      expect(calculateCompletionPercentage(100, 100)).toBe(100);
    });
    it('should cap at 100 when over target', () => {
      expect(calculateCompletionPercentage(150, 100)).toBe(100);
    });
    it('should return 0 when no progress', () => {
      expect(calculateCompletionPercentage(0, 100)).toBe(0);
    });
    it('should return 0 when target is 0', () => {
      expect(calculateCompletionPercentage(50, 0)).toBe(0);
    });
  });

  // ==================== isChallengeActive ====================
  describe('isChallengeActive', () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString();

    it('should return true for active challenge within dates', () => {
      expect(isChallengeActive({ status: 'active', startDate: yesterday, endDate: nextWeek })).toBe(true);
    });
    it('should return false when status is not active', () => {
      expect(isChallengeActive({ status: 'cancelled', startDate: yesterday, endDate: nextWeek })).toBe(false);
    });
    it('should return false when challenge has not started', () => {
      const tomorrow = new Date(Date.now() + 86400000).toISOString();
      expect(isChallengeActive({ status: 'active', startDate: tomorrow, endDate: nextWeek })).toBe(false);
    });
    it('should return false when challenge has ended', () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString();
      expect(isChallengeActive({ status: 'active', startDate: yesterday, endDate: twoDaysAgo })).toBe(false);
    });
  });

  // ==================== isChallengeExpired ====================
  describe('isChallengeExpired', () => {
    it('should return true when end date is in the past', () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString();
      expect(isChallengeExpired({ endDate: twoDaysAgo })).toBe(true);
    });
    it('should return false when end date is in the future', () => {
      const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString();
      expect(isChallengeExpired({ endDate: nextWeek })).toBe(false);
    });
  });

  // ==================== calculateTimeRemaining ====================
  describe('calculateTimeRemaining', () => {
    it('should return expired=true for past date', () => {
      const pastDate = new Date(Date.now() - 86400000);
      const result = calculateTimeRemaining(pastDate);
      expect(result.expired).toBe(true);
      expect(result.days).toBe(0);
    });
    it('should return correct days for future date', () => {
      const futureDate = new Date(Date.now() + 3 * 86400000);
      const result = calculateTimeRemaining(futureDate);
      expect(result.expired).toBe(false);
      expect(result.days).toBeGreaterThanOrEqual(2);
    });
    it('should include formatted string', () => {
      const futureDate = new Date(Date.now() + 3 * 86400000);
      const result = calculateTimeRemaining(futureDate);
      expect(result.formatted).toBeDefined();
    });
    it('should accept Date object directly', () => {
      const result = calculateTimeRemaining(new Date(Date.now() - 1000));
      expect(result.expired).toBe(true);
    });
  });

  // ==================== formatTimeRemaining ====================
  describe('formatTimeRemaining', () => {
    it('should show days and hours when days > 0', () => {
      expect(formatTimeRemaining(3, 5, 30)).toBe('3d 5h');
    });
    it('should show hours and minutes when no days', () => {
      expect(formatTimeRemaining(0, 2, 30)).toBe('2h 30m');
    });
    it('should show only minutes when no days or hours', () => {
      expect(formatTimeRemaining(0, 0, 45)).toBe('45m');
    });
  });

  // ==================== calculateChallengeDifficulty ====================
  describe('calculateChallengeDifficulty', () => {
    const makeChallenge = (type, targetValue, durationDays) => {
      const start = new Date();
      const end = new Date(Date.now() + durationDays * 86400000);
      return { type, goal: { targetValue }, startDate: start.toISOString(), endDate: end.toISOString() };
    };

    it('should return hard for workout_count with 2+ per day', () => {
      expect(calculateChallengeDifficulty(makeChallenge('workout_count', 20, 7))).toBe('hard');
    });
    it('should return medium for workout_count with 1 per day', () => {
      expect(calculateChallengeDifficulty(makeChallenge('workout_count', 7, 7))).toBe('medium');
    });
    it('should return easy for workout_count below 1 per day', () => {
      expect(calculateChallengeDifficulty(makeChallenge('workout_count', 3, 7))).toBe('easy');
    });
    it('should return hard for calories with 500+ per day', () => {
      expect(calculateChallengeDifficulty(makeChallenge('calories', 3500, 7))).toBe('hard');
    });
    it('should return medium for exercise_count with 30-49 per day', () => {
      expect(calculateChallengeDifficulty(makeChallenge('exercise_count', 210, 7))).toBe('medium');
    });
    it('should return medium for unknown type', () => {
      expect(calculateChallengeDifficulty(makeChallenge('unknown_type', 100, 7))).toBe('medium');
    });
  });

  // ==================== sortChallenges ====================
  describe('sortChallenges', () => {
    const challenges = [
      { name: 'A', startDate: '2026-01-01', endDate: '2026-01-31', participantCount: 10, goal: { targetValue: 100 }, type: 'workout_count' },
      { name: 'B', startDate: '2026-03-01', endDate: '2026-03-31', participantCount: 50, goal: { targetValue: 100 }, type: 'workout_count' },
      { name: 'C', startDate: '2026-02-01', endDate: '2026-02-28', participantCount: 25, goal: { targetValue: 100 }, type: 'workout_count' }
    ];

    it('should sort by startDate descending by default', () => {
      const result = sortChallenges(challenges);
      expect(result[0].name).toBe('B');
    });
    it('should sort by startDate ascending', () => {
      const result = sortChallenges(challenges, 'startDate', 'asc');
      expect(result[0].name).toBe('A');
    });
    it('should sort by participants descending', () => {
      const result = sortChallenges(challenges, 'participants', 'desc');
      expect(result[0].participantCount).toBe(50);
    });
    it('should not mutate original array', () => {
      const original = challenges[0].name;
      sortChallenges(challenges, 'participants', 'asc');
      expect(challenges[0].name).toBe(original);
    });
  });

  // ==================== filterChallengesByType ====================
  describe('filterChallengesByType', () => {
    const challenges = [
      { type: 'workout_count' },
      { type: 'calories' },
      { type: 'workout_count' }
    ];
    it('should filter by type', () => {
      expect(filterChallengesByType(challenges, 'workout_count')).toHaveLength(2);
    });
    it('should return all when type is "all"', () => {
      expect(filterChallengesByType(challenges, 'all')).toHaveLength(3);
    });
    it('should return all when type is null', () => {
      expect(filterChallengesByType(challenges, null)).toHaveLength(3);
    });
  });

  // ==================== filterChallengesByDifficulty ====================
  describe('filterChallengesByDifficulty', () => {
    const start = new Date().toISOString();
    const end = new Date(Date.now() + 7 * 86400000).toISOString();
    const challenges = [
      { type: 'workout_count', goal: { targetValue: 20 }, startDate: start, endDate: end }, // hard
      { type: 'workout_count', goal: { targetValue: 3 }, startDate: start, endDate: end }   // easy
    ];
    it('should filter by difficulty', () => {
      const result = filterChallengesByDifficulty(challenges, 'hard');
      expect(result).toHaveLength(1);
    });
    it('should return all when difficulty is "all"', () => {
      expect(filterChallengesByDifficulty(challenges, 'all')).toHaveLength(2);
    });
  });

  // ==================== calculateRankChange ====================
  describe('calculateRankChange', () => {
    it('should return positive when rank improved', () => {
      expect(calculateRankChange(5, 3)).toBe(2);
    });
    it('should return negative when rank dropped', () => {
      expect(calculateRankChange(3, 5)).toBe(-2);
    });
    it('should return 0 when unchanged', () => {
      expect(calculateRankChange(3, 3)).toBe(0);
    });
    it('should return 0 when either rank is null', () => {
      expect(calculateRankChange(null, 3)).toBe(0);
      expect(calculateRankChange(3, null)).toBe(0);
    });
  });

  // ==================== formatChallengeProgress ====================
  describe('formatChallengeProgress', () => {
    it('should format progress correctly', () => {
      const result = formatChallengeProgress(75, { targetValue: 100 });
      expect(result).toMatchObject({ current: 75, target: 100, percentage: 75, remaining: 25, isComplete: false });
    });
    it('should mark complete when progress meets target', () => {
      const result = formatChallengeProgress(100, { targetValue: 100 });
      expect(result.isComplete).toBe(true);
      expect(result.remaining).toBe(0);
    });
    it('should not have negative remaining', () => {
      const result = formatChallengeProgress(150, { targetValue: 100 });
      expect(result.remaining).toBe(0);
    });
  });

  // ==================== validateChallengeData ====================
  describe('validateChallengeData', () => {
    const validData = {
      name: 'Push Up Challenge',
      type: 'workout_count',
      goal: { targetValue: 100 },
      startDate: '2026-03-01',
      endDate: '2026-03-31'
    };
    it('should return isValid=true for valid data', () => {
      expect(validateChallengeData(validData).isValid).toBe(true);
    });
    it('should fail when name is missing', () => {
      expect(validateChallengeData({ ...validData, name: '' }).isValid).toBe(false);
    });
    it('should fail when type is missing', () => {
      expect(validateChallengeData({ ...validData, type: undefined }).isValid).toBe(false);
    });
    it('should fail when goal targetValue is missing', () => {
      expect(validateChallengeData({ ...validData, goal: {} }).isValid).toBe(false);
    });
    it('should fail when endDate is before startDate', () => {
      const result = validateChallengeData({ ...validData, startDate: '2026-03-31', endDate: '2026-03-01' });
      expect(result.isValid).toBe(false);
    });
    it('should fail when startDate is missing', () => {
      expect(validateChallengeData({ ...validData, startDate: undefined }).isValid).toBe(false);
    });
    it('should fail when endDate is missing', () => {
      expect(validateChallengeData({ ...validData, endDate: undefined }).isValid).toBe(false);
    });
    it('should return multiple errors for multiple invalid fields', () => {
      expect(validateChallengeData({ goal: { targetValue: 100 } }).errors.length).toBeGreaterThan(1);
    });
  });

  // ==================== getChallengeStatusLabel ====================
  describe('getChallengeStatusLabel', () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString();
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString();

    it('should return "Completed" for completed status', () => {
      expect(getChallengeStatusLabel({ status: 'completed' })).toBe('Completed');
    });
    it('should return "Cancelled" for cancelled status', () => {
      expect(getChallengeStatusLabel({ status: 'cancelled' })).toBe('Cancelled');
    });
    it('should return "Expired" for expired challenge', () => {
      expect(getChallengeStatusLabel({ status: 'active', startDate: yesterday, endDate: twoDaysAgo })).toBe('Expired');
    });
    it('should return "Active" for currently active challenge', () => {
      expect(getChallengeStatusLabel({ status: 'active', startDate: yesterday, endDate: nextWeek })).toBe('Active');
    });
    it('should return "Upcoming" for future challenge', () => {
      const tomorrow = new Date(Date.now() + 86400000).toISOString();
      expect(getChallengeStatusLabel({ status: 'active', startDate: tomorrow, endDate: nextWeek })).toBe('Upcoming');
    });
  });

  // ==================== calculateEstimatedCompletionDate ====================
  describe('calculateEstimatedCompletionDate', () => {
    it('should return a future date', () => {
      const result = calculateEstimatedCompletionDate(0, 100, 10);
      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBeGreaterThan(Date.now());
    });
    it('should return null when dailyAverage is 0', () => {
      expect(calculateEstimatedCompletionDate(0, 100, 0)).toBeNull();
    });
    it('should return today or past when already complete', () => {
      const result = calculateEstimatedCompletionDate(100, 100, 10);
      expect(result).toBeInstanceOf(Date);
    });
  });

  // ==================== groupChallengesByStatus ====================
  describe('groupChallengesByStatus', () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString();

    it('should group challenges by status label', () => {
      const challenges = [
        { status: 'active', startDate: yesterday, endDate: nextWeek },
        { status: 'completed' },
        { status: 'cancelled' }
      ];
      const result = groupChallengesByStatus(challenges);
      expect(result.active).toHaveLength(1);
      expect(result.completed).toHaveLength(1);
      expect(result.cancelled).toHaveLength(1);
    });
  });

});