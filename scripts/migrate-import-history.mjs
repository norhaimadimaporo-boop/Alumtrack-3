/**
 * Creates the alumni_imports history table used by the collapsible
 * "Imported CSV files" list in the import modal.
 * Safe to run more than once (CREATE TABLE IF NOT EXISTS).
 *
 * Usage: npm run db:imports
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

const connection = await mysql.createConnection({
  host: process.env.DB_HOST ?? "127.0.0.1",
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? "root",
  password: process.env.DB_PASSWORD ?? "",
});

try {
  await connection.query(`USE \`${dbName}\``);
  await connection.query(`
    CREATE TABLE IF NOT EXISTS alumni_imports (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      filename VARCHAR(255) NULL,
      total_rows INT UNSIGNED NOT NULL DEFAULT 0,
      created_rows INT UNSIGNED NOT NULL DEFAULT 0,
      updated_rows INT UNSIGNED NOT NULL DEFAULT 0,
      created_by BIGINT UNSIGNED NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_imports_created (created_at),
      CONSTRAINT fk_imports_actor FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
  `);
  console.log("alumni_imports table is ready.");
} finally {
  await connection.end();
}
