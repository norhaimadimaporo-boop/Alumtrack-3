import mysql from "mysql2/promise";

type Pool = ReturnType<typeof mysql.createPool>;

// Reuse one pool across Vite HMR reloads in development.
const globalForDb = globalThis as unknown as { alumtrackPool?: Pool };

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable "${name}". Copy .env.example to .env and fill in your MySQL credentials.`,
    );
  }
  return value;
}

function isSslEnabled(): boolean {
  const raw = process.env["DB_SSL"]?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "required";
}

/**
 * Hosted MySQL providers such as Aiven use a private CA, so allow the PEM to
 * be supplied as base64 (env-safe for Vercel). Falls back to the system trust
 * store for providers with publicly trusted certificates.
 */
function sslConfig(): { ssl?: { ca?: string; rejectUnauthorized: boolean } } {
  if (!isSslEnabled()) return {};
  const caBase64 = process.env["DB_SSL_CA_BASE64"]?.trim();
  const ca = caBase64 ? Buffer.from(caBase64, "base64").toString("utf8") : undefined;
  return { ssl: ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: true } };
}

function connectionLimit(): number {
  const parsed = Number(process.env["DB_CONNECTION_LIMIT"] ?? 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 10;
}

export function getPool(): Pool {
  if (!globalForDb.alumtrackPool) {
    const pool = mysql.createPool({
      host: process.env["DB_HOST"] ?? "127.0.0.1",
      port: Number(process.env["DB_PORT"] ?? 3306),
      user: required("DB_USER"),
      password: process.env["DB_PASSWORD"] ?? "",
      database: required("DB_NAME"),
      charset: "utf8mb4",
      timezone: "Z",
      waitForConnections: true,
      // Serverless platforms (Vercel) spin up many short-lived instances, so
      // keep DB_CONNECTION_LIMIT small there to avoid exhausting the host.
      connectionLimit: connectionLimit(),
      queueLimit: 0,
      ...sslConfig(),
    });

    // Pin every pooled connection to UTC so timestamps are interpreted the
    // same way on every host. Local MySQL runs with SYSTEM=Asia/Manila while
    // Aiven runs with SYSTEM=UTC: without this, a TIMESTAMP string sent in
    // the session zone (Manila wall time locally) is parsed by mysql2
    // (`timezone: "Z"`) as UTC, then `manilaClock()` adds another +8h — the
    // Activity History times showed ~08:52 for a login that really happened
    // at 00:52 Manila time. Forcing `time_zone = '+00:00'` makes
    // TIMESTAMP values arrive as UTC wall time on both hosts, so mysql2
    // yields the true instant and Manila formatting matches the laptop clock.
    // Existing instants are unaffected: TIMESTAMP is stored as a UTC instant
    // and DATETIME columns in this schema are written with UTC_TIMESTAMP().
    // The pool emits `connection` before the caller's query runs, and a
    // connection serialises its commands, so this SET lands first.
    pool.on("connection", (connection) => {
      (
        connection as unknown as {
          query: (sql: string, callback: (error: Error | null) => void) => void;
        }
      ).query("SET time_zone = '+00:00'", (error) => {
        if (error) console.error("[db] Could not set session time_zone:", error);
      });
    });

    globalForDb.alumtrackPool = pool;
  }

  return globalForDb.alumtrackPool;
}
