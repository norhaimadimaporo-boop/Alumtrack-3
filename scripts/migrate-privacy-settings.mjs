/**
 * Creates the `alumni_privacy_settings` table used by the Privacy & Settings
 * page. Idempotent: safe to run more than once.
 *
 * Usage:
 *   npm run db:privacy                                     # uses .env
 *   ENV_FILE=.env.production npm run db:privacy            # Aiven / live
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import { loadEnvFile } from "./load-env.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envFile = process.env.ENV_FILE ?? ".env";
loadEnvFile(resolve(root, envFile));

const dbName = process.env.DB_NAME ?? "alumtrack";
if (!/^[A-Za-z0-9_]+$/.test(dbName)) {
  throw new Error(`DB_NAME "${dbName}" may only contain letters, numbers, and underscores.`);
}

function sslConfig() {
  const raw = (process.env.DB_SSL ?? "").trim().toLowerCase();
  if (!["1", "true", "yes", "required"].includes(raw)) return {};
  const caBase64 = (process.env.DB_SSL_CA_BASE64 ?? "").trim();
  const caPath = (process.env.DB_SSL_CA_PATH ?? "").trim();
  let ca;
  if (caBase64) ca = Buffer.from(caBase64, "base64").toString("utf8");
  else if (caPath) ca = readFileSync(resolve(root, caPath), "utf8");
  return { ssl: ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: true } };
}

const connection = await mysql.createConnection({
  host: process.env.DB_HOST ?? "127.0.0.1",
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? "root",
  password: process.env.DB_PASSWORD ?? "",
  database: dbName,
  charset: "utf8mb4",
  ...sslConfig(),
});

try {
  console.log(`Migrating privacy settings in ${process.env.DB_HOST}:${process.env.DB_PORT}/${dbName} (${envFile})`);
  await connection.query(`
    CREATE TABLE IF NOT EXISTS alumni_privacy_settings (
      user_id BIGINT UNSIGNED NOT NULL,
      public_show_contact TINYINT(1) NOT NULL DEFAULT 0,
      public_show_email TINYINT(1) NOT NULL DEFAULT 0,
      public_show_employment TINYINT(1) NOT NULL DEFAULT 1,
      public_include_region_stats TINYINT(1) NOT NULL DEFAULT 1,
      gis_show_workplace TINYINT(1) NOT NULL DEFAULT 1,
      gis_nearby_discovery TINYINT(1) NOT NULL DEFAULT 1,
      gis_city_only TINYINT(1) NOT NULL DEFAULT 0,
      directory_show_facebook TINYINT(1) NOT NULL DEFAULT 0,
      directory_show_workplace TINYINT(1) NOT NULL DEFAULT 1,
      directory_show_region TINYINT(1) NOT NULL DEFAULT 1,
      directory_show_mobile TINYINT(1) NOT NULL DEFAULT 0,
      notify_events TINYINT(1) NOT NULL DEFAULT 1,
      notify_jobs TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id),
      CONSTRAINT fk_privacy_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
  `);
  const [[row]] = await connection.query(
    "SELECT COUNT(*) AS total FROM alumni_privacy_settings",
  );
  console.log(`  ✓ alumni_privacy_settings ready (${row.total} saved preference row(s))`);
} finally {
  await connection.end();
}
