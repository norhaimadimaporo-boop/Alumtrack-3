/** Idempotently adds MySQL storage for compressed alumni profile photos. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
try {
  process.loadEnvFile(resolve(root, ".env"));
} catch {
  console.warn("No .env file found. Falling back to DB_* environment variables.");
}

const ca = process.env.DB_SSL_CA_BASE64
  ? Buffer.from(process.env.DB_SSL_CA_BASE64, "base64").toString("utf8")
  : undefined;
const connection = await mysql.createConnection({
  host: process.env.DB_HOST ?? "127.0.0.1",
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? "root",
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_NAME ?? "alumtrack",
  ...(process.env.DB_SSL === "true" || process.env.DB_SSL === "1"
    ? { ssl: ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: true } }
    : {}),
});

try {
  const [rows] = await connection.query(
    `SELECT COLUMN_NAME
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'alumni_profiles'
        AND COLUMN_NAME IN ('avatar_data', 'avatar_updated_at')`,
  );
  const existing = new Set(rows.map((row) => row.COLUMN_NAME));
  if (!existing.has("avatar_data")) {
    await connection.query("ALTER TABLE alumni_profiles ADD COLUMN avatar_data MEDIUMTEXT NULL");
  }
  if (!existing.has("avatar_updated_at")) {
    await connection.query(
      "ALTER TABLE alumni_profiles ADD COLUMN avatar_updated_at DATETIME(3) NULL",
    );
  }
  console.log("Alumni avatar storage is ready on the configured MySQL database.");
} finally {
  await connection.end();
}
