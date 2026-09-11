import { query } from '../config/database.js';

export class GpsPointsRepository {
  static async createBatch(activityId, points) {
    if (!points || points.length === 0) return [];

    for (const p of points) {
      const ts = p.timestamp ? (typeof p.timestamp === 'number' ? new Date(p.timestamp).toISOString() : p.timestamp) : new Date().toISOString();
      await query(
        `INSERT INTO gps_points (activity_id, latitude, longitude, timestamp, accuracy, speed)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [activityId, p.latitude, p.longitude, ts, p.accuracy || null, p.speed || null]
      );
    }
    return true;
  }

  static async findByActivityId(activityId) {
    return query(
      `SELECT 
        id,
        activity_id as "activityId",
        latitude,
        longitude,
        timestamp,
        accuracy,
        speed
      FROM gps_points
      WHERE activity_id = $1
      ORDER BY timestamp ASC`,
      [activityId]
    );
  }
}
