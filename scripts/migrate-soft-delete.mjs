/**
 * Adds soft-delete columns (Head Admin Recycle Bin) to existing databases:
 *   users / alumni_profiles / posts: is_deleted TINYINT(1) + deleted_at DATETIME
 * Safe to run more than once (idempotent information_schema checks).
 *
 * Usage: npm run db:recycle
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

const TABLES = ["users", "alumni_profiles", "posts"];

const connection = await mysql.createConnection({
  host: process.env.DB_HOST ?? "127.0.0.1",
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? "root",
  password: process.env.DB_PASSWORD ?? "",
});

async function addColumnIfMissing(table, column, definition, indexName) {
  const [cols] = await connection.execute(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [dbName, table, column],
  );
  if (cols.length === 0) {
    console.log(`Adding ${table}.${column} column…`);
    await connection.query(`ALTER TABLE \`${table}\` ADD COLUMN ${definition}`);
  } else {
    console.log(`${table}.${column} already exists.`);
  }
  const [idx] = await connection.execute(
    `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [dbName, table, indexName],
  );
  if (idx.length === 0) {
    console.log(`Adding ${table}.${indexName} index…`);
    await connection.query(`ALTER TABLE \`${table}\` ADD KEY \`${indexName}\` (\`${column}\`)`);
  }
}

try {
  await connection.query(`USE \`${dbName}\``);
  await connection.query("SET time_zone = '+00:00'");
  for (const table of TABLES) {
    await addColumnIfMissing(
      table,
      "is_deleted",
      "`is_deleted` TINYINT(1) NOT NULL DEFAULT 0 AFTER `id`",
      `idx_${table}_is_deleted`,
    );
    await addColumnIfMissing(
      table,
      "deleted_at",
      "`deleted_at` DATETIME NULL",
      `idx_${table}_deleted_at`,
    );
  }
  console.log("Soft-delete (recycle bin) migration complete.");
} finally {
  await connection.end();
}
