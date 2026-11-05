/**
 * Pushes the production database settings to the linked Vercel project.
 *
 * Usage:
 *   1. npx vercel link --yes --project alumtrack
 *   2. Create `.env.production` from `.env.production.example`.
 *   3. npm run deploy:env
 *
 * Pass `--dry-run` to print what would be uploaded without touching Vercel.
 * Values are sent over stdin so passwords never appear in the shell history.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { loadEnvFile } from "./load-env.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dryRun = process.argv.includes("--dry-run");
const envFileArg = process.argv.find((arg) => arg.startsWith("--env-file="));
const envFile = resolve(
  root,
  envFileArg ? envFileArg.slice("--env-file=".length) : ".env.production",
);

const REQUIRED = ["DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD", "DB_NAME"];
const OPTIONAL = ["DB_SSL", "DB_CONNECTION_LIMIT", "DB_SSL_CA_BASE64"];

if (!existsSync(envFile)) {
  console.error(`Missing ${envFile}.`);
  console.error("Copy .env.production.example to .env.production and fill in the Aiven values.");
  process.exit(1);
}

loadEnvFile(envFile);

// Aiven hands out a ca.pem file. Accept its path and convert it to the
// base64 form that the app (and Vercel env vars) expect.
if (!process.env.DB_SSL_CA_BASE64 && process.env.DB_SSL_CA_PATH) {
  const caPath = isAbsolute(process.env.DB_SSL_CA_PATH)
    ? process.env.DB_SSL_CA_PATH
    : resolve(root, process.env.DB_SSL_CA_PATH);
  if (!existsSync(caPath)) {
    console.error(`DB_SSL_CA_PATH points to a missing file: ${caPath}`);
    process.exit(1);
  }
  process.env.DB_SSL_CA_BASE64 = (await readFile(caPath)).toString("base64");
  console.log(`Encoded CA certificate from ${caPath}`);
}

const missing = REQUIRED.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`Missing required values in ${envFile}: ${missing.join(", ")}`);
  process.exit(1);
}

const localHosts = new Set(["127.0.0.1", "localhost", "::1", "0.0.0.0"]);
if (localHosts.has(process.env.DB_HOST.trim())) {
  console.error(
    `DB_HOST is "${process.env.DB_HOST}", which Vercel cannot reach. Use the public host from Aiven.`,
  );
  process.exit(1);
}

if (process.env.DB_SSL === "true" && !process.env.DB_SSL_CA_BASE64) {
  console.warn(
    "Warning: DB_SSL=true without DB_SSL_CA_BASE64. Aiven uses a private CA, so TLS will fail unless the CA is provided.",
  );
}

const entries = [...REQUIRED, ...OPTIONAL]
  .filter((key) => process.env[key] !== undefined && process.env[key] !== "")
  .map((key) => [key, process.env[key]]);

if (dryRun) {
  console.log(`\nDry run — ${entries.length} variables from ${envFile}:`);
  for (const [key, value] of entries) {
    const shown = /PASSWORD|CA_BASE64/.test(key) ? `(hidden, ${value.length} chars)` : value;
    console.log(`  ${key}=${shown}`);
  }
  process.exit(0);
}

console.log(`\nUploading ${entries.length} variables to Vercel (production)…`);
let failed = 0;

for (const [key, value] of entries) {
  const args = [
    "--yes",
    "vercel@latest",
    "env",
    "add",
    key,
    "--environment",
    "production",
    "--sensitive",
    "--force",
    "--yes",
  ].join(" ");

  const result = spawnSync("cmd.exe", ["/d", "/s", "/c", `npx ${args}`], {
    cwd: root,
    input: `${value}\n`,
    encoding: "utf8",
  });

  if (result.status === 0) {
    console.log(`  ✓ ${key}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${key}`);
    console.error((result.stderr || result.stdout || "").trim().split("\n").slice(-4).join("\n"));
  }
}

if (failed > 0) {
  console.error(`\n${failed} variable(s) failed. Fix the errors above and run the command again.`);
  process.exit(1);
}

console.log("\nDone. Deploy with: npx vercel deploy --prod --yes");
