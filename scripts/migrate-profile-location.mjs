/**
 * Adds the synced location columns used by the GIS alumni map to an existing
 * AlumTrack database. Safe to run more than once.
 *
 * Usage: npm run db:migrate
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
  host: process.env.DB_HOST ?? "localhost",
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? "root",
  password: process.env.DB_PASSWORD ?? "",
  database: dbName,
});

const columns = [
  ["current_city", "VARCHAR(120) NULL"],
  ["current_country", "VARCHAR(120) NULL"],
  ["latitude", "DECIMAL(10, 7) NULL"],
  ["longitude", "DECIMAL(10, 7) NULL"],
];

const [existing] = await connection.query("SHOW COLUMNS FROM alumni_profiles");
const present = new Set(existing.map((column) => column.Field));

for (const [name, definition] of columns) {
  if (present.has(name)) {
    console.log(`✓ alumni_profiles.${name} already exists`);
    continue;
  }
  await connection.query(`ALTER TABLE alumni_profiles ADD COLUMN ${name} ${definition}`);
  console.log(`+ added alumni_profiles.${name}`);
}

await connection.end();
console.log("Profile location columns are up to date.");
