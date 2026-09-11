import { query } from '../config/database.js';
import { AchievementsRepository } from '../repositories/achievements.repository.js';
import { UsersRepository } from '../repositories/users.repository.js';
import { StatisticsAggregationService } from './statistics-aggregation.service.js';

export const ACHIEVEMENT_DEFINITIONS = [
  {
    type: 'FIRST_RUN',
    title: 'First Run',
    description: 'Complete your first live outdoor run or walk.',
    icon: '⚡',
    xpReward: 100,
  },
  {
    type: 'FIRST_TERRITORY',
    title: 'First Territory',
    description: 'Capture your very first H3 geographical sector.',
    icon: '🗺️',
    xpReward: 150,
  },
  {
    type: 'EXPLORER',
    title: 'Explorer',
    description: 'Traverse and encounter 25+ unique geographical cells.',
    icon: '🧭',
    xpReward: 250,
  },
  {
    type: 'RUNNER_5K',
    title: '5 km Runner',
    description: 'Complete a single continuous workout of at least 5 km.',
    icon: '🏃',
    xpReward: 300,
  },
  {
    type: 'RUNNER_10K',
    title: '10 km Runner',
    description: 'Complete a single continuous workout of at least 10 km.',
    icon: '🔥',
    xpReward: 500,
  },
  {
    type: 'STREAK_7_DAY',
    title: '7 Day Streak',
    description: 'Maintain active workout consistency for 7 consecutive days.',
    icon: '🔥',
    xpReward: 700,
  },
  {
    type: 'TERRITORY_MASTER',
    title: 'Territory Master',
    description: 'Achieve concurrent dominion over 15+ territory hexes.',
    icon: '👑',
    xpReward: 800,
  },
  {
    type: 'WEEKLY_CHAMPION',
    title: 'Weekly Champion',
    description: 'Ascend to Rank #1 on the weekly competition leaderboard.',
    icon: '🏆',
    xpReward: 1000,
  },
  {
    type: 'MONTHLY_CHAMPION',
    title: 'Monthly Champion',
    description: 'Ascend to Rank #1 on the monthly competition leaderboard.',
    icon: '🌟',
    xpReward: 2000,
  },
];

export class GamificationService {
  /**
   * Calculates athlete's current and longest consecutive daily workout streak.
   */
  static async calculateStreak(userId) {
    const rows = await query(
      `SELECT DISTINCT substr(started_at, 1, 10) as "actDate"
       FROM activities
       WHERE user_id = $1 AND validation_status = 'VALID'
       ORDER BY "actDate" DESC`,
      [userId]
    );

    if (!rows || rows.length === 0) {
      return { currentStreak: 0, longestStreak: 0, activeDaysThisWeek: 0, dates: [] };
    }

    const uniqueDates = rows.map((r) => r.actDate);
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    // Check if current streak is active (ran today or yesterday)
    const hasToday = uniqueDates.includes(today);
    const hasYesterday = uniqueDates.includes(yesterday);

    if (hasToday || hasYesterday) {
      let checkDate = new Date(hasToday ? today : yesterday);
      while (true) {
        const dateStr = checkDate.toISOString().slice(0, 10);
        if (uniqueDates.includes(dateStr)) {
          currentStreak++;
          checkDate = new Date(checkDate.getTime() - 86400000);
        } else {
          break;
        }
      }
    }

    // Calculate longest lifetime streak
    if (uniqueDates.length > 0) {
      const sortedAsc = [...uniqueDates].sort();
      tempStreak = 1;
      longestStreak = 1;

      for (let i = 1; i < sortedAsc.length; i++) {
        const prev = new Date(sortedAsc[i - 1]);
        const curr = new Date(sortedAsc[i]);
        const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          tempStreak++;
          if (tempStreak > longestStreak) longestStreak = tempStreak;
        } else if (diffDays > 1) {
          tempStreak = 1;
        }
      }
    }

    // Active days in current calendar week
    const now = new Date();
    const dayOfWeek = now.getUTCDay();
    const mondayOffset = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
    const monday = new Date(now.getTime() + mondayOffset * 86400000);
    const mondayStr = monday.toISOString().slice(0, 10);

    const activeDaysThisWeek = uniqueDates.filter((d) => d >= mondayStr && d <= today).length;

    return {
      currentStreak,
      longestStreak: Math.max(longestStreak, currentStreak),
      activeDaysThisWeek,
      dates: uniqueDates.slice(0, 30),
    };
  }

  /**
   * Evaluates all achievements and unlocks any eligible ones.
   */
  static async evaluateAchievements(userId) {
    const existing = await AchievementsRepository.findByByUser ? await AchievementsRepository.findByUser(userId) : await AchievementsRepository.findByUser(userId);
    const unlockedTypes = new Set(existing.map((a) => a.type));
    const newlyUnlocked = [];

    // Query user stats
    const actRows = await query(
      `SELECT 
        COUNT(*) as "count",
        MAX(distance) as "maxDistance",
        COALESCE(SUM(distance), 0) as "totalDistance",
        COALESCE(SUM(area_covered), 0) as "totalArea"
       FROM activities 
       WHERE user_id = $1 AND validation_status = 'VALID'`,
      [userId]
    );

    const activityCount = Number(actRows[0]?.count || 0);
    const maxDistanceMeters = Number(actRows[0]?.maxDistance || 0);

    const hexRows = await query(
      `SELECT COUNT(*) as "currentHexCount" FROM territory_cells WHERE current_owner_id = $1`,
      [userId]
    );
    const currentHexCount = Number(hexRows[0]?.currentHexCount || 0);

    const historyRows = await query(
      `SELECT COUNT(DISTINCT h3_cell_id) as "uniqueHexCount" FROM territory_history WHERE user_id = $1`,
      [userId]
    );
    const uniqueHexCount = Number(historyRows[0]?.uniqueHexCount || 0);

    const streakData = await this.calculateStreak(userId);

    const weeklyStats = await query(
      `SELECT MIN(rank) as "bestWeeklyRank" FROM weekly_statistics WHERE user_id = $1`,
      [userId]
    );
    const bestWeeklyRank = weeklyStats[0]?.bestWeeklyRank !== null ? Number(weeklyStats[0]?.bestWeeklyRank) : null;

    const monthlyStats = await query(
      `SELECT MIN(rank) as "bestMonthlyRank" FROM monthly_statistics WHERE user_id = $1`,
      [userId]
    );
    const bestMonthlyRank = monthlyStats[0]?.bestMonthlyRank !== null ? Number(monthlyStats[0]?.bestMonthlyRank) : null;

    // Evaluate each definition
    for (const def of ACHIEVEMENT_DEFINITIONS) {
      if (unlockedTypes.has(def.type)) continue;

      let eligible = false;
      switch (def.type) {
        case 'FIRST_RUN':
          eligible = activityCount >= 1;
          break;
        case 'FIRST_TERRITORY':
          eligible = uniqueHexCount >= 1 || currentHexCount >= 1;
          break;
        case 'EXPLORER':
          eligible = uniqueHexCount >= 25;
          break;
        case 'RUNNER_5K':
          eligible = maxDistanceMeters >= 5000;
          break;
        case 'RUNNER_10K':
          eligible = maxDistanceMeters >= 10000;
          break;
        case 'STREAK_7_DAY':
          eligible = streakData.currentStreak >= 7 || streakData.longestStreak >= 7;
          break;
        case 'TERRITORY_MASTER':
          eligible = currentHexCount >= 15;
          break;
        case 'WEEKLY_CHAMPION':
          eligible = bestWeeklyRank === 1;
          break;
        case 'MONTHLY_CHAMPION':
          eligible = bestMonthlyRank === 1;
          break;
      }

      if (eligible) {
        const achId = `ach-${userId}-${def.type.toLowerCase()}`;
        await AchievementsRepository.create({
          id: achId,
          userId,
          type: def.type,
          title: def.title,
          description: def.description,
          icon: def.icon,
        });

        newlyUnlocked.push({
          ...def,
          id: achId,
          unlockedAt: new Date().toISOString(),
        });
      }
    }

    const allAchievements = await AchievementsRepository.findByUser(userId);

    return {
      allAchievements,
      newlyUnlocked,
    };
  }

  /**
   * Retrieves complete personal statistics for the athlete.
   */
  static async getPersonalStatistics(userId) {
    const user = await UsersRepository.findById(userId);
    if (!user) return null;

    const actRows = await query(
      `SELECT 
        COUNT(*) as "activityCount",
        COALESCE(SUM(distance), 0) as "totalDistanceMeters",
        COALESCE(SUM(duration), 0) as "totalDurationSeconds",
        COALESCE(SUM(area_covered), 0) as "historicalAreaKm2"
       FROM activities 
       WHERE user_id = $1 AND validation_status = 'VALID'`,
      [userId]
    );

    const actStats = actRows[0] || {};
    const totalDistanceMeters = Number(actStats.totalDistanceMeters || 0);
    const totalDistanceKm = parseFloat((totalDistanceMeters / 1000).toFixed(2));
    const totalDurationMinutes = Math.round(Number(actStats.totalDurationSeconds || 0) / 60);
    const historicalAreaKm2 = parseFloat(Number(actStats.historicalAreaKm2 || 0).toFixed(2));

    const currentCellsRows = await query(
      `SELECT COUNT(*) as "currentTerritory" FROM territory_cells WHERE current_owner_id = $1`,
      [userId]
    );
    const currentTerritory = Number(currentCellsRows[0]?.currentTerritory || 0);

    const uniqueCellsRows = await query(
      `SELECT COUNT(DISTINCT h3_cell_id) as "uniqueCells" FROM territory_history WHERE user_id = $1`,
      [userId]
    );
    const uniqueCells = Number(uniqueCellsRows[0]?.uniqueCells || 0);

    const streakData = await this.calculateStreak(userId);
    const achievementData = await this.evaluateAchievements(userId);

    // Milestones check
    const milestones = [
      { name: '50 km Total Distance', target: 50, current: totalDistanceKm, unit: 'km', reached: totalDistanceKm >= 50 },
      { name: '100 km Total Distance', target: 100, current: totalDistanceKm, unit: 'km', reached: totalDistanceKm >= 100 },
      { name: '10 Territory Hexes', target: 10, current: currentTerritory, unit: 'hexes', reached: currentTerritory >= 10 },
      { name: '7-Day Streak', target: 7, current: streakData.currentStreak, unit: 'days', reached: streakData.currentStreak >= 7 },
    ];

    return {
      userId,
      displayName: user.displayName || user.username,
      avatar: user.avatar || '⚡',
      totalDistanceKm,
      totalDistanceMeters,
      totalDurationMinutes,
      historicalAreaKm2,
      totalAreaCovered: historicalAreaKm2,
      currentTerritory,
      uniqueCells,
      activities: Number(actStats.activityCount || 0),
      activityCount: Number(actStats.activityCount || 0),
      streak: streakData.currentStreak,
      longestStreak: streakData.longestStreak,
      activeDaysThisWeek: streakData.activeDaysThisWeek,
      achievements: achievementData.allAchievements,
      totalAchievementsCount: ACHIEVEMENT_DEFINITIONS.length,
      unlockedAchievementsCount: achievementData.allAchievements.length,
      milestones,
    };
  }

  /**
   * Generates comprehensive weekly summary for an athlete.
   */
  static async getWeeklySummary(userId, date = new Date()) {
    const { yearNumber, weekNumber, weekStart, weekEnd } = StatisticsAggregationService.getWeekBounds(date);

    const rows = await query(
      `SELECT 
        total_distance as "totalDistanceMeters",
        total_duration as "totalDurationSeconds",
        total_area as "totalAreaKm2",
        activity_count as "activityCount",
        unique_cells_count as "uniqueCellsCount",
        challenge_score as "challengeScore",
        competition_score as "competitionScore",
        territory_count as "territoryCount",
        rank,
        previous_rank as "previousRank",
        rank_change as "rankChange"
       FROM weekly_statistics
       WHERE user_id = $1 AND year_number = $2 AND week_number = $3`,
      [userId, yearNumber, weekNumber]
    );

    const stats = rows[0] || {
      totalDistanceMeters: 0,
      totalDurationSeconds: 0,
      totalAreaKm2: 0,
      activityCount: 0,
      uniqueCellsCount: 0,
      challengeScore: 0,
      competitionScore: 0,
      territoryCount: 0,
      rank: null,
      previousRank: null,
      rankChange: 0,
    };

    const streakData = await this.calculateStreak(userId);

    return {
      period: `Week ${weekNumber}, ${yearNumber}`,
      startDate: weekStart.slice(0, 10),
      endDate: weekEnd.slice(0, 10),
      totalDistanceKm: parseFloat(((stats.totalDistanceMeters || 0) / 1000).toFixed(2)),
      totalDurationMinutes: Math.round((stats.totalDurationSeconds || 0) / 60),
      totalAreaCoveredKm2: parseFloat(Number(stats.totalAreaKm2 || 0).toFixed(2)),
      activityCount: stats.activityCount || 0,
      uniqueCellsCount: stats.uniqueCellsCount || 0,
      challengeScore: stats.challengeScore || 0,
      competitionScore: stats.competitionScore || 0,
      territoryCount: stats.territoryCount || 0,
      rank: stats.rank || '-',
      rankChange: stats.rankChange || 0,
      activeDaysCount: streakData.activeDaysThisWeek,
    };
  }

  /**
   * Generates comprehensive monthly summary for an athlete.
   */
  static async getMonthlySummary(userId, date = new Date()) {
    const d = new Date(date);
    const yearNumber = d.getUTCFullYear();
    const monthNumber = d.getUTCMonth() + 1;
    const monthName = d.toLocaleString('default', { month: 'long' });

    const rows = await query(
      `SELECT 
        total_distance as "totalDistanceMeters",
        total_duration as "totalDurationSeconds",
        total_area as "totalAreaKm2",
        activity_count as "activityCount",
        unique_cells_count as "uniqueCellsCount",
        challenge_score as "challengeScore",
        competition_score as "competitionScore",
        territory_count as "territoryCount",
        rank,
        previous_rank as "previousRank",
        rank_change as "rankChange"
       FROM monthly_statistics
       WHERE user_id = $1 AND year_number = $2 AND month_number = $3`,
      [userId, yearNumber, monthNumber]
    );

    const stats = rows[0] || {
      totalDistanceMeters: 0,
      totalDurationSeconds: 0,
      totalAreaKm2: 0,
      activityCount: 0,
      uniqueCellsCount: 0,
      challengeScore: 0,
      competitionScore: 0,
      territoryCount: 0,
      rank: null,
      previousRank: null,
      rankChange: 0,
    };

    return {
      period: `${monthName} ${yearNumber}`,
      yearNumber,
      monthNumber,
      totalDistanceKm: parseFloat(((stats.totalDistanceMeters || 0) / 1000).toFixed(2)),
      totalDurationMinutes: Math.round((stats.totalDurationSeconds || 0) / 60),
      totalAreaCoveredKm2: parseFloat(Number(stats.totalAreaKm2 || 0).toFixed(2)),
      activityCount: stats.activityCount || 0,
      uniqueCellsCount: stats.uniqueCellsCount || 0,
      challengeScore: stats.challengeScore || 0,
      competitionScore: stats.competitionScore || 0,
      territoryCount: stats.territoryCount || 0,
      rank: stats.rank || '-',
      rankChange: stats.rankChange || 0,
    };
  }
}
