-- ============================================================================
-- GeoFit Territory — PostgreSQL Schema DDL
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    username VARCHAR(64) NOT NULL UNIQUE,
    display_name VARCHAR(128) NOT NULL,
    avatar VARCHAR(255) NOT NULL DEFAULT '⚡',
    password_hash VARCHAR(255) NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS activities (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    type VARCHAR(16) NOT NULL CHECK (type IN ('RUN', 'WALK')),
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ended_at TIMESTAMP WITH TIME ZONE NOT NULL,
    distance DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    duration INTEGER NOT NULL DEFAULT 0,
    area_covered DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    route_geometry JSONB,
    validation_status VARCHAR(32) NOT NULL DEFAULT 'VALID' CHECK (validation_status IN ('VALID', 'SUSPICIOUS', 'INVALID', 'FLAGGED', 'REJECTED')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_activities_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS gps_points (
    id BIGSERIAL PRIMARY KEY,
    activity_id VARCHAR(64) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    accuracy DOUBLE PRECISION,
    speed DOUBLE PRECISION,
    CONSTRAINT fk_gps_points_activity FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS territory_cells (
    h3_cell_id VARCHAR(32) PRIMARY KEY,
    current_owner_id VARCHAR(64) NOT NULL,
    current_owner_updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_captured_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_territory_cells_owner FOREIGN KEY (current_owner_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS territory_history (
    id BIGSERIAL PRIMARY KEY,
    h3_cell_id VARCHAR(32) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    activity_id VARCHAR(64) NOT NULL,
    captured_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_territory_history_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_territory_history_activity FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS daily_challenges (
    id VARCHAR(64) PRIMARY KEY,
    challenge_date DATE NOT NULL UNIQUE,
    challenge_type VARCHAR(32) NOT NULL,
    target DOUBLE PRECISION NOT NULL,
    configuration JSONB NOT NULL DEFAULT '{}'::jsonb,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    is_finalized BOOLEAN NOT NULL DEFAULT FALSE,
    finalized_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS challenge_progress (
    id VARCHAR(64) PRIMARY KEY,
    challenge_id VARCHAR(64) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    progress DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    percentage DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    score INTEGER NOT NULL DEFAULT 0,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    activity_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_challenge_progress_challenge FOREIGN KEY (challenge_id) REFERENCES daily_challenges(id) ON DELETE CASCADE,
    CONSTRAINT fk_challenge_progress_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uq_challenge_user UNIQUE (challenge_id, user_id)
);

CREATE TABLE IF NOT EXISTS daily_scores (
    id VARCHAR(64) PRIMARY KEY,
    challenge_id VARCHAR(64) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_daily_scores_challenge FOREIGN KEY (challenge_id) REFERENCES daily_challenges(id) ON DELETE CASCADE,
    CONSTRAINT fk_daily_scores_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS weekly_statistics (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    year_number INTEGER NOT NULL,
    week_number INTEGER NOT NULL,
    total_distance DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    total_duration INTEGER NOT NULL DEFAULT 0,
    total_area DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    activity_count INTEGER NOT NULL DEFAULT 0,
    unique_cells_count INTEGER NOT NULL DEFAULT 0,
    challenge_score INTEGER NOT NULL DEFAULT 0,
    competition_score INTEGER NOT NULL DEFAULT 0,
    territory_count INTEGER NOT NULL DEFAULT 0,
    rank INTEGER,
    previous_rank INTEGER,
    rank_change INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_weekly_stats_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uq_weekly_user_period UNIQUE (user_id, year_number, week_number)
);

CREATE TABLE IF NOT EXISTS monthly_statistics (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    year_number INTEGER NOT NULL,
    month_number INTEGER NOT NULL,
    total_distance DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    total_duration INTEGER NOT NULL DEFAULT 0,
    total_area DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    activity_count INTEGER NOT NULL DEFAULT 0,
    unique_cells_count INTEGER NOT NULL DEFAULT 0,
    challenge_score INTEGER NOT NULL DEFAULT 0,
    competition_score INTEGER NOT NULL DEFAULT 0,
    territory_count INTEGER NOT NULL DEFAULT 0,
    rank INTEGER,
    previous_rank INTEGER,
    rank_change INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_monthly_stats_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uq_monthly_user_period UNIQUE (user_id, year_number, month_number)
);

CREATE TABLE IF NOT EXISTS achievements (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    type VARCHAR(64) NOT NULL,
    title VARCHAR(128) NOT NULL,
    description TEXT,
    icon VARCHAR(64) NOT NULL DEFAULT '🏆',
    unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_achievements_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uq_user_achievement UNIQUE (user_id, type)
);

CREATE TABLE IF NOT EXISTS user_privacy_settings (
    user_id VARCHAR(64) PRIMARY KEY,
    is_profile_public BOOLEAN NOT NULL DEFAULT TRUE,
    anonymous_leaderboard BOOLEAN NOT NULL DEFAULT FALSE,
    hide_route_geometry BOOLEAN NOT NULL DEFAULT FALSE,
    mask_privacy_zones BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_privacy_settings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS privacy_zones (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    name VARCHAR(100) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    radius_meters DOUBLE PRECISION NOT NULL DEFAULT 300.0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_privacy_zones_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_activities_user_created ON activities(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_territory_cells_owner ON territory_cells(current_owner_id);
CREATE INDEX IF NOT EXISTS idx_territory_history_cell ON territory_history(h3_cell_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_territory_history_user ON territory_history(user_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_gps_points_activity ON gps_points(activity_id, timestamp ASC);
CREATE INDEX IF NOT EXISTS idx_weekly_stats_rank ON weekly_statistics(year_number, week_number, total_distance DESC);
CREATE INDEX IF NOT EXISTS idx_privacy_zones_user ON privacy_zones(user_id);
