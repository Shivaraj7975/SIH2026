import { query } from '../config/database.js';

export class ActivitiesRepository {
  static async create({
    id,
    userId,
    type = 'RUN',
    startedAt,
    endedAt,
    distance = 0,
    duration = 0,
    areaCovered = 0,
    routeGeometry = null,
    validationStatus = 'VALID',
    createdAt = null,
  }) {
    const timestamp = createdAt || new Date().toISOString();
    const geomStr = typeof routeGeometry === 'object' ? JSON.stringify(routeGeometry) : routeGeometry;

    await query(
      `INSERT INTO activities (
        id, user_id, type, started_at, ended_at, distance, duration,
        area_covered, route_geometry, validation_status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT(id) DO UPDATE SET 
        distance = EXCLUDED.distance,
        duration = EXCLUDED.duration,
        area_covered = EXCLUDED.area_covered,
        validation_status = EXCLUDED.validation_status`,
      [id, userId, type, startedAt, endedAt, distance, duration, areaCovered, geomStr, validationStatus, timestamp]
    );

    return this.findById(id);
  }

  static async findById(id) {
    const rows = await query(
      `SELECT 
        id,
        user_id as "userId",
        type,
        started_at as "startedAt",
        ended_at as "endedAt",
        distance,
        duration,
        area_covered as "areaCovered",
        route_geometry as "routeGeometry",
        validation_status as "validationStatus",
        created_at as "createdAt"
      FROM activities 
      WHERE id = $1`,
      [id]
    );

    const row = rows[0] || null;
    if (row && row.routeGeometry) {
      if (typeof row.routeGeometry === 'string') {
        try {
          row.routeGeometry = JSON.parse(row.routeGeometry);
        } catch (e) {}
      }
    }
    return row;
  }

  static async findByUserId(userId, limit = 50) {
    const rows = await query(
      `SELECT 
        id,
        user_id as "userId",
        type,
        started_at as "startedAt",
        ended_at as "endedAt",
        distance,
        duration,
        area_covered as "areaCovered",
        route_geometry as "routeGeometry",
        validation_status as "validationStatus",
        created_at as "createdAt"
      FROM activities 
      WHERE user_id = $1
      ORDER BY started_at DESC
      LIMIT $2`,
      [userId, limit]
    );

    return rows.map((r) => {
      if (r.routeGeometry && typeof r.routeGeometry === 'string') {
        try {
          r.routeGeometry = JSON.parse(r.routeGeometry);
        } catch (e) {}
      }
      return r;
    });
  }

  static async findByDateRange(userId, startDate, endDate) {
    const rows = await query(
      `SELECT 
        id,
        user_id as "userId",
        type,
        started_at as "startedAt",
        ended_at as "endedAt",
        distance,
        duration,
        area_covered as "areaCovered",
        validation_status as "validationStatus",
        created_at as "createdAt"
      FROM activities
      WHERE user_id = $1 
        AND started_at >= $2 
        AND started_at <= $3
        AND validation_status = 'VALID'
      ORDER BY started_at ASC`,
      [userId, startDate, endDate]
    );
    return rows;
  }
}
