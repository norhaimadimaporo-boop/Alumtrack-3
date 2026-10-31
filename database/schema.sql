-- AlumTrack schema (MySQL 8+)
-- Create the database first (or run `npm run db:setup`, which does it for you):
--   CREATE DATABASE alumtrack CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--   USE alumtrack;
--   SOURCE database/schema.sql;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('alumni', 'admin') NOT NULL DEFAULT 'alumni',
  full_name VARCHAR(150) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  last_login_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role (role)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sessions (
  token_hash CHAR(64) NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (token_hash),
  KEY idx_sessions_user (user_id),
  KEY idx_sessions_expires (expires_at),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- One alumni profile per user account. Registration creates the account, then
-- the profile and its related records below in a single transaction.
CREATE TABLE IF NOT EXISTS alumni_profiles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100) NULL,
  gender ENUM('Male', 'Female', 'Prefer not to say') NOT NULL,
  birth_date DATE NOT NULL,
  age TINYINT UNSIGNED NULL,
  ethnicity VARCHAR(120) NOT NULL,
  birth_place VARCHAR(200) NOT NULL,
  religion VARCHAR(120) NOT NULL,
  mobile_number VARCHAR(30) NOT NULL,
  contact_email VARCHAR(255) NOT NULL,
  akan_email VARCHAR(255) NULL,
  facebook VARCHAR(255) NULL,
  course VARCHAR(200) NULL,
  college VARCHAR(200) NULL,
  batch_year SMALLINT UNSIGNED NULL,
  employment_status ENUM('employed', 'unemployed', 'unknown') NOT NULL DEFAULT 'unknown',
  current_position VARCHAR(200) NULL,
  current_company VARCHAR(200) NULL,
  current_region VARCHAR(120) NULL,
  verification_status ENUM('pending', 'verified', 'rejected') NOT NULL DEFAULT 'pending',
  verified_at DATETIME NULL,
  verified_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_profiles_user (user_id),
  KEY idx_profiles_verification (verification_status),
  KEY idx_profiles_employment (employment_status),
  KEY idx_profiles_batch (batch_year),
  CONSTRAINT fk_profiles_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_profiles_verifier FOREIGN KEY (verified_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS alumni_addresses (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  kind ENUM('current', 'home') NOT NULL,
  building VARCHAR(120) NULL,
  house_no VARCHAR(50) NULL,
  block VARCHAR(50) NULL,
  street VARCHAR(150) NULL,
  subdivision VARCHAR(150) NULL,
  city VARCHAR(120) NULL,
  province VARCHAR(120) NULL,
  zip_code VARCHAR(20) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_addresses_user_kind (user_id, kind),
  CONSTRAINT fk_addresses_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS alumni_education (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  level ENUM('Post Graduate Degree', 'Graduate Degree', 'Baccalaureate Degree') NOT NULL,
  school_id_no VARCHAR(50) NULL,
  degree VARCHAR(200) NOT NULL,
  major VARCHAR(200) NULL,
  college VARCHAR(200) NULL,
  school VARCHAR(200) NOT NULL,
  school_address VARCHAR(255) NULL,
  graduated_on DATE NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_education_user (user_id),
  CONSTRAINT fk_education_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS alumni_employment (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  is_current TINYINT(1) NOT NULL DEFAULT 1,
  position VARCHAR(200) NULL,
  company VARCHAR(200) NULL,
  company_address VARCHAR(255) NULL,
  length_of_employment VARCHAR(100) NULL,
  years_in_office VARCHAR(50) NULL,
  work_location ENUM('Local', 'Abroad') NULL,
  sector ENUM(
    'Government',
    'Non-Government / Private Institution',
    'Freelance / Entrepreneurial'
  ) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_employment_user (user_id),
  CONSTRAINT fk_employment_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS alumni_organizations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(200) NOT NULL,
  address VARCHAR(255) NULL,
  position VARCHAR(200) NULL,
  contact_no VARCHAR(50) NULL,
  email VARCHAR(255) NULL,
  member_since DATE NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_organizations_user (user_id),
  CONSTRAINT fk_organizations_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Audit trail for actions performed inside the admin console.
CREATE TABLE IF NOT EXISTS activity_log (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  actor_user_id BIGINT UNSIGNED NULL,
  actor_name VARCHAR(150) NULL,
  action VARCHAR(255) NOT NULL,
  entity_type VARCHAR(50) NULL,
  entity_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_activity_created (created_at),
  CONSTRAINT fk_activity_actor FOREIGN KEY (actor_user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS posts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  type ENUM('Announcement', 'News / Event', 'Job Offering') NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NULL,
  status ENUM('Published', 'Draft') NOT NULL DEFAULT 'Published',
  posted_at DATE NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_posts_title (title),
  KEY idx_posts_status (status),
  CONSTRAINT fk_posts_author FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
