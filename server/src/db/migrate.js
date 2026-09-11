import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDatabase, switchToSqliteFallback } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations() {
  let db = getDatabase();
  console.log(`🔄 Running migrations for engine: ${db.engine}...`);

  if (db.engine === 'postgres') {
    try {
      const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.postgres.sql'), 'utf8');
      await db.pool.query(schemaSql);

      // Safe column alterations for existing databases
      const alterQueries = [
        'ALTER TABLE daily_challenges ADD COLUMN IF NOT EXISTS is_finalized BOOLEAN NOT NULL DEFAULT FALSE',
        'ALTER TABLE daily_challenges ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMP WITH TIME ZONE',
        'ALTER TABLE challenge_progress ADD COLUMN IF NOT EXISTS percentage DOUBLE PRECISION NOT NULL DEFAULT 0.0',
        'ALTER TABLE challenge_progress ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE',
        "ALTER TABLE challenge_progress ADD COLUMN IF NOT EXISTS activity_ids JSONB NOT NULL DEFAULT '[]'::jsonb",
        'ALTER TABLE challenge_progress ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP',
        'ALTER TABLE weekly_statistics ADD COLUMN IF NOT EXISTS total_area DOUBLE PRECISION NOT NULL DEFAULT 0.0',
        'ALTER TABLE weekly_statistics ADD COLUMN IF NOT EXISTS activity_count INTEGER NOT NULL DEFAULT 0',
        'ALTER TABLE weekly_statistics ADD COLUMN IF NOT EXISTS unique_cells_count INTEGER NOT NULL DEFAULT 0',
        'ALTER TABLE weekly_statistics ADD COLUMN IF NOT EXISTS challenge_score INTEGER NOT NULL DEFAULT 0',
        'ALTER TABLE weekly_statistics ADD COLUMN IF NOT EXISTS competition_score INTEGER NOT NULL DEFAULT 0',
        'ALTER TABLE weekly_statistics ADD COLUMN IF NOT EXISTS previous_rank INTEGER',
        'ALTER TABLE weekly_statistics ADD COLUMN IF NOT EXISTS rank_change INTEGER NOT NULL DEFAULT 0',
        'ALTER TABLE monthly_statistics ADD COLUMN IF NOT EXISTS total_area DOUBLE PRECISION NOT NULL DEFAULT 0.0',
        'ALTER TABLE monthly_statistics ADD COLUMN IF NOT EXISTS activity_count INTEGER NOT NULL DEFAULT 0',
        'ALTER TABLE monthly_statistics ADD COLUMN IF NOT EXISTS unique_cells_count INTEGER NOT NULL DEFAULT 0',
        'ALTER TABLE monthly_statistics ADD COLUMN IF NOT EXISTS challenge_score INTEGER NOT NULL DEFAULT 0',
        'ALTER TABLE monthly_statistics ADD COLUMN IF NOT EXISTS competition_score INTEGER NOT NULL DEFAULT 0',
        'ALTER TABLE monthly_statistics ADD COLUMN IF NOT EXISTS previous_rank INTEGER',
        'ALTER TABLE monthly_statistics ADD COLUMN IF NOT EXISTS rank_change INTEGER NOT NULL DEFAULT 0',
      ];
      for (const q of alterQueries) {
        await db.pool.query(q).catch(() => {});
      }

      console.log('✅ PostgreSQL Schema migrations applied successfully!');
      return;
    } catch (err) {
      console.warn(`⚠️ PostgreSQL migration error (${err.message}). Switching to SQLite fallback...`);
      db = switchToSqliteFallback();
    }
  }

  const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sqlite.sql'), 'utf8');
  db.sqlite.exec(schemaSql);

  // Safe column alterations for existing SQLite databases
  try {
    const tableInfo = db.sqlite.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='activities'").get();
    if (tableInfo && tableInfo.sql && !tableInfo.sql.includes('SUSPICIOUS')) {
      db.sqlite.exec(`
        CREATE TABLE IF NOT EXISTS activities_new (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('RUN', 'WALK')),
          started_at TEXT NOT NULL,
          ended_at TEXT NOT NULL,
          distance REAL NOT NULL DEFAULT 0.0,
          duration INTEGER NOT NULL DEFAULT 0,
          area_covered REAL NOT NULL DEFAULT 0.0,
          route_geometry TEXT,
          validation_status TEXT NOT NULL DEFAULT 'VALID' CHECK (validation_status IN ('VALID', 'SUSPICIOUS', 'INVALID', 'FLAGGED', 'REJECTED')),
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        INSERT OR IGNORE INTO activities_new SELECT * FROM activities;
        DROP TABLE activities;
        ALTER TABLE activities_new RENAME TO activities;
      `);
    }
  } catch (e) {
    console.warn('Notice during activities table schema update:', e.message);
  }

  const sqliteAlters = [
    'ALTER TABLE daily_challenges ADD COLUMN is_finalized INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE daily_challenges ADD COLUMN finalized_at TEXT',
    'ALTER TABLE challenge_progress ADD COLUMN percentage REAL NOT NULL DEFAULT 0.0',
    'ALTER TABLE challenge_progress ADD COLUMN completed_at TEXT',
    "ALTER TABLE challenge_progress ADD COLUMN activity_ids TEXT NOT NULL DEFAULT '[]'",
    'ALTER TABLE challenge_progress ADD COLUMN updated_at TEXT',
    'ALTER TABLE weekly_statistics ADD COLUMN total_area REAL NOT NULL DEFAULT 0.0',
    'ALTER TABLE weekly_statistics ADD COLUMN activity_count INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE weekly_statistics ADD COLUMN unique_cells_count INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE weekly_statistics ADD COLUMN challenge_score INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE weekly_statistics ADD COLUMN competition_score INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE weekly_statistics ADD COLUMN previous_rank INTEGER',
    'ALTER TABLE weekly_statistics ADD COLUMN rank_change INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE monthly_statistics ADD COLUMN total_area REAL NOT NULL DEFAULT 0.0',
    'ALTER TABLE monthly_statistics ADD COLUMN activity_count INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE monthly_statistics ADD COLUMN unique_cells_count INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE monthly_statistics ADD COLUMN challenge_score INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE monthly_statistics ADD COLUMN competition_score INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE monthly_statistics ADD COLUMN previous_rank INTEGER',
    'ALTER TABLE monthly_statistics ADD COLUMN rank_change INTEGER NOT NULL DEFAULT 0',
  ];
  for (const q of sqliteAlters) {
    try {
      db.sqlite.exec(q);
    } catch (e) {
      // Column might already exist
    }
  }

  console.log('✅ SQLite Schema migrations applied successfully!');
}

// Allow direct CLI execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
