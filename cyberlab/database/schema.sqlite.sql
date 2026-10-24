-- ============================================================================
-- CyberLab V4 - SQLite schema (development & automated tests ONLY)
-- ----------------------------------------------------------------------------
-- Production uses database/schema.sql on MySQL/MariaDB. This file mirrors it
-- table-for-table so the exact same PDO code can be exercised where no MySQL
-- server exists (local dev, CI, the php-wasm test harness). Select it with
-- DB_DRIVER=sqlite. Differences vs MySQL: INTEGER ids, TEXT timestamps,
-- CHECK constraints instead of ENUM, COLLATE NOCASE for case-insensitive
-- uniqueness (MySQL gets that from utf8mb4_unicode_ci).
-- ============================================================================

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT NOT NULL COLLATE NOCASE,
  email         TEXT NOT NULL COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  is_active     INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  last_login_at TEXT NULL DEFAULT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_username ON users (username);
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_role_active ON users (role, is_active);

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id      INTEGER PRIMARY KEY,
  display_name TEXT NOT NULL,
  avatar       TEXT NOT NULL DEFAULT 'terminal',
  bio          TEXT NULL DEFAULT NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS user_progress (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id           INTEGER NOT NULL,
  total_xp          INTEGER NOT NULL DEFAULT 0,
  total_points      INTEGER NOT NULL DEFAULT 0,
  current_level     INTEGER NOT NULL DEFAULT 1,
  challenges_solved INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_progress_user ON user_progress (user_id);

CREATE TABLE IF NOT EXISTS challenge_submissions (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id        INTEGER NOT NULL,
  challenge_id   TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'attempted' CHECK (status IN ('attempted','solved')),
  attempt_count  INTEGER NOT NULL DEFAULT 0,
  hints_used     INTEGER NOT NULL DEFAULT 0,
  points_awarded INTEGER NOT NULL DEFAULT 0,
  xp_awarded     INTEGER NOT NULL DEFAULT 0,
  is_daily       INTEGER NOT NULL DEFAULT 0 CHECK (is_daily IN (0,1)),
  solved_at      TEXT NULL DEFAULT NULL,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_submission_user_challenge ON challenge_submissions (user_id, challenge_id);
CREATE INDEX IF NOT EXISTS idx_submissions_user_status ON challenge_submissions (user_id, status);
CREATE INDEX IF NOT EXISTS idx_submissions_challenge ON challenge_submissions (challenge_id);

CREATE TABLE IF NOT EXISTS user_achievements (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id          INTEGER NOT NULL,
  achievement_code TEXT NOT NULL,
  earned_at        TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_achievement_user_code ON user_achievements (user_id, achievement_code);
CREATE INDEX IF NOT EXISTS idx_achievements_user ON user_achievements (user_id);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id        INTEGER PRIMARY KEY,
  theme          TEXT NOT NULL DEFAULT 'cyber-dark',
  language       TEXT NOT NULL DEFAULT 'id',
  reduced_motion INTEGER NOT NULL DEFAULT 0 CHECK (reduced_motion IN (0,1)),
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS login_attempts (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  identifier   TEXT NOT NULL,
  ip_address   TEXT NOT NULL DEFAULT '',
  success      INTEGER NOT NULL DEFAULT 0 CHECK (success IN (0,1)),
  attempted_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_attempts_identifier_time ON login_attempts (identifier, attempted_at);
CREATE INDEX IF NOT EXISTS idx_attempts_ip_time ON login_attempts (ip_address, attempted_at);
