/**
 * Minimal .env loader shared by the setup/deploy scripts.
 *
 * Node's `process.loadEnvFile` rejects files that start with a UTF-8 BOM
 * (Windows PowerShell's `Set-Content -Encoding utf8` writes one), so parse the
 * file ourselves. Values already present in `process.env` win, matching the
 * behaviour of `--env-file`.
 */
import { existsSync, readFileSync } from "node:fs";

export function loadEnvFile(path) {
  if (!existsSync(path)) return false;

  const text = readFileSync(path, "utf8").replace(/^\uFEFF/, "");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separator = line.indexOf("=");
    if (separator === -1) continue;

    const key = line.slice(0, separator).trim();
    if (!key || process.env[key] !== undefined) continue;

    let value = line.slice(separator + 1).trim();
    const quoted =
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"));
    if (quoted) value = value.slice(1, -1);

    process.env[key] = value;
  }

  return true;
}
