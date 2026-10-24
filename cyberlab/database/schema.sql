-- ============================================================================
-- CyberLab V4 - MySQL 8+ / MariaDB 10.4+ schema
-- ----------------------------------------------------------------------------
-- Import with phpMyAdmin (SQL tab / Import) or the MySQL CLI:
--   mysql -u root -p < database/schema.sql
-- Safe to run once on a fresh server. It creates the database and all tables.
-- Passwords are NEVER stored in plaintext: users.password_hash is produced
-- by PHP password_hash(..., PASSWORD_DEFAULT) at registration time.
-- ============================================================================

CREATE DATABASE IF NOT EXISTS cyberlab_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE cyberlab_db;

-- --------------------------------------------------------------------------
-- A. users - one row per account
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  username      VARCHAR(32)     NOT NULL,
  email         VARCHAR(254)    NOT NULL,
  password_hash VARCHAR(255)    NOT NULL,
  role          ENUM('user','admin') NOT NULL DEFAULT 'user',
  is_active     TINYINT(1)      NOT NULL DEFAULT 1,
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login_at DATETIME        NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username (username),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role_active (role, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------------
-- B. user_profiles - exactly one profile per user (PK = FK)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id      BIGINT UNSIGNED NOT NULL,
  display_name VARCHAR(60)     NOT NULL,
  avatar       VARCHAR(32)     NOT NULL DEFAULT 'terminal',
  bio          VARCHAR(280)    NULL DEFAULT NULL,
  created_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_profiles_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------------
-- C. user_progress - exactly one aggregate record per user (UNIQUE user_id)
-- Totals are only ever written by the server (ChallengeService), inside the
-- same transaction that records the solve. The browser never sets them.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_progress (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id           BIGINT UNSIGNED NOT NULL,
  total_xp          INT UNSIGNED    NOT NULL DEFAULT 0,
  total_points      INT UNSIGNED    NOT NULL DEFAULT 0,
  current_level     INT UNSIGNED    NOT NULL DEFAULT 1,
  challenges_solved INT UNSIGNED    NOT NULL DEFAULT 0,
  created_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_progress_user (user_id),
  CONSTRAINT fk_progress_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------------
-- D. challenge_submissions - one row per (user, challenge), ever.
-- UNIQUE(user_id, challenge_id) + a status check inside the reward
-- transaction make "solve twice, get paid twice" impossible: wrong attempts
-- only bump attempt_count; the first correct answer flips status to
-- 'solved' and awards points/XP exactly once.
-- points_awarded / xp_awarded / is_daily are audit columns written by the
-- server at solve time (recent-activity views read these, never the client).
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS challenge_submissions (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id        BIGINT UNSIGNED NOT NULL,
  challenge_id   VARCHAR(32)     NOT NULL,
  status         ENUM('attempted','solved') NOT NULL DEFAULT 'attempted',
  attempt_count  INT UNSIGNED    NOT NULL DEFAULT 0,
  hints_used     TINYINT UNSIGNED NOT NULL DEFAULT 0,
  points_awarded INT UNSIGNED    NOT NULL DEFAULT 0,
  xp_awarded     INT UNSIGNED    NOT NULL DEFAULT 0,
  is_daily       TINYINT(1)      NOT NULL DEFAULT 0,
  solved_at      DATETIME        NULL DEFAULT NULL,
  created_at     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_submission_user_challenge (user_id, challenge_id),
  KEY idx_submissions_user_status (user_id, status),
  KEY idx_submissions_challenge (challenge_id),
  CONSTRAINT fk_submissions_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------------
-- E. user_achievements - earned badges; UNIQUE prevents duplicates
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_achievements (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id          BIGINT UNSIGNED NOT NULL,
  achievement_code VARCHAR(48)     NOT NULL,
  earned_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_achievement_user_code (user_id, achievement_code),
  KEY idx_achievements_user (user_id),
  CONSTRAINT fk_achievements_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------------
-- F. user_settings - per-user preferences (PK = FK: exactly one row each)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_settings (
  user_id        BIGINT UNSIGNED NOT NULL,
  theme          VARCHAR(24)     NOT NULL DEFAULT 'cyber-dark',
  language       VARCHAR(8)      NOT NULL DEFAULT 'id',
  reduced_motion TINYINT(1)      NOT NULL DEFAULT 0,
  created_at     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_settings_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------------
-- G. login_attempts - throttling evidence for AuthService.
-- Stores the submitted identifier (username/email *as typed*) and the IP so
-- guessing can be rate-limited per-account and per-address. Never stores
-- passwords or password hashes.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS login_attempts (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  identifier   VARCHAR(254)    NOT NULL,
  ip_address   VARCHAR(45)     NOT NULL DEFAULT '',
  success      TINYINT(1)      NOT NULL DEFAULT 0,
  attempted_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_attempts_identifier_time (identifier, attempted_at),
  KEY idx_attempts_ip_time (ip_address, attempted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
