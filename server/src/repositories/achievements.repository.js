import { query } from '../config/database.js';

export class AchievementsRepository {
  static async create({ id, userId, type, title, description = '', icon = '🏆', unlockedAt = null }) {
    const timestamp = unlockedAt || new Date().toISOString();
    await query(
      `INSERT INTO achievements (id, user_id, type, title, description, icon, unlocked_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT(user_id, type) DO NOTHING`,
      [id, userId, type, title, description, icon, timestamp]
    );
    return this.findByUser(userId);
  }

  static async findByUser(userId) {
    return query(
      `SELECT 
        id,
        user_id as "userId",
        type,
        title,
        description,
        icon,
        unlocked_at as "unlockedAt"
      FROM achievements
      WHERE user_id = $1
      ORDER BY unlocked_at DESC`,
      [userId]
    );
  }
}
