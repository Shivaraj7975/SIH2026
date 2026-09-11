-- SQLite fallback schema
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    avatar TEXT NOT NULL DEFAULT '⚡',
    password_hash TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS activities (
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

CREATE TABLE IF NOT EXISTS gps_points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    activity_id TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    timestamp TEXT NOT NULL,
    accuracy REAL,
    speed REAL,
    FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS territory_cells (
    h3_cell_id TEXT PRIMARY KEY,
    current_owner_id TEXT NOT NULL,
    current_owner_updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_captured_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (current_owner_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS territory_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    h3_cell_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    activity_id TEXT NOT NULL,
    captured_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS daily_challenges (
    id TEXT PRIMARY KEY,
    challenge_date TEXT NOT NULL UNIQUE,
    challenge_type TEXT NOT NULL,
    target REAL NOT NULL,
    configuration TEXT NOT NULL DEFAULT '{}',
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    is_finalized INTEGER NOT NULL DEFAULT 0,
    finalized_at TEXT
);

CREATE TABLE IF NOT EXISTS challenge_progress (
    id TEXT PRIMARY KEY,
    challenge_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    progress REAL NOT NULL DEFAULT 0.0,
    percentage REAL NOT NULL DEFAULT 0.0,
    score INTEGER NOT NULL DEFAULT 0,
    completed INTEGER NOT NULL DEFAULT 0,
    completed_at TEXT,
    activity_ids TEXT NOT NULL DEFAULT '[]',
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (challenge_id) REFERENCES daily_challenges(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (challenge_id, user_id)
);

CREATE TABLE IF NOT EXISTS daily_scores (
    id TEXT PRIMARY KEY,
    challenge_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (challenge_id) REFERENCES daily_challenges(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS weekly_statistics (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    year_number INTEGER NOT NULL,
    week_number INTEGER NOT NULL,
    total_distance REAL NOT NULL DEFAULT 0.0,
    total_duration INTEGER NOT NULL DEFAULT 0,
    total_area REAL NOT NULL DEFAULT 0.0,
    activity_count INTEGER NOT NULL DEFAULT 0,
    unique_cells_count INTEGER NOT NULL DEFAULT 0,
    challenge_score INTEGER NOT NULL DEFAULT 0,
    competition_score INTEGER NOT NULL DEFAULT 0,
    territory_count INTEGER NOT NULL DEFAULT 0,
    rank INTEGER,
    previous_rank INTEGER,
    rank_change INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (user_id, year_number, week_number)
);

CREATE TABLE IF NOT EXISTS monthly_statistics (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    year_number INTEGER NOT NULL,
    month_number INTEGER NOT NULL,
    total_distance REAL NOT NULL DEFAULT 0.0,
    total_duration INTEGER NOT NULL DEFAULT 0,
    total_area REAL NOT NULL DEFAULT 0.0,
    activity_count INTEGER NOT NULL DEFAULT 0,
    unique_cells_count INTEGER NOT NULL DEFAULT 0,
    challenge_score INTEGER NOT NULL DEFAULT 0,
    competition_score INTEGER NOT NULL DEFAULT 0,
    territory_count INTEGER NOT NULL DEFAULT 0,
    rank INTEGER,
    previous_rank INTEGER,
    rank_change INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (user_id, year_number, month_number)
);

CREATE TABLE IF NOT EXISTS achievements (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    icon TEXT NOT NULL DEFAULT '🏆',
    unlocked_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (user_id, type)
);

CREATE TABLE IF NOT EXISTS user_privacy_settings (
    user_id TEXT PRIMARY KEY,
    is_profile_public INTEGER NOT NULL DEFAULT 1,
    anonymous_leaderboard INTEGER NOT NULL DEFAULT 0,
    hide_route_geometry INTEGER NOT NULL DEFAULT 0,
    mask_privacy_zones INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS privacy_zones (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    radius_meters REAL NOT NULL DEFAULT 300.0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indices for rapid query performance
CREATE INDEX IF NOT EXISTS idx_activities_user_created ON activities(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_territory_cells_owner ON territory_cells(current_owner_id);
CREATE INDEX IF NOT EXISTS idx_territory_history_cell ON territory_history(h3_cell_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_territory_history_user ON territory_history(user_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_gps_points_activity ON gps_points(activity_id, timestamp ASC);
CREATE INDEX IF NOT EXISTS idx_weekly_stats_rank ON weekly_statistics(year_number, week_number, total_distance DESC);
CREATE INDEX IF NOT EXISTS idx_privacy_zones_user ON privacy_zones(user_id);

