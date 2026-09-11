import { query } from '../config/database.js';

export class StatisticsRepository {
  static async upsertWeeklyStatistics({
    id,
    userId,
    yearNumber,
    weekNumber,
    totalDistance = 0,
    totalDuration = 0,
    totalArea = 0,
    activityCount = 0,
    uniqueCellsCount = 0,
    challengeScore = 0,
    competitionScore = 0,
    territoryCount = 0,
    rank = null,
    previousRank = null,
    rankChange = 0,
  }) {
    const timestamp = new Date().toISOString();
    await query(
      `INSERT INTO weekly_statistics (
        id, user_id, year_number, week_number, total_distance, total_duration,
        total_area, activity_count, unique_cells_count, challenge_score,
        competition_score, territory_count, rank, previous_rank, rank_change, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT(user_id, year_number, week_number) DO UPDATE SET
        total_distance = EXCLUDED.total_distance,
        total_duration = EXCLUDED.total_duration,
        total_area = EXCLUDED.total_area,
        activity_count = EXCLUDED.activity_count,
        unique_cells_count = EXCLUDED.unique_cells_count,
        challenge_score = EXCLUDED.challenge_score,
        competition_score = EXCLUDED.competition_score,
        territory_count = EXCLUDED.territory_count,
        previous_rank = COALESCE(weekly_statistics.rank, EXCLUDED.previous_rank),
        rank = EXCLUDED.rank,
        rank_change = EXCLUDED.rank_change,
        updated_at = EXCLUDED.updated_at`,
      [
        id,
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
        rank,
        previousRank,
        rankChange,
        timestamp,
      ]
    );

    return this.getWeeklyStatsByUserAndWeek(userId, yearNumber, weekNumber);
  }

  static async getWeeklyStatsByUserAndWeek(userId, yearNumber, weekNumber) {
    const rows = await query(
      `SELECT 
        id,
        user_id as "userId",
        year_number as "yearNumber",
        week_number as "weekNumber",
        total_distance as "totalDistance",
        total_duration as "totalDuration",
        total_area as "totalArea",
        activity_count as "activityCount",
        unique_cells_count as "uniqueCellsCount",
        challenge_score as "challengeScore",
        competition_score as "competitionScore",
        territory_count as "territoryCount",
        rank,
        previous_rank as "previousRank",
        rank_change as "rankChange",
        updated_at as "updatedAt"
      FROM weekly_statistics
      WHERE user_id = $1 AND year_number = $2 AND week_number = $3`,
      [userId, yearNumber, weekNumber]
    );
    return rows[0] || null;
  }

  static async getWeeklyLeaderboard(yearNumber, weekNumber) {
    const rows = await query(
      `SELECT 
        ws.id,
        ws.user_id as "userId",
        ws.year_number as "yearNumber",
        ws.week_number as "weekNumber",
        ws.total_distance as "totalDistance",
        ws.total_duration as "totalDuration",
        ws.total_area as "totalArea",
        ws.activity_count as "activityCount",
        ws.unique_cells_count as "uniqueCellsCount",
        ws.challenge_score as "challengeScore",
        ws.competition_score as "competitionScore",
        ws.territory_count as "territoryCount",
        ws.rank,
        ws.previous_rank as "previousRank",
        ws.rank_change as "rankChange",
        u.username,
        u.display_name as "displayName",
        u.avatar
      FROM weekly_statistics ws
      JOIN users u ON ws.user_id = u.id
      WHERE ws.year_number = $1 AND ws.week_number = $2
      ORDER BY ws.competition_score DESC, ws.total_distance DESC, ws.activity_count DESC, ws.user_id ASC`,
      [yearNumber, weekNumber]
    );

    return rows.map((r, index) => ({
      ...r,
      rank: index + 1,
    }));
  }

  static async upsertMonthlyStatistics({
    id,
    userId,
    yearNumber,
    monthNumber,
    totalDistance = 0,
    totalDuration = 0,
    totalArea = 0,
    activityCount = 0,
    uniqueCellsCount = 0,
    challengeScore = 0,
    competitionScore = 0,
    territoryCount = 0,
    rank = null,
    previousRank = null,
    rankChange = 0,
  }) {
    const timestamp = new Date().toISOString();
    await query(
      `INSERT INTO monthly_statistics (
        id, user_id, year_number, month_number, total_distance, total_duration,
        total_area, activity_count, unique_cells_count, challenge_score,
        competition_score, territory_count, rank, previous_rank, rank_change, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT(user_id, year_number, month_number) DO UPDATE SET
        total_distance = EXCLUDED.total_distance,
        total_duration = EXCLUDED.total_duration,
        total_area = EXCLUDED.total_area,
        activity_count = EXCLUDED.activity_count,
        unique_cells_count = EXCLUDED.unique_cells_count,
        challenge_score = EXCLUDED.challenge_score,
        competition_score = EXCLUDED.competition_score,
        territory_count = EXCLUDED.territory_count,
        previous_rank = COALESCE(monthly_statistics.rank, EXCLUDED.previous_rank),
        rank = EXCLUDED.rank,
        rank_change = EXCLUDED.rank_change,
        updated_at = EXCLUDED.updated_at`,
      [
        id,
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
        rank,
        previousRank,
        rankChange,
        timestamp,
      ]
    );

    return this.getMonthlyStatsByUserAndMonth(userId, yearNumber, monthNumber);
  }

  static async getMonthlyStatsByUserAndMonth(userId, yearNumber, monthNumber) {
    const rows = await query(
      `SELECT 
        id,
        user_id as "userId",
        year_number as "yearNumber",
        month_number as "monthNumber",
        total_distance as "totalDistance",
        total_duration as "totalDuration",
        total_area as "totalArea",
        activity_count as "activityCount",
        unique_cells_count as "uniqueCellsCount",
        challenge_score as "challengeScore",
        competition_score as "competitionScore",
        territory_count as "territoryCount",
        rank,
        previous_rank as "previousRank",
        rank_change as "rankChange",
        updated_at as "updatedAt"
      FROM monthly_statistics
      WHERE user_id = $1 AND year_number = $2 AND month_number = $3`,
      [userId, yearNumber, monthNumber]
    );
    return rows[0] || null;
  }

  static async getMonthlyLeaderboard(yearNumber, monthNumber) {
    const rows = await query(
      `SELECT 
        ms.id,
        ms.user_id as "userId",
        ms.year_number as "yearNumber",
        ms.month_number as "monthNumber",
        ms.total_distance as "totalDistance",
        ms.total_duration as "totalDuration",
        ms.total_area as "totalArea",
        ms.activity_count as "activityCount",
        ms.unique_cells_count as "uniqueCellsCount",
        ms.challenge_score as "challengeScore",
        ms.competition_score as "competitionScore",
        ms.territory_count as "territoryCount",
        ms.rank,
        ms.previous_rank as "previousRank",
        ms.rank_change as "rankChange",
        u.username,
        u.display_name as "displayName",
        u.avatar
      FROM monthly_statistics ms
      JOIN users u ON ms.user_id = u.id
      WHERE ms.year_number = $1 AND ms.month_number = $2
      ORDER BY ms.competition_score DESC, ms.total_distance DESC, ms.activity_count DESC, ms.user_id ASC`,
      [yearNumber, monthNumber]
    );

    return rows.map((r, index) => ({
      ...r,
      rank: index + 1,
    }));
  }

  static async getAllTimeLeaderboard() {
    const rows = await query(
      `SELECT 
        u.id as "userId",
        u.username,
        u.display_name as "displayName",
        u.avatar,
        COALESCE(SUM(a.distance), 0) as "totalDistance",
        COALESCE(SUM(a.duration), 0) as "totalDuration",
        COALESCE(SUM(a.area_covered), 0) as "totalArea",
        COUNT(a.id) as "activityCount",
        (SELECT COUNT(DISTINCT h3_cell_id) FROM territory_history WHERE user_id = u.id) as "uniqueCellsCount",
        COALESCE((SELECT SUM(score) FROM daily_scores WHERE user_id = u.id), 0) as "challengeScore",
        (SELECT COUNT(*) FROM territory_cells WHERE current_owner_id = u.id) as "territoryCount"
      FROM users u
      LEFT JOIN activities a ON u.id = a.user_id AND a.validation_status = 'VALID'
      GROUP BY u.id, u.username, u.display_name, u.avatar
      ORDER BY "totalDistance" DESC, "activityCount" DESC, u.id ASC`
    );

    return rows.map((r, index) => {
      const distM = Number(r.totalDistance) || 0;
      const areaKm2 = Number(r.totalArea) || 0;
      const actCount = Number(r.activityCount) || 0;
      const cellsCount = Number(r.uniqueCellsCount) || 0;
      const chScore = Number(r.challengeScore) || 0;

      const compScore = Math.floor(distM / 10) + Math.floor(areaKm2 * 50) + chScore + (actCount * 25) + (cellsCount * 10);

      return {
        rank: index + 1,
        userId: r.userId,
        username: r.username,
        displayName: r.displayName,
        avatar: r.avatar,
        totalDistance: distM,
        totalDuration: Number(r.totalDuration) || 0,
        totalArea: areaKm2,
        activityCount: actCount,
        uniqueCellsCount: cellsCount,
        challengeScore: chScore,
        competitionScore: compScore,
        territoryCount: Number(r.territoryCount) || 0,
        rankChange: 0,
      };
    });
  }
}
