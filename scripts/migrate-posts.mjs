/**
 * Adds the columns used by the Engagement Network post composer
 * (excerpt, job details, images, featured flag) to the `posts` table.
 *
 * Safe to run more than once: every column/index is checked against
 * INFORMATION_SCHEMA first.
 *
 * Usage:
 *   node scripts/migrate-posts.mjs                  # uses .env
 *   ENV_FILE=.env.production node scripts/migrate-posts.mjs   # Aiven / live
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

function isSslEnabled() {
  const raw = (process.env.DB_SSL ?? "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "required";
}

function sslConfig() {
  if (!isSslEnabled()) return {};
  const caBase64 = (process.env.DB_SSL_CA_BASE64 ?? "").trim();
  const caPath = (process.env.DB_SSL_CA_PATH ?? "").trim();
  let ca;
  if (caBase64) ca = Buffer.from(caBase64, "base64").toString("utf8");
  else if (caPath) ca = readFileSync(resolve(root, caPath), "utf8");
  return { ssl: ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: true } };
}

const COLUMNS = [
  { name: "excerpt", definition: "VARCHAR(500) NULL AFTER content" },
  { name: "company", definition: "VARCHAR(255) NULL AFTER posted_at" },
  { name: "location", definition: "VARCHAR(255) NULL AFTER company" },
  { name: "job_type", definition: "VARCHAR(100) NULL AFTER location" },
  { name: "salary", definition: "VARCHAR(160) NULL AFTER job_type" },
  { name: "deadline", definition: "DATE NULL AFTER salary" },
  { name: "qualifications", definition: "TEXT NULL AFTER deadline" },
  { name: "apply_link", definition: "VARCHAR(500) NULL AFTER qualifications" },
  { name: "images", definition: "JSON NULL AFTER apply_link" },
  {
    name: "featured",
    definition: "TINYINT(1) NOT NULL DEFAULT 0 AFTER images",
  },
  {
    name: "updated_by",
    definition: "BIGINT UNSIGNED NULL AFTER created_by",
  },
];

const INDEXES = [{ name: "idx_posts_type", definition: "(type)" }];

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
  console.log(`Migrating posts table in ${process.env.DB_HOST}:${process.env.DB_PORT}/${dbName} (${envFile})`);

  const [[table]] = await connection.execute(
    `SELECT COUNT(*) AS total
       FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'posts'`,
    [dbName],
  );
  if (Number(table?.total ?? 0) === 0) {
    throw new Error("The posts table does not exist. Run `npm run db:setup` first.");
  }

  const [existingColumns] = await connection.execute(
    `SELECT COLUMN_NAME
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'posts'`,
    [dbName],
  );
  const columnNames = new Set(existingColumns.map((row) => row.COLUMN_NAME));

  for (const column of COLUMNS) {
    if (columnNames.has(column.name)) {
      console.log(`  = posts.${column.name} already exists`);
      continue;
    }
    console.log(`  + adding posts.${column.name}`);
    await connection.query(`ALTER TABLE posts ADD COLUMN ${column.name} ${column.definition}`);
  }

  const [existingIndexes] = await connection.execute(
    `SELECT DISTINCT INDEX_NAME
       FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'posts'`,
    [dbName],
  );
  const indexNames = new Set(existingIndexes.map((row) => row.INDEX_NAME));

  for (const index of INDEXES) {
    if (indexNames.has(index.name)) {
      console.log(`  = posts.${index.name} already exists`);
      continue;
    }
    console.log(`  + adding posts.${index.name}`);
    await connection.query(`ALTER TABLE posts ADD KEY ${index.name} ${index.definition}`);
  }

  // Give seeded posts a readable summary and keep the existing job example useful.
  const [excerpts] = await connection.execute(
    `UPDATE posts
        SET excerpt = LEFT(TRIM(content), 240)
      WHERE (excerpt IS NULL OR excerpt = '')
        AND content IS NOT NULL
        AND TRIM(content) <> ''`,
  );
  console.log(`  ✓ backfilled excerpt on ${excerpts.affectedRows} post(s)`);

  const [jobs] = await connection.execute(
    `UPDATE posts
        SET company = COALESCE(NULLIF(company, ''), 'Accenture Philippines'),
            location = COALESCE(NULLIF(location, ''), 'Taguig City, NCR'),
            job_type = COALESCE(NULLIF(job_type, ''), 'Full-time'),
            salary = COALESCE(NULLIF(salary, ''), 'PHP 35,000 – 45,000 / month'),
            apply_link = COALESCE(
              NULLIF(apply_link, ''),
              'https://careers.accenture.com/ph/junior-software-developer'
            )
      WHERE type = 'Job Offering'
        AND title LIKE 'Junior Software Developer%'
        AND (company IS NULL OR location IS NULL OR job_type IS NULL)`,
  );
  if (jobs.affectedRows > 0) console.log(`  ✓ backfilled job details on ${jobs.affectedRows} post(s)`);

  const [rows] = await connection.execute(
    `SELECT COUNT(*) AS total,
            SUM(status = 'Published') AS published,
            SUM(JSON_LENGTH(COALESCE(images, JSON_ARRAY())) > 0) AS with_images
       FROM posts`,
  );
  const summary = rows[0];
  console.log(
    `\nDone. posts: ${summary.total} total · ${summary.published ?? 0} published · ${
      summary.with_images ?? 0
    } with images.`,
  );
} finally {
  await connection.end();
}
