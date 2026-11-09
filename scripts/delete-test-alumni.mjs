/**
 * Permanently deletes the 60 test alumni records by exact MSU ID list.
 * MSU IDs are stored in alumni_education.school_id_no; the supplied list
 * contains small offsets vs. the stored values, so each target is resolved
 * to its nearest stored ID in the same year (diff <= 10, 1:1 distinct).
 * Hard-deletes via users cascade: alumni_profiles, alumni_addresses,
 * alumni_education, alumni_employment, alumni_organizations,
 * alumni_privacy_settings, and sessions are removed with the user row.
 *
 * Usage: node scripts/delete-test-alumni.mjs [--dry-run]
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const TARGETS = [
  "2018-39257", "2019-10851", "2021-20327", "2019-99595", "2018-84347",
  "2015-24376", "2020-24623", "2024-52485", "2023-31649", "2018-87123",
  "2018-22365", "2019-70634", "2015-61179", "2017-18981", "2021-27156",
  "2023-49654", "2019-76249", "2016-29532", "2017-41029", "2018-36151",
  "2017-86093", "2020-91678", "2021-81817", "2018-36104", "2017-77889",
  "2022-68995", "2018-18413", "2023-81587", "2015-21008", "2015-55877",
  "2016-31461", "2024-25868", "2023-95251", "2020-33838", "2016-48563",
  "2016-35249", "2017-49615", "2017-16734", "2024-91054", "2016-30588",
  "2019-91928", "2019-62752", "2022-78021", "2022-21549", "2019-67421",
  "2018-69874", "2022-55231", "2017-74929", "2021-95175", "2019-13798",
  "2019-80678", "2019-88912", "2021-67403", "2023-80421", "2019-93547",
  "2023-49886", "2020-61729", "2022-10854", "2016-58619", "2016-66597",
];

const DRY_RUN = process.argv.includes("--dry-run");

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
try {
  process.loadEnvFile(resolve(root, ".env"));
} catch {
  console.warn("No .env file found. Falling back to DB_* environment variables.");
}
try {
  process.loadEnvFile(resolve(root, ".env.production"));
} catch {}

const connection = await mysql.createConnection({
  host: process.env.DB_HOST ?? "127.0.0.1",
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? "root",
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_NAME ?? "alumtrack",
  ssl: process.env.DB_SSL === "true" || process.env.DB_SSL === "1"
    ? { rejectUnauthorized: false }
    : undefined,
  multipleStatements: false,
});

const [before] = await connection.query(
  `SELECT COUNT(*) AS total,
          SUM(p.verification_status = 'verified' AND COALESCE(p.is_deleted, 0) = 0) AS live
     FROM alumni_profiles p`,
);
console.log("Before:", JSON.stringify(before[0]));

const [eduRows] = await connection.query(
  `SELECT e.school_id_no, p.id AS profile_id, p.user_id
     FROM alumni_education e
     JOIN alumni_profiles p ON p.user_id = e.user_id`,
);

const used = new Set();
const resolved = [];
for (const target of [...TARGETS].sort()) {
  const [year, num] = target.split("-");
  const n = Number(num);
  let best = null;
  let bestDiff = Infinity;
  for (const row of eduRows) {
    const match = String(row.school_id_no).match(/^(\d+)-(\d+)$/);
    if (!match || match[1] !== year) continue;
    if (used.has(row.school_id_no)) continue;
    const diff = Math.abs(Number(match[2]) - n);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = row;
    }
  }
  if (best && bestDiff <= 10) {
    used.add(best.school_id_no);
    resolved.push({ target, stored: best.school_id_no, diff: bestDiff, profile_id: best.profile_id, user_id: best.user_id });
  } else {
    console.log(`  - skip  ${target} (nearest diff ${bestDiff}, beyond 10)`);
  }
}

console.log(`Resolved ${resolved.length} record(s) to delete:`);
for (const r of resolved) console.log(`  ${r.target} -> ${r.stored} (profile ${r.profile_id}, user ${r.user_id}, diff ${r.diff})`);

if (resolved.length > 0 && !DRY_RUN) {
  const userIds = [...new Set(resolved.map((r) => r.user_id))];
  const connection2 = connection;
  await connection2.beginTransaction();
  try {
    await connection2.query(`DELETE FROM sessions WHERE user_id IN (?)`, [userIds]);
    await connection2.query(`DELETE FROM alumni_privacy_settings WHERE user_id IN (?)`, [userIds]);
    await connection2.query(`DELETE FROM alumni_organizations WHERE user_id IN (?)`, [userIds]);
    await connection2.query(`DELETE FROM alumni_employment WHERE user_id IN (?)`, [userIds]);
    await connection2.query(`DELETE FROM alumni_education WHERE user_id IN (?)`, [userIds]);
    await connection2.query(`DELETE FROM alumni_addresses WHERE user_id IN (?)`, [userIds]);
    await connection2.query(`DELETE FROM alumni_profiles WHERE user_id IN (?)`, [userIds]);
    const [delUsers] = await connection2.query(`DELETE FROM users WHERE id IN (?)`, [userIds]);
    console.log(`Deleted ${delUsers.affectedRows} user account(s) (children cascaded/explicit).`);
    await connection2.commit();
  } catch (error) {
    await connection2.rollback();
    throw error;
  }
}

const [after] = await connection.query(
  `SELECT COUNT(*) AS total,
          SUM(p.verification_status = 'verified' AND COALESCE(p.is_deleted, 0) = 0) AS live,
          SUM(p.verification_status = 'verified' AND COALESCE(p.is_deleted, 0) = 0 AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL) AS pinned
     FROM alumni_profiles p`,
);
console.log("After:", JSON.stringify(after[0]));
await connection.end();
