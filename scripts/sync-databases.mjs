/**
 * Mirrors the local MySQL database onto the hosted (Aiven) database.
 *
 * Usage:
 *   node scripts/sync-databases.mjs --report   # show tables and row counts
 *   node scripts/sync-databases.mjs --apply    # dump local → import to target
 *
 * Local credentials come from `.env`; the target credentials come from
 * `.env.production` (override with `--target=<file>`). `--apply` always writes
 * a timestamped backup of the target to `.backups/` first.
 *
 * Flags:
 *   --prune   drop target tables that do not exist locally (full mirror)
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const apply = process.argv.includes("--apply");
const report = process.argv.includes("--report") || !apply;
const prune = process.argv.includes("--prune");
const targetArg = process.argv.find((arg) => arg.startsWith("--target="));
const localEnvFile = resolve(root, ".env");
const targetEnvFile = resolve(root, targetArg ? targetArg.slice("--target=".length) : ".env.production");

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

const local = parseEnvFile(localEnvFile);
const target = parseEnvFile(targetEnvFile);

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "0.0.0.0"]);
const TARGET_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "0.0.0.0"]);

if (!local.DB_NAME || !target.DB_NAME) {
  console.error(`Missing DB_NAME in ${existsSync(localEnvFile) ? localEnvFile : "local env"}.`);
  process.exit(1);
}
if (!target.DB_HOST || TARGET_HOSTS.has(target.DB_HOST)) {
  console.error(`Target DB_HOST must be the public Aiven host, got "${target.DB_HOST ?? ""}".`);
  process.exit(1);
}
if (LOCAL_HOSTS.has(local.DB_HOST) === false) {
  console.warn(`Warning: local DB_HOST is "${local.DB_HOST}", not localhost.`);
}

function connectionOptions(env, isTarget) {
  const sslEnabled = ["1", "true", "yes", "required"].includes(
    (env.DB_SSL ?? "").trim().toLowerCase(),
  );
  const caBase64 = (env.DB_SSL_CA_BASE64 ?? "").trim();
  const caPath = (env.DB_SSL_CA_PATH ?? "").trim();
  let ca;
  if (caBase64) ca = Buffer.from(caBase64, "base64").toString("utf8");
  else if (caPath) ca = readFileSync(resolve(root, caPath), "utf8");

  return {
    host: env.DB_HOST,
    port: Number(env.DB_PORT ?? 3306),
    user: env.DB_USER,
    password: env.DB_PASSWORD ?? "",
    database: env.DB_NAME,
    charset: "utf8mb4",
    ...(sslEnabled && isTarget
      ? { ssl: ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: true } }
      : {}),
  };
}

async function tableReport(env, label, isTarget) {
  const connection = await mysql.createConnection(connectionOptions(env, isTarget));
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

/** Builds a temporary MySQL option file so passwords never hit the CLI args. */
function optionFile(env, isTarget, { dump = false } = {}) {
  const path = resolve(tmpdir(), `alumtrack-${process.pid}-${Date.now()}-${Math.random()}.cnf`);
  const lines = [
    "[client]",
    `host=${env.DB_HOST}`,
    `port=${env.DB_PORT ?? 3306}`,
    `user=${env.DB_USER}`,
    `password="${(env.DB_PASSWORD ?? "").replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`,
  ];

  const sslEnabled = ["1", "true", "yes", "required"].includes(
    (env.DB_SSL ?? "").trim().toLowerCase(),
  );
  if (sslEnabled && isTarget) {
    lines.push("ssl-mode=VERIFY_IDENTITY");
    const caPath = (env.DB_SSL_CA_PATH ?? "").trim();
    if (caPath) lines.push(`ssl-ca=${resolve(root, caPath).replaceAll("\\", "/")}`);
  }
  if (dump) lines.push("column-statistics=0");

  writeFileSync(path, `${lines.join("\n")}\n`, { mode: 0o600 });
  return path;
}

function run(command, args, stdio = "pipe") {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8", stdio });
  return result;
}

function fail(message, result) {
  console.error(`\n${message}`);
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
  if (output) console.error(output.split("\n").slice(-12).join("\n"));
  process.exit(1);
}

const localTables = await tableReport(local, "Local database", false);
const targetTables = await tableReport(target, "Target database", true);

const localNames = new Set(localTables.map((table) => table.name));
const targetNames = new Set(targetTables.map((table) => table.name));
const missingOnTarget = [...localNames].filter((name) => !targetNames.has(name));
const extraOnTarget = [...targetNames].filter((name) => !localNames.has(name));

console.log("\n--- Comparison ---");
console.log(
  `Local tables: ${localNames.size} · Target tables: ${targetNames.size} · Missing on target: ${missingOnTarget.length} · Extra on target: ${extraOnTarget.length}`,
);
if (missingOnTarget.length > 0) console.log(`Missing on target: ${missingOnTarget.join(", ")}`);
if (extraOnTarget.length > 0) console.log(`Extra on target: ${extraOnTarget.join(", ")}`);

if (!apply) {
  console.log("\nReport only. Run with --apply to mirror local → target.");
  process.exit(0);
}

// --- Apply ---
const backupDir = resolve(root, ".backups");
mkdirSync(backupDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupFile = resolve(backupDir, `target-${stamp}.sql`);
const dumpFile = resolve(backupDir, `local-${stamp}.sql`);

const targetOptions = optionFile(target, true, { dump: true });
const targetClientOptions = optionFile(target, true);
const localOptions = optionFile(local, false, { dump: true });

try {
  console.log(`\nBacking up target database to ${backupFile}…`);
  {
    const stream = spawnSync(
      "mysqldump",
      [
        `--defaults-extra-file=${targetOptions}`,
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
        target.DB_NAME,
      ],
      { cwd: root, encoding: "buffer", maxBuffer: 1024 * 1024 * 256 },
    );
    if (stream.status !== 0) {
      fail("Target backup failed. Nothing was changed.", {
        stdout: stream.stdout?.toString(),
        stderr: stream.stderr?.toString(),
      });
    }
    writeFileSync(backupFile, stream.stdout);
    console.log(`  ✓ Backup written (${Math.round(stream.stdout.length / 1024)} KB)`);
  }

  if (prune && extraOnTarget.length > 0) {
    console.log(`\nDropping ${extraOnTarget.length} target-only table(s)…`);
    const connection = await mysql.createConnection(connectionOptions(target, true));
    try {
      await connection.query("SET FOREIGN_KEY_CHECKS = 0");
      for (const name of extraOnTarget) {
        await connection.query(`DROP TABLE IF EXISTS \`${name.replaceAll("`", "``")}\``);
        console.log(`  ✓ dropped ${name}`);
      }
      await connection.query("SET FOREIGN_KEY_CHECKS = 1");
    } finally {
      await connection.end();
    }
  } else if (extraOnTarget.length > 0) {
    console.log(
      `\nKeeping ${extraOnTarget.length} target-only table(s): ${extraOnTarget.join(", ")}. Use --prune to drop them.`,
    );
  }

  console.log(`\nDumping local database to ${dumpFile}…`);
  const dump = spawnSync(
    "mysqldump",
    [
      `--defaults-extra-file=${localOptions}`,
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
      local.DB_NAME,
    ],
    { cwd: root, encoding: "buffer", maxBuffer: 1024 * 1024 * 256 },
  );
  if (dump.status !== 0) {
    fail("Local dump failed. Nothing was imported.", {
      stdout: dump.stdout?.toString(),
      stderr: dump.stderr?.toString(),
    });
  }
  writeFileSync(dumpFile, dump.stdout);
  console.log(`  ✓ Dump written (${Math.round(dump.stdout.length / 1024)} KB)`);

  console.log("\nImporting into the target database…");
  const importResult = spawnSync(
    "mysql",
    [
      `--defaults-extra-file=${targetClientOptions}`,
      "--default-character-set=utf8mb4",
      "--binary-mode",
      target.DB_NAME,
    ],
    { cwd: root, input: dump.stdout, encoding: "buffer", maxBuffer: 1024 * 1024 * 256 },
  );
  if (importResult.status !== 0) {
    fail(`Import failed. The previous target data is in ${backupFile}.`, {
      stdout: importResult.stdout?.toString(),
      stderr: importResult.stderr?.toString(),
    });
  }
  console.log("  ✓ Import finished");
} finally {
  for (const path of [localOptions, targetOptions, targetClientOptions]) {
    try {
      rmSync(path, { force: true });
    } catch {
      // ignore cleanup failures
    }
  }
}

const after = await tableReport(target, "Target database after sync", true);
const afterCounts = new Map(after.map((table) => [table.name, table.rows]));
const mismatches = localTables.filter((table) => afterCounts.get(table.name) !== table.rows);

console.log("\n--- Verification ---");
if (mismatches.length === 0) {
  console.log("✓ Row counts match for every table.");
} else {
  for (const table of mismatches) {
    console.error(
      `✗ ${table.name}: local ${table.rows} vs target ${afterCounts.get(table.name) ?? "missing"}`,
    );
  }
  console.error(`Target backup: ${backupFile}`);
  process.exit(1);
}
