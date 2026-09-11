import { query } from '../config/database.js';

export class PrivacyRepository {
  /**
   * Retrieves privacy settings for a user (or defaults if not configured).
   */
  static async getSettings(userId) {
    const rows = await query(
      `SELECT 
        user_id as "userId",
        is_profile_public as "isProfilePublic",
        anonymous_leaderboard as "anonymousLeaderboard",
        hide_route_geometry as "hideRouteGeometry",
        mask_privacy_zones as "maskPrivacyZones",
        updated_at as "updatedAt"
       FROM user_privacy_settings
       WHERE user_id = $1`,
      [userId]
    );

    if (rows && rows.length > 0) {
      const r = rows[0];
      return {
        userId: r.userId,
        isProfilePublic: Boolean(r.isProfilePublic),
        anonymousLeaderboard: Boolean(r.anonymousLeaderboard),
        hideRouteGeometry: Boolean(r.hideRouteGeometry),
        maskPrivacyZones: Boolean(r.maskPrivacyZones),
        updatedAt: r.updatedAt,
      };
    }

    return {
      userId,
      isProfilePublic: true,
      anonymousLeaderboard: false,
      hideRouteGeometry: false,
      maskPrivacyZones: true,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Updates privacy settings for a user.
   */
  static async updateSettings(userId, {
    isProfilePublic = true,
    anonymousLeaderboard = false,
    hideRouteGeometry = false,
    maskPrivacyZones = true,
  }) {
    const pubVal = isProfilePublic ? 1 : 0;
    const anonVal = anonymousLeaderboard ? 1 : 0;
    const hideVal = hideRouteGeometry ? 1 : 0;
    const maskVal = maskPrivacyZones ? 1 : 0;
    const now = new Date().toISOString();

    await query(
      `INSERT INTO user_privacy_settings (user_id, is_profile_public, anonymous_leaderboard, hide_route_geometry, mask_privacy_zones, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT(user_id) DO UPDATE SET
        is_profile_public = excluded.is_profile_public,
        anonymous_leaderboard = excluded.anonymous_leaderboard,
        hide_route_geometry = excluded.hide_route_geometry,
        mask_privacy_zones = excluded.mask_privacy_zones,
        updated_at = excluded.updated_at`,
      [userId, pubVal, anonVal, hideVal, maskVal, now]
    );

    return this.getSettings(userId);
  }

  /**
   * Retrieves all privacy zones for a user.
   */
  static async getPrivacyZones(userId) {
    const rows = await query(
      `SELECT 
        id,
        user_id as "userId",
        name,
        latitude,
        longitude,
        radius_meters as "radiusMeters",
        created_at as "createdAt"
       FROM privacy_zones
       WHERE user_id = $1
       ORDER BY created_at ASC`,
      [userId]
    );

    return (rows || []).map((r) => ({
      id: r.id,
      userId: r.userId,
      name: r.name,
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      radiusMeters: Number(r.radiusMeters || 300),
      createdAt: r.createdAt,
    }));
  }

  /**
   * Creates a new privacy zone.
   */
  static async createPrivacyZone({
    id = null,
    userId,
    name,
    latitude,
    longitude,
    radiusMeters = 300.0,
  }) {
    const zoneId = id || `zone-${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();

    await query(
      `INSERT INTO privacy_zones (id, user_id, name, latitude, longitude, radius_meters, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [zoneId, userId, name, Number(latitude), Number(longitude), Number(radiusMeters), now]
    );

    return {
      id: zoneId,
      userId,
      name,
      latitude: Number(latitude),
      longitude: Number(longitude),
      radiusMeters: Number(radiusMeters),
      createdAt: now,
    };
  }

  /**
   * Deletes a privacy zone owned by the user.
   */
  static async deletePrivacyZone(userId, zoneId) {
    const result = await query(
      `DELETE FROM privacy_zones WHERE id = $1 AND user_id = $2`,
      [zoneId, userId]
    );
    return true;
  }

  /**
   * GDPR Data Deletion: Deletes a specific workout activity and its GPS points.
   */
  static async deleteActivity(activityId, userId) {
    // Verify ownership
    const rows = await query(`SELECT user_id FROM activities WHERE id = $1`, [activityId]);
    if (!rows || rows.length === 0) {
      return { found: false, deleted: false };
    }
    if (rows[0].user_id !== userId) {
      throw new Error('Unauthorized: You can only delete your own workouts.');
    }

    await query(`DELETE FROM gps_points WHERE activity_id = $1`, [activityId]);
    await query(`DELETE FROM territory_history WHERE activity_id = $1`, [activityId]);
    await query(`DELETE FROM activities WHERE id = $1 AND user_id = $2`, [activityId, userId]);

    return { found: true, deleted: true };
  }

  /**
   * Full GDPR Account Wipe: Deletes all personal telemetry, GPS traces, activities, privacy zones, achievements, and stats.
   */
  static async wipeUserAccountData(userId) {
    // 1. Remove GPS audit logs for all user activities
    await query(`DELETE FROM gps_points WHERE activity_id IN (SELECT id FROM activities WHERE user_id = $1)`, [userId]);
    
    // 2. Remove user territory conquests and history
    await query(`DELETE FROM territory_history WHERE user_id = $1`, [userId]);
    await query(`DELETE FROM territory_cells WHERE current_owner_id = $1`, [userId]);

    // 3. Remove challenge progress and scores
    await query(`DELETE FROM challenge_progress WHERE user_id = $1`, [userId]);
    await query(`DELETE FROM daily_scores WHERE user_id = $1`, [userId]);

    // 4. Remove weekly and monthly statistics
    await query(`DELETE FROM weekly_statistics WHERE user_id = $1`, [userId]);
    await query(`DELETE FROM monthly_statistics WHERE user_id = $1`, [userId]);

    // 5. Remove achievements, privacy zones, and privacy settings
    await query(`DELETE FROM achievements WHERE user_id = $1`, [userId]);
    await query(`DELETE FROM privacy_zones WHERE user_id = $1`, [userId]);
    await query(`DELETE FROM user_privacy_settings WHERE user_id = $1`, [userId]);

    // 6. Delete all activities
    await query(`DELETE FROM activities WHERE user_id = $1`, [userId]);

    return { success: true, wipedAt: new Date().toISOString() };
  }
}
