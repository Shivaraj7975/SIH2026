import { query } from '../config/database.js';

export class UsersRepository {
  static async create({ id, username, displayName, avatar = '⚡', passwordHash = '', createdAt = null }) {
    const timestamp = createdAt || new Date().toISOString();
    await query(
      `INSERT INTO users (id, username, display_name, avatar, password_hash, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT(id) DO UPDATE SET display_name = EXCLUDED.display_name, avatar = EXCLUDED.avatar`,
      [id, username.toLowerCase(), displayName, avatar, passwordHash, timestamp]
    );
    return this.findById(id);
  }

  static async findById(id) {
    const rows = await query(
      `SELECT 
        id, 
        username, 
        display_name as "displayName", 
        avatar, 
        password_hash as "passwordHash", 
        created_at as "createdAt" 
      FROM users 
      WHERE id = $1`,
      [id]
    );
    return rows[0] || null;
  }

  static async findByUsername(username) {
    const rows = await query(
      `SELECT 
        id, 
        username, 
        display_name as "displayName", 
        avatar, 
        password_hash as "passwordHash", 
        created_at as "createdAt" 
      FROM users 
      WHERE LOWER(username) = LOWER($1)`,
      [username]
    );
    return rows[0] || null;
  }

  static async findAll() {
    return query(
      `SELECT 
        id, 
        username, 
        display_name as "displayName", 
        avatar, 
        created_at as "createdAt" 
      FROM users 
      ORDER BY created_at ASC`
    );
  }

  static async getEnrichedUserProfile(userId) {
    const user = await this.findById(userId);
    if (!user) return null;

    const todayStr = new Date().toISOString().slice(0, 10);

    // 1. Daily Score
    const dailyScoreRows = await query(
      `SELECT COALESCE(SUM(score), 0) as "dailyScore"
       FROM daily_scores
       WHERE user_id = $1`,
      [userId]
    );

    const challengeProgRows = await query(
      `SELECT COALESCE(score, 0) as "progScore"
       FROM challenge_progress cp
       JOIN daily_challenges dc ON cp.challenge_id = dc.id
       WHERE cp.user_id = $1 AND dc.challenge_date = $2`,
      [userId, todayStr]
    );

    const dailyScore = Math.max(
      Number(dailyScoreRows[0]?.dailyScore || 0),
      Number(challengeProgRows[0]?.progScore || 0)
    );

    // 2. Current Territory Count
    const territoryCountRows = await query(
      `SELECT COUNT(*) as "currentTerritoryCount"
       FROM territory_cells
       WHERE current_owner_id = $1`,
      [userId]
    );

    const currentTerritoryCount = Number(territoryCountRows[0]?.currentTerritoryCount || 0);

    // 3. Weekly Stats & Rank
    const weeklyStatsRows = await query(
      `SELECT rank, total_distance as "weeklyDistance", total_duration as "weeklyDuration"
       FROM weekly_statistics
       WHERE user_id = $1
       ORDER BY year_number DESC, week_number DESC
       LIMIT 1`,
      [userId]
    );

    // 4. Overall Activity Stats (Permanent monotonic total area captured)
    const overallStatsRows = await query(
      `SELECT 
        COUNT(*) as "totalActivities",
        COALESCE(SUM(distance), 0) as "totalDistanceMeters",
        COALESCE(SUM(duration), 0) as "totalDurationSeconds",
        COALESCE(SUM(area_covered), 0) as "totalAreaCoveredKm2"
      FROM activities
      WHERE user_id = $1 AND validation_status = 'VALID'`,
      [userId]
    );

    const overall = overallStatsRows[0] || {};
    const totalAreaCapturedKm2 = parseFloat(Number(overall.totalAreaCoveredKm2 || 0).toFixed(4));
    const totalAreaCapturedM2 = Math.round(totalAreaCapturedKm2 * 1000000);

    // Current holding area (live ownership on the grid, ~43.58 m² per res-13 cell)
    const currentHoldingAreaM2 = Math.round(currentTerritoryCount * 43.58);
    const currentHoldingAreaKm2 = parseFloat((currentHoldingAreaM2 / 1000000).toFixed(6));

    return {
      ...user,
      dailyScore,
      currentTerritoryCount,
      currentHoldingAreaM2,
      currentHoldingAreaKm2,
      totalAreaCapturedM2,
      totalAreaCapturedKm2,
      weeklyRank: weeklyStatsRows[0]?.rank || 1,
      totalActivities: Number(overall.totalActivities || 0),
      totalDistanceKm: parseFloat(((Number(overall.totalDistanceMeters || 0)) / 1000).toFixed(2)),
      totalDurationMinutes: Math.round((Number(overall.totalDurationSeconds || 0)) / 60),
    };
  }
}
