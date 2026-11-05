/**
 * Mirrors the hosted (Aiven) database down onto the local MySQL database.
 *
 * This is the opposite direction of `scripts/sync-databases.mjs`:
 *   • Source = `.env.production` (Aiven)
 *   • Destination = `.env` (local MySQL used by MySQL Workbench)
 *
 * Usage:
 *   node scripts/pull-databases.mjs            # report only (row counts + diff)
 *   node scripts/pull-databases.mjs --apply    # backup local, dump Aiven, import locally
 *
 * Flags:
 *   --source=<file>  use another env file for the source (default `.env.production`)
 *   --prune          drop local tables that do not exist in the source (full mirror)
 *
 * `--apply` always writes a timestamped dump of the local database to
 * `.backups/local-before-pull-<stamp>.sql` before changing anything.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const apply = process.argv.includes("--apply");
const prune = process.argv.includes("--prune");
const sourceArg = process.argv.find((arg) => arg.startsWith("--source="));
const destEnvFile = resolve(root, ".env");
const sourceEnvFile = resolve(
  root,
  sourceArg ? sourceArg.slice("--source=".length) : ".env.production",
);

/** Reads a .env file into a plain object (BOM- and quote-tolerant). */
function parseEnvFile(path) {
  const values = {};
  if (!existsSync(path)) return values;

  const text = readFileSync(path, "utf8").replace(/^\uFEFF/, "");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

const source = parseEnvFile(sourceEnvFile);
const destination = parseEnvFile(destEnvFile);

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "0.0.0.0"]);

if (!source.DB_NAME || !source.DB_HOST) {
  console.error(`Missing DB_NAME/DB_HOST in ${sourceEnvFile}.`);
  process.exit(1);
}
if (!destination.DB_NAME || !destination.DB_HOST) {
  console.error(`Missing DB_NAME/DB_HOST in ${destEnvFile}.`);
  process.exit(1);
}
if (LOCAL_HOSTS.has(source.DB_HOST)) {
  console.error(
    `Refusing to pull from a local host ("${source.DB_HOST}"). Point --source at the hosted database.`,
  );
  process.exit(1);
}
if (!LOCAL_HOSTS.has(destination.DB_HOST)) {
  console.error(
    `Refusing to overwrite a non-local database ("${destination.DB_HOST}"). This script only writes to localhost.`,
  );
  process.exit(1);
}

const sslEnabled = (env) =>
  ["1", "true", "yes", "required"].includes((env.DB_SSL ?? "").trim().toLowerCase());

function readCa(env) {
  const caBase64 = (env.DB_SSL_CA_BASE64 ?? "").trim();
  const caPath = (env.DB_SSL_CA_PATH ?? "").trim();
  if (caBase64) return Buffer.from(caBase64, "base64").toString("utf8");
  if (caPath) return readFileSync(resolve(root, caPath), "utf8");
  return undefined;
}

function connectionOptions(env) {
  const ca = sslEnabled(env) ? readCa(env) : undefined;
  return {
    host: env.DB_HOST,
    port: Number(env.DB_PORT ?? 3306),
    user: env.DB_USER,
    password: env.DB_PASSWORD ?? "",
    database: env.DB_NAME,
    charset: "utf8mb4",
    ...(ca
      ? { ssl: { ca, rejectUnauthorized: true } }
      : sslEnabled(env)
        ? { ssl: { rejectUnauthorized: true } }
        : {}),
  };
}

async function tableReport(env, label) {
  const connection = await mysql.createConnection(connectionOptions(env));
  try {
    const [rows] = await connection.query(
      `SELECT TABLE_NAME AS name, TABLE_TYPE AS type
         FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = ?
        ORDER BY TABLE_NAME`,
      [env.DB_NAME],
    );
    const tables = [];
    for (const row of rows) {
      const [count] = await connection.query(
        `SELECT COUNT(*) AS n FROM \`${row.name.replaceAll("`", "``")}\``,
      );
      tables.push({ name: row.name, type: row.type, rows: Number(count[0].n) });
    }
    console.log(`\n${label} — ${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}`);
    if (tables.length === 0) console.log("  (no tables)");
    for (const table of tables) {
      console.log(
        `  ${table.name.padEnd(32)} ${String(table.rows).padStart(6)} rows${
          table.type === "VIEW" ? "  (view)" : ""
        }`,
      );
    }
    return tables;
  } finally {
    await connection.end();
  }
}

/** Content fingerprint per base table, so equal row counts cannot hide drift. */
function serializeCell(value) {
  if (value === null) return null;
  if (value instanceof Date) return value.toISOString();
  if (Buffer.isBuffer(value)) return `b64:${value.toString("base64")}`;
  if (typeof value === "bigint") return value.toString();
  return value;
}

async function tableFingerprints(env) {
  const connection = await mysql.createConnection({
    ...connectionOptions(env),
    // TIMESTAMP columns are rendered in the session time zone, so compare the
    // raw UTC strings instead of JS Date objects (Aiven defaults to UTC).
    dateStrings: true,
  });
  try {
    await connection.query("SET time_zone = '+00:00'");
    const [tables] = await connection.query(
      `SELECT TABLE_NAME AS name
         FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
        ORDER BY TABLE_NAME`,
      [env.DB_NAME],
    );
    const fingerprints = new Map();
    for (const table of tables) {
      const escaped = table.name.replaceAll("`", "``");
      const [[count]] = await connection.query(`SELECT COUNT(*) AS n FROM \`${escaped}\``);
      const total = Number(count.n);
      // Version-independent: hash sorted row representations instead of
      // CHECKSUM TABLE, which can differ between server versions.
      if (total > 50_000) {
        fingerprints.set(table.name, `rows:${total}`);
        continue;
      }
      const [rows] = await connection.query(`SELECT * FROM \`${escaped}\``);
      const lines = rows
        .map((row) =>
          JSON.stringify(
            Object.keys(row)
              .sort()
              .map((key) => [key, serializeCell(row[key])]),
          ),
        )
        .sort();
      fingerprints.set(
        table.name,
        createHash("sha256").update(lines.join("\n")).digest("hex"),
      );
    }
    return fingerprints;
  } finally {
    await connection.end();
  }
}

/** Builds a temporary MySQL option file so passwords never hit the CLI args. */
function optionFile(env, { dump = false } = {}) {
  const path = resolve(tmpdir(), `alumtrack-pull-${process.pid}-${Date.now()}-${Math.random()}.cnf`);
  const lines = [
    "[client]",
    `host=${env.DB_HOST}`,
    `port=${env.DB_PORT ?? 3306}`,
    `user=${env.DB_USER}`,
    `password="${(env.DB_PASSWORD ?? "").replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`,
  ];

  if (sslEnabled(env)) {
    const caPath = (env.DB_SSL_CA_PATH ?? "").trim();
    lines.push("ssl-mode=VERIFY_IDENTITY");
    if (caPath) lines.push(`ssl-ca=${resolve(root, caPath).replaceAll("\\", "/")}`);
  }
  if (dump) lines.push("column-statistics=0");

  writeFileSync(path, `${lines.join("\n")}\n`, { mode: 0o600 });
  return path;
}

function fail(message, result) {
  console.error(`\n${message}`);
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
  if (output) console.error(output.split("\n").slice(-12).join("\n"));
  process.exit(1);
}

const sourceTables = await tableReport(source, "Source database (Aiven)");
const destTables = await tableReport(destination, "Local database");

const sourceNames = new Set(sourceTables.map((table) => table.name));
const destNames = new Set(destTables.map((table) => table.name));
const missingLocally = [...sourceNames].filter((name) => !destNames.has(name));
const extraLocally = [...destNames].filter((name) => !sourceNames.has(name));

console.log("\n--- Comparison ---");
console.log(
  `Source tables: ${sourceNames.size} · Local tables: ${destNames.size} · Will be created: ${missingLocally.length} · Local-only: ${extraLocally.length}`,
);
if (missingLocally.length > 0) console.log(`Will be created locally: ${missingLocally.join(", ")}`);
if (extraLocally.length > 0) console.log(`Local-only tables: ${extraLocally.join(", ")}`);

if (!apply) {
  console.log("\nReport only. Run `npm run db:pull -- --apply` to copy the source into local.");
  process.exit(0);
}

// --- Apply ---
const backupDir = resolve(root, ".backups");
mkdirSync(backupDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const localBackupFile = resolve(backupDir, `local-before-pull-${stamp}.sql`);

const sourceOptions = optionFile(source, { dump: true });
const sourceClientOptions = optionFile(source);
const destOptions = optionFile(destination, { dump: true });
const destClientOptions = optionFile(destination);
/** Snapshot taken just before the dump; compared after the import. */
let sourceFingerprints = new Map();

try {
  console.log(`\nBacking up the local database to ${localBackupFile}…`);
  {
    const stream = spawnSync(
      "mysqldump",
      [
        `--defaults-extra-file=${destOptions}`,
        "--single-transaction",
        "--quick",
        "--skip-lock-tables",
        "--set-gtid-purged=OFF",
        "--no-tablespaces",
        "--skip-extended-insert",
        "--hex-blob",
        "--default-character-set=utf8mb4",
        "--routines",
        "--triggers",
        destination.DB_NAME,
      ],
      { cwd: root, encoding: "buffer", maxBuffer: 1024 * 1024 * 256 },
    );
    if (stream.status !== 0) {
      fail("Local backup failed. Nothing was changed.", {
        stdout: stream.stdout?.toString(),
        stderr: stream.stderr?.toString(),
      });
    }
    writeFileSync(localBackupFile, stream.stdout);
    console.log(`  ✓ Backup written (${Math.round(stream.stdout.length / 1024)} KB)`);
  }

  console.log("\nFingerprinting the source data…");
  sourceFingerprints = await tableFingerprints(source);

  console.log("\nDumping the Aiven database…");
  const dump = spawnSync(
    "mysqldump",
    [
      `--defaults-extra-file=${sourceOptions}`,
      "--single-transaction",
      "--quick",
      "--skip-lock-tables",
      "--set-gtid-purged=OFF",
      "--no-tablespaces",
      "--skip-extended-insert",
      "--hex-blob",
      "--default-character-set=utf8mb4",
      "--routines",
      "--triggers",
      source.DB_NAME,
    ],
    { cwd: root, encoding: "buffer", maxBuffer: 1024 * 1024 * 256 },
  );
  if (dump.status !== 0) {
    fail("Source dump failed. Nothing was imported.", {
      stdout: dump.stdout?.toString(),
      stderr: dump.stderr?.toString(),
    });
  }
  console.log(`  ✓ Dump received (${Math.round(dump.stdout.length / 1024)} KB)`);

  if (extraLocally.length > 0) {
    if (prune) {
      console.log(`\nDropping ${extraLocally.length} local-only table(s)…`);
      const connection = await mysql.createConnection(connectionOptions(destination));
      try {
        await connection.query("SET FOREIGN_KEY_CHECKS = 0");
        for (const name of extraLocally) {
          await connection.query(`DROP TABLE IF EXISTS \`${name.replaceAll("`", "``")}\``);
          console.log(`  ✓ dropped ${name}`);
        }
        await connection.query("SET FOREIGN_KEY_CHECKS = 1");
      } finally {
        await connection.end();
      }
    } else {
      console.log(
        `\nKeeping ${extraLocally.length} local-only table(s): ${extraLocally.join(", ")}. Use --prune to drop them.`,
      );
    }
  }

  console.log("\nImporting into the local database…");
  const importResult = spawnSync(
    "mysql",
    [
      `--defaults-extra-file=${destClientOptions}`,
      "--default-character-set=utf8mb4",
      "--binary-mode",
      destination.DB_NAME,
    ],
    { cwd: root, input: dump.stdout, encoding: "buffer", maxBuffer: 1024 * 1024 * 256 },
  );
  if (importResult.status !== 0) {
    fail(`Import failed. The previous local data is in ${localBackupFile}.`, {
      stdout: importResult.stdout?.toString(),
      stderr: importResult.stderr?.toString(),
    });
  }
  console.log("  ✓ Import finished");
} finally {
  for (const path of [sourceOptions, sourceClientOptions, destOptions, destClientOptions]) {
    try {
      rmSync(path, { force: true });
    } catch {
      // ignore cleanup failures
    }
  }
}

const after = await tableReport(destination, "Local database after pull");
const afterCounts = new Map(after.map((table) => [table.name, table.rows]));
const localFingerprints = await tableFingerprints(destination);

const rowMismatches = sourceTables.filter((table) => afterCounts.get(table.name) !== table.rows);
const dataMismatches = [...sourceNames].filter(
  (name) =>
    sourceFingerprints.get(name) !== undefined &&
    sourceFingerprints.get(name) !== localFingerprints.get(name),
);

console.log("\n--- Verification ---");
if (rowMismatches.length === 0) {
  console.log("✓ Row counts match for every table in the source.");
} else {
  for (const table of rowMismatches) {
    console.error(
      `✗ ${table.name}: source ${table.rows} vs local ${afterCounts.get(table.name) ?? "missing"}`,
    );
  }
}
if (dataMismatches.length === 0) {
  console.log("✓ Table contents match the source byte for byte (per-row fingerprints).");
} else {
  for (const name of dataMismatches) {
    console.error(`✗ ${name}: local contents differ from the source snapshot.`);
  }
}
if (rowMismatches.length > 0 || dataMismatches.length > 0) {
  console.error(`Local backup: ${localBackupFile}`);
  process.exit(1);
}
console.log(`Local backup of the previous data: ${localBackupFile}`);
