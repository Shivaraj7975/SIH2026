import pg from 'pg';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const { Pool } = pg;

let pgPool = null;
let sqliteDb = null;
let activeEngine = 'sqlite'; // 'postgres' | 'sqlite'

function initSqlite() {
  const dataDir = path.resolve(__dirname, '../../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const dbPath = path.join(dataDir, 'geofit.db');
  sqliteDb = new Database(dbPath);
  sqliteDb.pragma('journal_mode = WAL');
  sqliteDb.pragma('foreign_keys = ON');
  activeEngine = 'sqlite';
  console.log(`📦 Database active: SQLite WAL engine (${dbPath})`);
  return { engine: 'sqlite', sqlite: sqliteDb, db: sqliteDb };
}

export function initDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  const useSqliteFallback = process.env.USE_SQLITE_FALLBACK !== 'false';

  if (databaseUrl && !databaseUrl.includes('placeholder')) {
    try {
      pgPool = new Pool({
        connectionString: databaseUrl,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });
      activeEngine = 'postgres';
      return { engine: 'postgres', pool: pgPool };
    } catch (err) {
      console.warn('⚠️ PostgreSQL pool setup error, checking fallback:', err.message);
    }
  }

  if (useSqliteFallback) {
    return initSqlite();
  }

  throw new Error('No database configuration found and SQLite fallback disabled');
}

export function switchToSqliteFallback() {
  console.warn('⚠️ PostgreSQL unavailable or credentials rejected. Seamlessly falling back to local SQLite WAL engine...');
  pgPool = null;
  return initSqlite();
}

export function getDatabase() {
  if (!pgPool && !sqliteDb) {
    initDatabase();
  }
  return {
    engine: activeEngine,
    pool: pgPool,
    sqlite: sqliteDb,
  };
}

/**
 * Universal Unified Query Runner
 * Works across both Postgres ($1, $2) and SQLite (? or @param)
 */
export async function query(sql, params = []) {
  const db = getDatabase();

  if (db.engine === 'postgres') {
    try {
      const res = await db.pool.query(sql, params);
      return res.rows;
    } catch (err) {
      // If PostgreSQL query fails due to connection/auth, fallback to SQLite if enabled
      if (process.env.USE_SQLITE_FALLBACK !== 'false' && (err.code === '28P01' || err.code === 'ECONNREFUSED')) {
        switchToSqliteFallback();
        return query(sql, params);
      }
      throw err;
    }
  } else {
    // Convert $1, $2, ... placeholders to ? for SQLite compatibility
    let sqliteSql = sql.replace(/\$(\d+)/g, '?');
    sqliteSql = sqliteSql.replace(/TRUE/gi, '1').replace(/FALSE/gi, '0');
    sqliteSql = sqliteSql.replace(/::jsonb/gi, '').replace(/::json/gi, '');

    // Normalize parameters for SQLite (booleans to 1/0, non-buffer objects to JSON string)
    const sqliteParams = params.map((p) => {
      if (typeof p === 'boolean') return p ? 1 : 0;
      if (p !== null && typeof p === 'object' && !Buffer.isBuffer(p)) return JSON.stringify(p);
      return p;
    });

    const trimmed = sqliteSql.trim();
    if (trimmed.toUpperCase().startsWith('SELECT') || trimmed.toUpperCase().startsWith('PRAGMA') || trimmed.toUpperCase().startsWith('WITH')) {
      const stmt = db.sqlite.prepare(sqliteSql);
      return stmt.all(...sqliteParams);
    } else {
      const stmt = db.sqlite.prepare(sqliteSql);
      const info = stmt.run(...sqliteParams);
      return [{ id: info.lastInsertRowid, changes: info.changes }];
    }
  }
}

/**
 * Synchronous SQLite runner for high-throughput sync operations
 */
export function querySync(sql, params = []) {
  const { sqlite } = getDatabase();
  if (!sqlite) {
    throw new Error('querySync is only available when using SQLite engine');
  }
  let sqliteSql = sql.replace(/\$(\d+)/g, '?');
  sqliteSql = sqliteSql.replace(/TRUE/gi, '1').replace(/FALSE/gi, '0');
  const sqliteParams = params.map((p) => {
    if (typeof p === 'boolean') return p ? 1 : 0;
    if (p !== null && typeof p === 'object' && !Buffer.isBuffer(p)) return JSON.stringify(p);
    return p;
  });
  const trimmed = sqliteSql.trim();
  if (trimmed.toUpperCase().startsWith('SELECT') || trimmed.toUpperCase().startsWith('PRAGMA')) {
    return sqlite.prepare(sqliteSql).all(...sqliteParams);
  } else {
    return sqlite.prepare(sqliteSql).run(...sqliteParams);
  }
}
