/**
 * Idempotently creates OARCC chat tables on the configured database.
 *
 * Usage: npm run db:chat
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
try {
  process.loadEnvFile(resolve(root, ".env"));
} catch {
  console.warn("No .env file found. Falling back to DB_* environment variables.");
}

const dbName = process.env.DB_NAME ?? "alumtrack";
if (!/^[A-Za-z0-9_]+$/.test(dbName)) {
  throw new Error(`DB_NAME "${dbName}" may only contain letters, numbers, and underscores.`);
}
const ca = process.env.DB_SSL_CA_BASE64
  ? Buffer.from(process.env.DB_SSL_CA_BASE64, "base64").toString("utf8")
  : undefined;
const connection = await mysql.createConnection({
  host: process.env.DB_HOST ?? "127.0.0.1",
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? "root",
  password: process.env.DB_PASSWORD ?? "",
  database: dbName,
  ...(process.env.DB_SSL === "true" || process.env.DB_SSL === "1"
    ? { ssl: ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: true } }
    : {}),
});

try {
  await connection.query("SET time_zone = '+00:00'");
  await connection.query(`
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
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
  `);
  await connection.query(`
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
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
  `);
  const [columns] = await connection.query(`
    SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'chat_messages'
       AND COLUMN_NAME IN ('is_deleted', 'is_edited', 'edit_history')
  `);
  const existing = new Set(columns.map((row) => row.COLUMN_NAME));
  for (const [name, definition] of [
    ["is_deleted", "TINYINT(1) NOT NULL DEFAULT 0"],
    ["is_edited", "TINYINT(1) NOT NULL DEFAULT 0"],
    ["edit_history", "JSON NULL"],
  ]) {
    if (existing.has(name)) continue;
    try {
      await connection.query(`ALTER TABLE chat_messages ADD COLUMN ${name} ${definition}`);
    } catch (error) {
      if (error.code !== "ER_DUP_FIELDNAME") throw error;
    }
  }
  console.log("Chat tables are ready on the configured MySQL database.");
} finally {
  await connection.end();
}
