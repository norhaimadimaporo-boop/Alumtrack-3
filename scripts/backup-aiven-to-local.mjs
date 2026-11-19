#!/usr/bin/env node
/**
 * Self-contained Aiven MySQL -> local SQL backup generator.
 *
 * Uses the project's mysql2 driver (no mysqldump required on Windows) and
 * mirrors the SSL/TLS setup used by src/lib/db.server.ts. The resulting file
 * is ready to import through MySQL Workbench.
 *
 * Usage:  node scripts/backup-aiven-to-local.mjs
 * Output: backups/alumtrack_aiven_live_backup.sql
 *
 * The dump is gitignored; never commit it.
 */

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const mysql = require("mysql2/promise");

const OUTPUT_DIR = path.resolve("backups");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "alumtrack_aiven_live_backup.sql");
const LOCAL_DATABASE = "alumtrack_local";
const BATCH_SIZE = 100;

/** Load env files without printing values. Earlier files win on duplicates. */
function loadEnv() {
  const files = [".env.local", ".env", ".env.production"];
  for (const file of files) {
    const full = path.resolve(file);
    if (!fs.existsSync(full)) continue;
    const text = fs.readFileSync(full, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
      if (!match) continue;
      const key = match[1];
      if (process.env[key] !== undefined) continue;
      let value = match[2] ?? "";
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value.replace(/\\n/g, "\n");
    }
  }
}

function sslConfig() {
  const raw = String(process.env["DB_SSL"] ?? "")
    .trim()
    .toLowerCase();
  const enabled = ["1", "true", "yes", "required"].includes(raw);
  if (!enabled) return {};

  const base64 = process.env["DB_SSL_CA_BASE64"]?.trim();
  const caPath = process.env["DB_SSL_CA_PATH"]?.trim();
  let ca = base64 ? Buffer.from(base64, "base64").toString("utf8") : undefined;
  if (!ca && caPath && fs.existsSync(caPath)) {
    ca = fs.readFileSync(caPath, "utf8");
  }
  return { ssl: ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: true } };
}

function escapeString(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "''")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\0/g, "\\0")
    .replace(/\x1a/g, "\\Z");
}

function sqlValue(value) {
  if (value === null || value === undefined) return "NULL";
  if (Buffer.isBuffer(value)) return `0x${value.toString("hex")}`;
  if (value instanceof Date) {
    return `'${value.toISOString().slice(0, 19).replace("T", " ")}'`;
  }
  if (typeof value === "object") return `'${escapeString(JSON.stringify(value))}'`;
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  return `'${escapeString(value)}'`;
}

function quoteIdentifier(name) {
  return `\`${String(name).replace(/`/g, "``")}\``;
}

async function main() {
  loadEnv();

  const dbName = process.env["DB_NAME"];
  if (!dbName) throw new Error("Missing DB_NAME. Check .env / .env.local / .env.production.");

  const connection = await mysql.createConnection({
    host: process.env["DB_HOST"] ?? "127.0.0.1",
    port: Number(process.env["DB_PORT"] ?? 3306),
    user: process.env["DB_USER"] ?? "",
    password: process.env["DB_PASSWORD"] ?? "",
    database: dbName,
    charset: "utf8mb4",
    timezone: "Z",
    ...sslConfig(),
  });

  await connection.query("SET time_zone = '+00:00'");
  await connection.query("SET SESSION sql_mode = ''");

  const [tableRows] = await connection.query(
    `SELECT TABLE_NAME FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME`,
    [dbName],
  );
  const tables = tableRows.map((row) => row.TABLE_NAME);

  const [triggerRows] = await connection.query(
    `SELECT TRIGGER_NAME FROM information_schema.TRIGGERS
      WHERE TRIGGER_SCHEMA = ? ORDER BY TRIGGER_NAME`,
    [dbName],
  );
  const triggers = triggerRows.map((row) => row.TRIGGER_NAME);

  const chunks = [];
  const counts = {};
  let totalRows = 0;

  const push = (text) => chunks.push(text);

  push("-- AlumTrack live Aiven MySQL backup\n");
  push(`-- Generated: ${new Date().toISOString()}\n`);
  push("-- Import in MySQL Workbench: Server > Data Import > Import from Self-Contained File\n\n");
  push("SET NAMES utf8mb4;\n");
  push("SET FOREIGN_KEY_CHECKS = 0;\n\n");
  push(
    `CREATE DATABASE IF NOT EXISTS ${quoteIdentifier(LOCAL_DATABASE)} ` +
      `CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\n`,
  );
  push(`USE ${quoteIdentifier(LOCAL_DATABASE)};\n\n`);

  for (const table of tables) {
    const qTable = quoteIdentifier(table);
    const [createRows] = await connection.query("SHOW CREATE TABLE ??", [table]);
    const ddl = createRows[0]?.["Create Table"] ?? createRows[0]?.["Create View"];
    if (!ddl) throw new Error(`Could not read DDL for table ${table}`);

    push(`-- ------------------------------------------------------------\n`);
    push(`-- Table: ${table}\n`);
    push(`DROP TABLE IF EXISTS ${qTable};\n`);
    push(`${ddl};\n\n`);

    const [columnRows] = await connection.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION`,
      [dbName, table],
    );
    const columns = columnRows.map((row) => row.COLUMN_NAME);

    const [rows] = await connection.query(`SELECT * FROM ${qTable}`);
    counts[table] = rows.length;
    totalRows += rows.length;

    if (rows.length > 0 && columns.length > 0) {
      const columnList = columns.map(quoteIdentifier).join(", ");
      for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
        const batch = rows.slice(offset, offset + BATCH_SIZE);
        const values = batch
          .map((row) => `(${columns.map((column) => sqlValue(row[column])).join(",")})`)
          .join(",\n");
        push(`INSERT INTO ${qTable} (${columnList}) VALUES\n${values};\n\n`);
      }
    }
  }

  if (triggers.length > 0) {
    push("-- ------------------------------------------------------------\n");
    push("-- Triggers\n");
    push("DELIMITER ;;\n");
    for (const trigger of triggers) {
      const [rows] = await connection.query("SHOW CREATE TRIGGER ??", [trigger]);
      const statement = rows[0]?.["SQL Original Statement"];
      if (statement) push(`${statement};;\n\n`);
    }
    push("DELIMITER ;\n\n");
  }

  push("SET FOREIGN_KEY_CHECKS = 1;\n");
  await connection.end();

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, chunks.join(""), "utf8");

  const gitignore = fs.existsSync(".gitignore") ? fs.readFileSync(".gitignore", "utf8") : "";
  const ignored = gitignore.split(/\r?\n/).some((line) => {
    const trimmed = line.trim();
    return trimmed === "backups/" || trimmed === "backups" || trimmed === "backups/*.sql";
  });

  console.log(`Backup written: ${OUTPUT_FILE}`);
  console.log(`Size: ${(fs.statSync(OUTPUT_FILE).size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Tables: ${tables.length}, Triggers: ${triggers.length}, Total rows: ${totalRows}`);
  for (const [table, count] of Object.entries(counts)) {
    console.log(`  ${table}: ${count}`);
  }
  console.log(`backups/ in .gitignore: ${ignored ? "yes" : "NO - add it before committing"}`);
}

main().catch((error) => {
  console.error("Backup failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
