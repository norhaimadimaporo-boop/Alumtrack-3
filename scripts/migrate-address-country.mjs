/**
 * Adds `country` to `alumni_addresses` for the cascading Country → Province →
 * City selectors. Idempotent: only adds the column when it is missing.
 *
 * Usage:
 *   npm run db:address-country                          # uses .env
 *   ENV_FILE=.env.production npm run db:address-country # Aiven / live
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
  console.log(`Migrating alumni_addresses in ${process.env.DB_HOST}:${process.env.DB_PORT}/${dbName} (${envFile})`);
  const [[existing]] = await connection.execute(
    `SELECT COUNT(*) AS total
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'alumni_addresses' AND COLUMN_NAME = 'country'`,
    [dbName],
  );
  if (Number(existing.total) > 0) {
    console.log("  = alumni_addresses.country already exists");
  } else {
    await connection.query(
      "ALTER TABLE alumni_addresses ADD COLUMN country VARCHAR(120) NULL AFTER zip_code",
    );
    console.log("  + added alumni_addresses.country");
  }
} finally {
  await connection.end();
}
