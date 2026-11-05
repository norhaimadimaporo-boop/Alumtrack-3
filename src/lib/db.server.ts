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
    globalForDb.alumtrackPool = mysql.createPool({
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
  }

  return globalForDb.alumtrackPool;
}
