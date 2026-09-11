import { query, getDatabase } from '../config/database.js';

export class TerritoryRepository {
  static async findAllCurrentCells() {
    return query(
      `SELECT 
        tc.h3_cell_id as "h3CellId",
        tc.current_owner_id as "currentOwnerId",
        tc.current_owner_updated_at as "currentOwnerUpdatedAt",
        tc.last_captured_at as "lastCapturedAt",
        u.display_name as "ownerDisplayName",
        u.avatar as "ownerAvatar"
      FROM territory_cells tc
      JOIN users u ON tc.current_owner_id = u.id`
    );
  }

  static async findCellById(h3CellId) {
    const rows = await query(
      `SELECT 
        h3_cell_id as "h3CellId",
        current_owner_id as "currentOwnerId",
        current_owner_updated_at as "currentOwnerUpdatedAt",
        last_captured_at as "lastCapturedAt"
      FROM territory_cells 
      WHERE h3_cell_id = $1`,
      [h3CellId]
    );
    return rows[0] || null;
  }

  static async findCurrentCellsByUserId(userId) {
    return query(
      `SELECT 
        h3_cell_id as "h3CellId",
        current_owner_id as "currentOwnerId",
        current_owner_updated_at as "currentOwnerUpdatedAt",
        last_captured_at as "lastCapturedAt"
      FROM territory_cells 
      WHERE current_owner_id = $1`,
      [userId]
    );
  }

  static async captureCellsBatch({ h3CellIds, userId, activityId, capturedAt = null }) {
    if (!h3CellIds || h3CellIds.length === 0) {
      return { newCaptures: 0, stolenCaptures: 0, recaptures: 0, captureDetails: [] };
    }

    const timestamp = capturedAt || new Date().toISOString();
    const db = getDatabase();

    // Fast high-performance transaction execution for SQLite
    if (db.engine === 'sqlite' && db.sqlite) {
      const getExistingStmt = db.sqlite.prepare(
        `SELECT current_owner_id as currentOwnerId FROM territory_cells WHERE h3_cell_id = ?`
      );
      const upsertCellStmt = db.sqlite.prepare(
        `INSERT INTO territory_cells (
          h3_cell_id, current_owner_id, current_owner_updated_at, last_captured_at
        ) VALUES (?, ?, ?, ?)
        ON CONFLICT(h3_cell_id) DO UPDATE SET
          current_owner_id = excluded.current_owner_id,
          current_owner_updated_at = CASE 
            WHEN territory_cells.current_owner_id <> excluded.current_owner_id THEN excluded.current_owner_updated_at 
            ELSE territory_cells.current_owner_updated_at 
          END,
          last_captured_at = excluded.last_captured_at`
      );
      const checkHistoryStmt = db.sqlite.prepare(
        `SELECT id FROM territory_history WHERE activity_id = ? AND h3_cell_id = ?`
      );
      const insertHistoryStmt = db.sqlite.prepare(
        `INSERT INTO territory_history (
          h3_cell_id, user_id, activity_id, captured_at
        ) VALUES (?, ?, ?, ?)`
      );

      const captureTransaction = db.sqlite.transaction((cellList) => {
        let newCaptures = 0;
        let stolenCaptures = 0;
        let recaptures = 0;
        const captureDetails = [];

        for (const h3CellId of cellList) {
          const existing = getExistingStmt.get(h3CellId);
          let isStolen = false;

          if (!existing) {
            newCaptures++;
          } else if (existing.currentOwnerId !== userId) {
            stolenCaptures++;
            isStolen = true;
          } else {
            recaptures++;
          }

          upsertCellStmt.run(h3CellId, userId, timestamp, timestamp);

          const hist = checkHistoryStmt.get(activityId, h3CellId);
          if (!hist) {
            insertHistoryStmt.run(h3CellId, userId, activityId, timestamp);
          }

          captureDetails.push({
            h3CellId,
            currentOwnerId: userId,
            previousOwnerId: existing ? existing.currentOwnerId : null,
            isStolen,
            lastCapturedAt: timestamp,
          });
        }

        return { newCaptures, stolenCaptures, recaptures, captureDetails };
      });

      return captureTransaction(h3CellIds);
    }

    // Universal / Postgres fallback
    let newCaptures = 0;
    let stolenCaptures = 0;
    let recaptures = 0;
    const captureDetails = [];

    for (const h3CellId of h3CellIds) {
      const res = await this.captureCell({ h3CellId, userId, activityId, capturedAt: timestamp });
      if (res.wasAlreadyOwner) {
        recaptures++;
      } else {
        newCaptures++;
      }
      captureDetails.push(res);
    }

    return { newCaptures, stolenCaptures, recaptures, captureDetails };
  }

  static async captureCell({ h3CellId, userId, activityId, capturedAt = null }) {
    const timestamp = capturedAt || new Date().toISOString();

    const existingRows = await query(
      `SELECT current_owner_id as "currentOwnerId" FROM territory_cells WHERE h3_cell_id = $1`,
      [h3CellId]
    );
    const wasAlreadyOwner = existingRows[0]?.currentOwnerId === userId;

    await query(
      `INSERT INTO territory_cells (
        h3_cell_id, current_owner_id, current_owner_updated_at, last_captured_at
      ) VALUES ($1, $2, $3, $4)
      ON CONFLICT(h3_cell_id) DO UPDATE SET
        current_owner_id = EXCLUDED.current_owner_id,
        current_owner_updated_at = CASE 
          WHEN territory_cells.current_owner_id <> EXCLUDED.current_owner_id THEN EXCLUDED.current_owner_updated_at 
          ELSE territory_cells.current_owner_updated_at 
        END,
        last_captured_at = EXCLUDED.last_captured_at`,
      [h3CellId, userId, timestamp, timestamp]
    );

    // Idempotent history logging: Prevent duplicate log entries for the exact same activity & cell
    const existingHistory = await query(
      `SELECT id FROM territory_history WHERE activity_id = $1 AND h3_cell_id = $2`,
      [activityId, h3CellId]
    );

    let historyId = existingHistory[0]?.id;

    if (!existingHistory || existingHistory.length === 0) {
      const histResult = await query(
        `INSERT INTO territory_history (
          h3_cell_id, user_id, activity_id, captured_at
        ) VALUES ($1, $2, $3, $4)`,
        [h3CellId, userId, activityId, timestamp]
      );
      historyId = histResult[0]?.id;
    }

    return {
      h3CellId,
      userId,
      activityId,
      capturedAt: timestamp,
      historyId,
      wasAlreadyOwner,
    };
  }

  static async findHistoryByUserId(userId, limit = 100) {
    return query(
      `SELECT 
        id,
        h3_cell_id as "h3CellId",
        user_id as "userId",
        activity_id as "activityId",
        captured_at as "capturedAt"
      FROM territory_history
      WHERE user_id = $1
      ORDER BY captured_at DESC
      LIMIT $2`,
      [userId, limit]
    );
  }

  static async findHistoryByCellId(h3CellId) {
    return query(
      `SELECT 
        th.id,
        th.h3_cell_id as "h3CellId",
        th.user_id as "userId",
        th.activity_id as "activityId",
        th.captured_at as "capturedAt",
        u.display_name as "userDisplayName"
      FROM territory_history th
      JOIN users u ON th.user_id = u.id
      WHERE th.h3_cell_id = $1
      ORDER BY th.captured_at DESC`,
      [h3CellId]
    );
  }

  static async findCellsByActivityId(activityId) {
    const rows = await query(
      `SELECT h3_cell_id as "h3CellId" FROM territory_history WHERE activity_id = $1`,
      [activityId]
    );
    return rows.map((r) => r.h3CellId);
  }
}
