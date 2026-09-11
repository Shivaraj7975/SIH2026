import { query } from '../config/database.js';
import { StatisticsRepository } from '../repositories/statistics.repository.js';
import { UsersRepository } from '../repositories/users.repository.js';

export class StatisticsAggregationService {
  /**
   * Transparent Scoring Formula (100% Explainable & Documented):
   * competitionScore = 
   *     distanceScore (1 pt per 10m / 100 pts per km)
   *   + areaScore (50 pts per km²)
   *   + challengeScore (Points from daily challenges)
   *   + consistencyScore (25 pts per valid session)
   *   + uniqueCellsScore (10 pts per distinct H3 cell)
   */
  static computeCompetitionScore({
    totalDistanceMeters = 0,
    totalAreaCoveredKm2 = 0,
    challengeScore = 0,
    activityCount = 0,
    uniqueCellsCount = 0,
  }) {
    const distScore = Math.floor(Number(totalDistanceMeters) / 10);
    const areaScore = Math.floor(Number(totalAreaCoveredKm2) * 50);
    const chScore = Math.floor(Number(challengeScore));
    const consistencyScore = Math.floor(Number(activityCount) * 25);
    const cellsScore = Math.floor(Number(uniqueCellsCount) * 10);

    return distScore + areaScore + chScore + consistencyScore + cellsScore;
  }

  static getWeekBounds(dateObj = new Date()) {
    const d = new Date(dateObj);
    const day = d.getUTCDay();
    // Monday as start of ISO week
    const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff, 0, 0, 0, 0));
    const sunday = new Date(Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate() + 6, 23, 59, 59, 999));

    const yearNumber = monday.getUTCFullYear();
    // ISO week number calculation
    const startOfYear = new Date(Date.UTC(yearNumber, 0, 1));
    const weekNumber = Math.ceil((((monday - startOfYear) / 86400000) + 1) / 7);

    return {
      weekStart: monday.toISOString(),
      weekEnd: sunday.toISOString(),
      yearNumber,
      weekNumber,
    };
  }

  static getMonthBounds(dateObj = new Date()) {
    const d = new Date(dateObj);
    const yearNumber = d.getUTCFullYear();
    const monthNumber = d.getUTCMonth() + 1;

    const monthStart = new Date(Date.UTC(yearNumber, monthNumber - 1, 1, 0, 0, 0, 0)).toISOString();
    const lastDay = new Date(Date.UTC(yearNumber, monthNumber, 0, 23, 59, 59, 999)).toISOString();

    return {
      monthStart,
      monthEnd: lastDay,
      yearNumber,
      monthNumber,
    };
  }

  /**
   * Aggregate single user's weekly fitness performance using database aggregation
   */
  static async aggregateUserWeekly(userId, dateObj = new Date()) {
    const { weekStart, weekEnd, yearNumber, weekNumber } = this.getWeekBounds(dateObj);

    // 1. Database Aggregation of Valid Activities in week window
    const actRows = await query(
      `SELECT 
        COALESCE(SUM(distance), 0) as "totalDistance",
        COALESCE(SUM(duration), 0) as "totalDuration",
        COALESCE(SUM(area_covered), 0) as "totalArea",
        COUNT(id) as "activityCount"
      FROM activities
      WHERE user_id = $1 
        AND validation_status = 'VALID'
        AND started_at >= $2
        AND started_at <= $3`,
      [userId, weekStart, weekEnd]
    );

    const totalDistance = Number(actRows[0]?.totalDistance || 0);
    const totalDuration = Number(actRows[0]?.totalDuration || 0);
    const totalArea = Number(actRows[0]?.totalArea || 0);
    const activityCount = Number(actRows[0]?.activityCount || 0);

    // 2. Count distinct unique cells visited in valid activities this week
    const actIds = await query(
      `SELECT id FROM activities 
       WHERE user_id = $1 AND validation_status = 'VALID' AND started_at >= $2 AND started_at <= $3`,
      [userId, weekStart, weekEnd]
    );

    let uniqueCellsCount = 0;
    if (actIds.length > 0) {
      const idList = actIds.map((a) => a.id);
      const placeholders = idList.map((_, i) => `$${i + 2}`).join(',');
      const cellRows = await query(
        `SELECT COUNT(DISTINCT h3_cell_id) as "cellCount"
         FROM territory_history
         WHERE user_id = $1 AND activity_id IN (${placeholders})`,
        [userId, ...idList]
      ).catch(() => [{ cellCount: 0 }]);
      uniqueCellsCount = Number(cellRows[0]?.cellCount || 0);
    }

    // 3. Aggregate daily challenge scores earned during this week
    const scoreRows = await query(
      `SELECT COALESCE(SUM(score), 0) as "challengeScore"
       FROM daily_scores
       WHERE user_id = $1 AND created_at >= $2 AND created_at <= $3`,
      [userId, weekStart, weekEnd]
    );
    const challengeScore = Number(scoreRows[0]?.challengeScore || 0);

    // 4. Count momentary current territory owned (Auxiliary display stat only!)
    const currentCellRows = await query(
      `SELECT COUNT(*) as "territoryCount"
       FROM territory_cells
       WHERE current_owner_id = $1`,
      [userId]
    );
    const territoryCount = Number(currentCellRows[0]?.territoryCount || 0);

    // 5. Compute transparent competition score
    const competitionScore = this.computeCompetitionScore({
      totalDistanceMeters: totalDistance,
      totalAreaCoveredKm2: totalArea,
      challengeScore,
      activityCount,
      uniqueCellsCount,
    });

    const recordId = `week-${userId}-${yearNumber}-${weekNumber}`;
    const previous = await StatisticsRepository.getWeeklyStatsByUserAndWeek(userId, yearNumber, weekNumber);
    const previousRank = previous ? previous.rank : null;

    return StatisticsRepository.upsertWeeklyStatistics({
      id: recordId,
      userId,
      yearNumber,
      weekNumber,
      totalDistance,
      totalDuration,
      totalArea,
      activityCount,
      uniqueCellsCount,
      challengeScore,
      competitionScore,
      territoryCount,
      rank: previous?.rank || null,
      previousRank,
      rankChange: 0,
    });
  }

  /**
   * Aggregate single user's monthly fitness performance using database aggregation
   */
  static async aggregateUserMonthly(userId, dateObj = new Date()) {
    const { monthStart, monthEnd, yearNumber, monthNumber } = this.getMonthBounds(dateObj);

    // 1. Database Aggregation of Valid Activities in month window
    const actRows = await query(
      `SELECT 
        COALESCE(SUM(distance), 0) as "totalDistance",
        COALESCE(SUM(duration), 0) as "totalDuration",
        COALESCE(SUM(area_covered), 0) as "totalArea",
        COUNT(id) as "activityCount"
      FROM activities
      WHERE user_id = $1 
        AND validation_status = 'VALID'
        AND started_at >= $2
        AND started_at <= $3`,
      [userId, monthStart, monthEnd]
    );

    const totalDistance = Number(actRows[0]?.totalDistance || 0);
    const totalDuration = Number(actRows[0]?.totalDuration || 0);
    const totalArea = Number(actRows[0]?.totalArea || 0);
    const activityCount = Number(actRows[0]?.activityCount || 0);

    // 2. Count distinct unique cells visited in valid activities this month
    const actIds = await query(
      `SELECT id FROM activities 
       WHERE user_id = $1 AND validation_status = 'VALID' AND started_at >= $2 AND started_at <= $3`,
      [userId, monthStart, monthEnd]
    );

    let uniqueCellsCount = 0;
    if (actIds.length > 0) {
      const idList = actIds.map((a) => a.id);
      const placeholders = idList.map((_, i) => `$${i + 2}`).join(',');
      const cellRows = await query(
        `SELECT COUNT(DISTINCT h3_cell_id) as "cellCount"
         FROM territory_history
         WHERE user_id = $1 AND activity_id IN (${placeholders})`,
        [userId, ...idList]
      ).catch(() => [{ cellCount: 0 }]);
      uniqueCellsCount = Number(cellRows[0]?.cellCount || 0);
    }

    // 3. Aggregate daily challenge scores earned during this month
    const scoreRows = await query(
      `SELECT COALESCE(SUM(score), 0) as "challengeScore"
       FROM daily_scores
       WHERE user_id = $1 AND created_at >= $2 AND created_at <= $3`,
      [userId, monthStart, monthEnd]
    );
    const challengeScore = Number(scoreRows[0]?.challengeScore || 0);

    // 4. Count momentary current territory owned (Auxiliary display stat only!)
    const currentCellRows = await query(
      `SELECT COUNT(*) as "territoryCount"
       FROM territory_cells
       WHERE current_owner_id = $1`,
      [userId]
    );
    const territoryCount = Number(currentCellRows[0]?.territoryCount || 0);

    // 5. Compute transparent competition score
    const competitionScore = this.computeCompetitionScore({
      totalDistanceMeters: totalDistance,
      totalAreaCoveredKm2: totalArea,
      challengeScore,
      activityCount,
      uniqueCellsCount,
    });

    const recordId = `month-${userId}-${yearNumber}-${monthNumber}`;
    const previous = await StatisticsRepository.getMonthlyStatsByUserAndMonth(userId, yearNumber, monthNumber);
    const previousRank = previous ? previous.rank : null;

    return StatisticsRepository.upsertMonthlyStatistics({
      id: recordId,
      userId,
      yearNumber,
      monthNumber,
      totalDistance,
      totalDuration,
      totalArea,
      activityCount,
      uniqueCellsCount,
      challengeScore,
      competitionScore,
      territoryCount,
      rank: previous?.rank || null,
      previousRank,
      rankChange: 0,
    });
  }

  /**
   * Recalculate and update ranks for all users in the weekly competition
   */
  static async recalculateAllWeeklyRanks(yearNumber = null, weekNumber = null) {
    const bounds = this.getWeekBounds();
    const y = yearNumber || bounds.yearNumber;
    const w = weekNumber || bounds.weekNumber;

    const users = await UsersRepository.findAll();
    for (const u of users) {
      await this.aggregateUserWeekly(u.id);
    }

    const leaderboard = await StatisticsRepository.getWeeklyLeaderboard(y, w);

    for (let i = 0; i < leaderboard.length; i++) {
      const item = leaderboard[i];
      const newRank = i + 1;
      const prevRank = item.previousRank || newRank;
      const rankChange = prevRank - newRank; // Positive means moved up

      await query(
        `UPDATE weekly_statistics 
         SET rank = $1, rank_change = $2 
         WHERE user_id = $3 AND year_number = $4 AND week_number = $5`,
        [newRank, rankChange, item.userId, y, w]
      );
    }

    return StatisticsRepository.getWeeklyLeaderboard(y, w);
  }

  /**
   * Recalculate and update ranks for all users in the monthly competition
   */
  static async recalculateAllMonthlyRanks(yearNumber = null, monthNumber = null) {
    const d = new Date();
    const y = yearNumber || d.getUTCFullYear();
    const m = monthNumber || (d.getUTCMonth() + 1);

    const users = await UsersRepository.findAll();
    for (const u of users) {
      await this.aggregateUserMonthly(u.id);
    }

    const leaderboard = await StatisticsRepository.getMonthlyLeaderboard(y, m);

    for (let i = 0; i < leaderboard.length; i++) {
      const item = leaderboard[i];
      const newRank = i + 1;
      const prevRank = item.previousRank || newRank;
      const rankChange = prevRank - newRank;

      await query(
        `UPDATE monthly_statistics 
         SET rank = $1, rank_change = $2 
         WHERE user_id = $3 AND year_number = $4 AND month_number = $5`,
        [newRank, rankChange, item.userId, y, m]
      );
    }

    return StatisticsRepository.getMonthlyLeaderboard(y, m);
  }

  /**
   * Universal Leaderboard with 3 Sectors: Distance Covered, Current Holding Area, and Total Area Captured
   * Strictly supports 'daily' and 'weekly' timeframes
   */
  static async getLeaderboardData({ timeframe = 'weekly', sector = 'distance' }) {
    const isDaily = timeframe === 'daily';
    let timeStart, timeEnd;

    if (isDaily) {
      const d = new Date();
      timeStart = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0)).toISOString();
      timeEnd = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999)).toISOString();
    } else {
      const bounds = this.getWeekBounds();
      timeStart = bounds.weekStart;
      timeEnd = bounds.weekEnd;
    }

    // 1. Fetch all athletes
    const allUsers = await UsersRepository.findAll();

    // 2. Fetch aggregated activities for this timeframe
    const actRows = await query(
      `SELECT 
        user_id,
        COALESCE(SUM(distance), 0) as "totalDistance",
        COALESCE(SUM(duration), 0) as "totalDuration",
        COALESCE(SUM(area_covered), 0) as "totalAreaCovered",
        COUNT(id) as "activityCount"
      FROM activities
      WHERE validation_status = 'VALID'
        AND started_at >= $1
        AND started_at <= $2
      GROUP BY user_id`,
      [timeStart, timeEnd]
    );

    const actMap = new Map((actRows || []).map((a) => [a.user_id, a]));

    // 3. Fetch live current territory ownership (from territory_cells)
    const territoryRows = await query(
      `SELECT current_owner_id as "user_id", COUNT(*) as "cellCount"
       FROM territory_cells
       GROUP BY current_owner_id`
    );
    const territoryMap = new Map((territoryRows || []).map((t) => [t.user_id, Number(t.cellCount || 0)]));

    // 4. Fetch daily challenge scores
    const challengeRows = await query(
      `SELECT user_id, COALESCE(SUM(score), 0) as "challengeScore"
       FROM daily_scores
       WHERE created_at >= $1 AND created_at <= $2
       GROUP BY user_id`,
      [timeStart, timeEnd]
    );
    const challengeMap = new Map((challengeRows || []).map((c) => [c.user_id, Number(c.challengeScore || 0)]));

    // 5. Combine and calculate 3 sectors for all users
    const results = allUsers.map((user) => {
      const act = actMap.get(user.id) || {};
      const distMeters = Number(act.totalDistance || 0);
      const distKm = parseFloat((distMeters / 1000).toFixed(2));
      const durSec = Number(act.totalDuration || 0);
      const acts = Number(act.activityCount || 0);

      // Monotonic Total Area Captured in this period (m² and km²) - NEVER decreases
      const totalAreaKm2 = parseFloat(Number(act.totalAreaCovered || 0).toFixed(6));
      const totalAreaCapturedKm2 = totalAreaKm2;
      const totalAreaCapturedM2 = Math.round(totalAreaKm2 * 1000000);

      // Current Holding Area on the live map (m² and km²) - decreases if someone steals cells
      const currentCellsOwned = territoryMap.get(user.id) || 0;
      const currentHoldingAreaM2 = Math.round(currentCellsOwned * 43.58);
      const currentHoldingAreaKm2 = parseFloat((currentHoldingAreaM2 / 1000000).toFixed(6));

      const chScore = challengeMap.get(user.id) || 0;
      const compScore = this.computeCompetitionScore({
        totalDistanceMeters: distMeters,
        totalAreaCoveredKm2: totalAreaKm2,
        challengeScore: chScore,
        activityCount: acts,
        uniqueCellsCount: currentCellsOwned,
      });

      return {
        userId: user.id,
        username: user.username,
        displayName: user.displayName || user.username,
        avatar: user.avatar || '⚡',
        // Sector 1: Distance Covered
        distanceKm: distKm,
        distanceMeters: distMeters,
        total_distance_meters: distMeters,
        // Sector 2: Current Holding Area (Live ownership)
        currentCellsOwned,
        currentHoldingAreaM2,
        currentHoldingAreaKm2,
        territoryCount: currentCellsOwned,
        // Sector 3: Total Area Captured (Monotonic, cumulative)
        totalAreaCapturedM2,
        totalAreaCapturedKm2,
        areaCoveredKm2: totalAreaKm2,
        // Auxiliary stats
        activityCount: acts,
        durationSeconds: durSec,
        durationFormatted: `${Math.floor(durSec / 3600)}h ${Math.floor((durSec % 3600) / 60)}m`,
        challengeScore: chScore,
        competitionScore: compScore,
        score: compScore,
      };
    });

    // Sort by selected sector
    if (sector === 'holding' || sector === 'holding_area') {
      results.sort((a, b) => b.currentHoldingAreaM2 - a.currentHoldingAreaM2 || b.distanceMeters - a.distanceMeters);
    } else if (sector === 'total_area' || sector === 'captured_area') {
      results.sort((a, b) => b.totalAreaCapturedM2 - a.totalAreaCapturedM2 || b.distanceMeters - a.distanceMeters);
    } else {
      // Default: distance
      results.sort((a, b) => b.distanceMeters - a.distanceMeters || b.totalAreaCapturedM2 - a.totalAreaCapturedM2);
    }

    return results;
  }
}
