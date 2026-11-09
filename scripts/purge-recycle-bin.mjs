/**
 * 7-day auto-purge for the Head Admin Recycle Bin.
 * Hard-deletes soft-deleted rows with deleted_at older than 7 days.
 *
 * Run via OS cron (daily), e.g.:  0 2 * * *  cd /app && npm run db:purge
 * Also runs lazily on every Recycle Bin load in the app (serverless cron
 * equivalent), so expired rows disappear even without this script.
 *
 * Usage: npm run db:purge
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
  await connection.query("SET time_zone = '+00:00'");
  const cutoff = "deleted_at < UTC_TIMESTAMP() - INTERVAL 7 DAY";
  const [posts] = await connection.query(`DELETE FROM posts WHERE is_deleted = 1 AND ${cutoff}`);
  const [profiles] = await connection.query(
    `DELETE FROM alumni_profiles WHERE is_deleted = 1 AND ${cutoff}`,
  );
  const [users] = await connection.query(`DELETE FROM users WHERE is_deleted = 1 AND ${cutoff}`);
  console.log(
    `Purge complete: posts=${posts.affectedRows} alumni=${profiles.affectedRows} users=${users.affectedRows}`,
  );
} finally {
  await connection.end();
}
