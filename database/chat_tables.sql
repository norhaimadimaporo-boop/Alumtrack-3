-- OARCC alumni support chat tables (MySQL 8+).
-- The IDs use BIGINT UNSIGNED to match users.id and AlumTrack's other tables.

CREATE TABLE IF NOT EXISTS chat_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  alumni_user_id BIGINT UNSIGNED NOT NULL,
  mode ENUM('bot', 'agent') NOT NULL DEFAULT 'bot',
  status ENUM('open', 'resolved') NOT NULL DEFAULT 'open',
  unread_admin_count INT UNSIGNED NOT NULL DEFAULT 0,
  unread_alumni_count INT UNSIGNED NOT NULL DEFAULT 0,
  last_message_preview VARCHAR(255) NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_chat_sessions_alumni (alumni_user_id, status, updated_at),
  KEY idx_chat_sessions_inbox (mode, status, updated_at),
  CONSTRAINT fk_chat_sessions_alumni FOREIGN KEY (alumni_user_id)
    REFERENCES users (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chat_messages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  session_id BIGINT UNSIGNED NOT NULL,
  sender_type ENUM('alumni', 'bot', 'admin') NOT NULL,
  sender_name VARCHAR(100) NULL,
  message TEXT NOT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  is_deleted TINYINT(1) NOT NULL DEFAULT 0,
  is_edited TINYINT(1) NOT NULL DEFAULT 0,
  edit_history JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_chat_messages_session (session_id, id),
  KEY idx_chat_messages_unread (session_id, sender_type, is_read),
  CONSTRAINT fk_chat_messages_session FOREIGN KEY (session_id)
    REFERENCES chat_sessions (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
