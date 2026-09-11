import { query } from '../config/database.js';

export class ChallengesRepository {
  static async createDailyChallenge({
    id,
    challengeDate,
    challengeType,
    target,
    configuration = {},
    startTime,
    endTime,
  }) {
    const configStr = typeof configuration === 'object' ? JSON.stringify(configuration) : configuration;

    await query(
      `INSERT INTO daily_challenges (
        id, challenge_date, challenge_type, target, configuration, start_time, end_time, is_finalized
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE)
      ON CONFLICT(challenge_date) DO UPDATE SET
        challenge_type = EXCLUDED.challenge_type,
        target = EXCLUDED.target,
        configuration = EXCLUDED.configuration,
        start_time = EXCLUDED.start_time,
        end_time = EXCLUDED.end_time`,
      [id, challengeDate, challengeType, target, configStr, startTime, endTime]
    );

    return this.findByDate(challengeDate);
  }

  static async findByDate(dateStr) {
    const rows = await query(
      `SELECT 
        id,
        challenge_date as "challengeDate",
        challenge_type as "challengeType",
        target,
        configuration,
        start_time as "startTime",
        end_time as "endTime",
        is_finalized as "isFinalized",
        finalized_at as "finalizedAt"
      FROM daily_challenges
      WHERE challenge_date = $1`,
      [dateStr]
    );

    const row = rows[0] || null;
    if (row && row.configuration && typeof row.configuration === 'string') {
      try {
        row.configuration = JSON.parse(row.configuration);
      } catch (e) {}
    }
    return row;
  }

  static async findById(id) {
    const rows = await query(
      `SELECT 
        id,
        challenge_date as "challengeDate",
        challenge_type as "challengeType",
        target,
        configuration,
        start_time as "startTime",
        end_time as "endTime",
        is_finalized as "isFinalized",
        finalized_at as "finalizedAt"
      FROM daily_challenges
      WHERE id = $1`,
      [id]
    );

    const row = rows[0] || null;
    if (row && row.configuration && typeof row.configuration === 'string') {
      try {
        row.configuration = JSON.parse(row.configuration);
      } catch (e) {}
    }
    return row;
  }

  static async getProgress(challengeId, userId) {
    const rows = await query(
      `SELECT 
        id,
        challenge_id as "challengeId",
        user_id as "userId",
        progress,
        percentage,
        score,
        completed,
        completed_at as "completedAt",
        activity_ids as "activityIds"
      FROM challenge_progress
      WHERE challenge_id = $1 AND user_id = $2`,
      [challengeId, userId]
    );
    const row = rows[0] || null;
    if (row) {
      row.completed = Boolean(row.completed);
      if (row.activityIds && typeof row.activityIds === 'string') {
        try {
          row.activityIds = JSON.parse(row.activityIds);
        } catch (e) {}
      }
    }
    return row;
  }

  static async upsertProgress({
    id,
    challengeId,
    userId,
    progress,
    percentage = 0,
    score = 0,
    completed = false,
    completedAt = null,
    activityIds = [],
  }) {
    const actIdsStr = typeof activityIds === 'object' ? JSON.stringify(activityIds) : activityIds;
    const updatedAt = new Date().toISOString();

    await query(
      `INSERT INTO challenge_progress (
        id, challenge_id, user_id, progress, percentage, score, completed, completed_at, activity_ids, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT(challenge_id, user_id) DO UPDATE SET
        progress = EXCLUDED.progress,
        percentage = EXCLUDED.percentage,
        score = EXCLUDED.score,
        completed = EXCLUDED.completed,
        completed_at = COALESCE(challenge_progress.completed_at, EXCLUDED.completed_at),
        activity_ids = EXCLUDED.activity_ids,
        updated_at = EXCLUDED.updated_at`,
      [id, challengeId, userId, progress, percentage, score, completed ? true : false, completedAt, actIdsStr, updatedAt]
    );

    return this.getProgress(challengeId, userId);
  }

  static async recordDailyScore({ id, challengeId, userId, score }) {
    const timestamp = new Date().toISOString();
    await query(
      `INSERT INTO daily_scores (id, challenge_id, user_id, score, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, challengeId, userId, score, timestamp]
    );
  }

  static async getTodaysLeaderboard(challengeId) {
    const rows = await query(
      `SELECT 
        cp.user_id as "userId",
        u.username,
        u.display_name as "displayName",
        u.avatar,
        cp.progress,
        cp.percentage,
        cp.score,
        cp.completed,
        cp.completed_at as "completedAt"
      FROM challenge_progress cp
      JOIN users u ON cp.user_id = u.id
      WHERE cp.challenge_id = $1
      ORDER BY cp.completed DESC, cp.progress DESC, cp.score DESC`,
      [challengeId]
    );

    return rows.map((r) => ({
      ...r,
      completed: Boolean(r.completed),
    }));
  }

  static async getChallengeHistory(userId, limit = 10) {
    const rows = await query(
      `SELECT 
        dc.id,
        dc.challenge_date as "challengeDate",
        dc.challenge_type as "challengeType",
        dc.target,
        dc.configuration,
        dc.start_time as "startTime",
        dc.end_time as "endTime",
        dc.is_finalized as "isFinalized",
        COALESCE(cp.progress, 0) as "userProgress",
        COALESCE(cp.percentage, 0) as "userPercentage",
        COALESCE(cp.completed, FALSE) as "userCompleted",
        COALESCE(cp.score, 0) as "userScore",
        cp.completed_at as "userCompletedAt"
      FROM daily_challenges dc
      LEFT JOIN challenge_progress cp ON dc.id = cp.challenge_id AND cp.user_id = $1
      ORDER BY dc.challenge_date DESC
      LIMIT $2`,
      [userId, limit]
    );

    return rows.map((r) => {
      let config = r.configuration;
      if (typeof config === 'string') {
        try {
          config = JSON.parse(config);
        } catch (e) {}
      }
      return {
        id: r.id,
        challengeDate: r.challengeDate,
        challengeType: r.challengeType,
        target: r.target,
        configuration: config,
        startTime: r.startTime,
        endTime: r.endTime,
        isFinalized: Boolean(r.isFinalized),
        progress: {
          progress: r.userProgress,
          percentage: r.userPercentage,
          completed: Boolean(r.userCompleted),
          score: r.userScore,
          completedAt: r.userCompletedAt,
        },
      };
    });
  }
}
