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
      connectionLimit: 10,
      queueLimit: 0,
      ...(isSslEnabled() ? { ssl: { rejectUnauthorized: true } } : {}),
    });
  }

  return globalForDb.alumtrackPool;
}
