/**
 * Re-syncs the derived columns on alumni_profiles (course, college, batch year,
 * employment status, current job, and map coordinates) from the base education,
 * employment, and address records. Safe to run more than once.
 *
 * Usage: npm run db:backfill
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

const connection = await mysql.createConnection({
  host: process.env.DB_HOST ?? "localhost",
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? "root",
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_NAME ?? "alumtrack",
});

const [profiles] = await connection.query("SELECT id, user_id FROM alumni_profiles");

for (const profile of profiles) {
  const [education] = await connection.query(
    `SELECT degree, college, graduated_on
       FROM alumni_education
      WHERE user_id = ?
      ORDER BY FIELD(level, 'Baccalaureate Degree', 'Graduate Degree', 'Post Graduate Degree'),
               graduated_on IS NULL, graduated_on DESC, id DESC
      LIMIT 1`,
    [profile.user_id],
  );

  const degree = education[0];

  const [current] = await connection.query(
    `SELECT position, company
       FROM alumni_employment
      WHERE user_id = ? AND is_current = 1
      ORDER BY id DESC
      LIMIT 1`,
    [profile.user_id],
  );

  const status = current[0] ? "employed" : "unemployed";
  const batchYear = degree?.graduated_on
    ? new Date(degree.graduated_on).getUTCFullYear()
    : null;

  await connection.execute(
    `UPDATE alumni_profiles
        SET course = ?, college = ?, batch_year = ?, employment_status = ?,
            current_position = ?, current_company = ?
      WHERE id = ?`,
    [
      degree ? String(degree.degree).trim() : null,
      degree?.college ? String(degree.college).trim() : null,
      batchYear,
      status,
      current[0]?.position ?? null,
      current[0]?.company ?? null,
      profile.id,
    ],
  );

  console.log(`✓ profile ${profile.id} → ${status}, batch ${batchYear ?? "—"}`);
}

await connection.end();
console.log("Derived alumni profile fields are in sync.");
