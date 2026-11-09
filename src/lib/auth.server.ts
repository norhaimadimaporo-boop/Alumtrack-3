import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { RowDataPacket } from "mysql2/promise";
import { getRequestHeader, setResponseHeader } from "@tanstack/react-start/server";

import { getPool } from "./db.server";
import { ensureSoftDeleteColumns } from "./soft-delete.server";
import type { AdminRole, Role } from "./session";

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

const SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 } as const;
const KEY_LENGTH = 64;

export const SESSION_COOKIE = "alumtrack_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

// A syntactically valid hash used to keep failed-login timing consistent.
const DUMMY_HASH = `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${"A".repeat(22)}==$${"A".repeat(86)}==`;

export type AuthUser = {
  id: number;
  email: string;
  role: Role;
  adminRole: AdminRole | null;
  fullName: string | null;
};

type UserRow = RowDataPacket & {
  id: number;
  email: string;
  password_hash: string;
  role: Role;
  admin_role: AdminRole | null;
  full_name: string | null;
  is_active: number;
  is_deleted?: number | boolean | null;
  verification_status: "pending" | "verified" | "rejected" | null;
};

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password.normalize("NFKC"), salt, KEY_LENGTH, SCRYPT);
  return [
    "scrypt",
    SCRYPT.N,
    SCRYPT.r,
    SCRYPT.p,
    salt.toString("base64"),
    hash.toString("base64"),
  ].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const n = parts[1];
  const r = parts[2];
  const p = parts[3];
  const saltB64 = parts[4];
  const hashB64 = parts[5];
  if (!n || !r || !p || !saltB64 || !hashB64) return false;

  const salt = Buffer.from(saltB64, "base64");
  const expected = Buffer.from(hashB64, "base64");
  if (salt.length === 0 || expected.length === 0) return false;
  if (Number(n) !== SCRYPT.N || Number(r) !== SCRYPT.r || Number(p) !== SCRYPT.p) return false;

  const actual = await scrypt(password.normalize("NFKC"), salt, expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: SCRYPT.maxmem,
  });

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function readCookie(header: string | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    if (part.slice(0, index).trim() !== name) continue;
    return decodeURIComponent(part.slice(index + 1).trim());
  }
  return null;
}

function sessionCookie(token: string, maxAgeSeconds: number): string {
  const secure = process.env["NODE_ENV"] === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`;
}

async function createSession(userId: number): Promise<string> {
  const pool = getPool();

  // Drop expired sessions while we have the pool open.
  await pool.execute("DELETE FROM sessions WHERE expires_at <= UTC_TIMESTAMP()");

  const token = randomBytes(32).toString("hex");
  await pool.execute(
    "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? SECOND))",
    [hashToken(token), userId, SESSION_TTL_SECONDS],
  );

  return token;
}

function toAuthUser(
  row: Pick<UserRow, "id" | "email" | "role" | "admin_role" | "full_name">,
): AuthUser {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    // Legacy admin rows created before RBAC default to the standard tier.
    adminRole: row.role === "admin" ? (row.admin_role ?? "standard") : null,
    fullName: row.full_name,
  };
}

function invalidCredentials() {
  return { ok: false as const, message: "Invalid email or password." };
}

export async function loginUser(input: { email: string; password: string; role: Role }) {
  const email = input.email.trim().toLowerCase();

  try {
    await ensureSoftDeleteColumns();
    const pool = getPool();

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT u.id, u.email, u.password_hash, u.role, u.admin_role, u.full_name, u.is_active, u.is_deleted,
              p.verification_status
         FROM users u
         LEFT JOIN alumni_profiles p ON p.user_id = u.id
        WHERE u.email = ? LIMIT 1`,
      [email],
    );
    const user = rows[0] as UserRow | undefined;

    if (!user) {
      // Run a hash anyway so a missing account does not answer faster than a wrong password.
      await verifyPassword(input.password, DUMMY_HASH);
      return invalidCredentials();
    }

    if (!user.is_active) {
      return {
        ok: false as const,
        message: "This account has been deactivated. Contact the OARCC for assistance.",
      };
    }

    if (user.is_deleted === 1 || user.is_deleted === true) {
      return invalidCredentials();
    }

    const valid = await verifyPassword(input.password, user.password_hash);
    if (!valid) return invalidCredentials();

    if (user.role !== input.role) {
      return {
        ok: false as const,
        message: `These credentials belong to a ${user.role} account. Select the ${user.role} tab and try again.`,
      };
    }

    if (user.role === "alumni" && user.verification_status === "pending") {
      return {
        ok: false as const,
        message: "Your account is pending verification by the admin. Please try again later.",
      };
    }

    if (user.role === "alumni" && user.verification_status === "rejected") {
      return {
        ok: false as const,
        message: "Your account registration was rejected by the admin. Contact the OARCC for assistance.",
      };
    }

    const sessionToken = await createSession(user.id);
    await pool.execute("UPDATE users SET last_login_at = UTC_TIMESTAMP() WHERE id = ?", [user.id]);
    await pool
      .execute(
        `INSERT INTO activity_log (actor_user_id, actor_name, action, entity_type)
         VALUES (?, ?, 'Login', 'login')`,
        [user.id, user.full_name ?? user.email],
      )
      .catch(() => undefined);
    setResponseHeader("Set-Cookie", sessionCookie(sessionToken, SESSION_TTL_SECONDS));

    const authUser = toAuthUser(user);
    return { ok: true as const, user: authUser, role: authUser.role };
  } catch (error) {
    // Do not leak database details (hosts, users, credentials) to the browser.
    console.error("[auth] Login failed:", error);
    return {
      ok: false as const,
      message: "Sign-in is temporarily unavailable. Please try again later.",
    };
  }
}

export async function getSessionUser(): Promise<AuthUser | null> {
  const token = readCookie(getRequestHeader("cookie"), SESSION_COOKIE);
  if (!token) return null;

  try {
    await ensureSoftDeleteColumns();
    const [rows] = await getPool().execute<RowDataPacket[]>(
      `SELECT u.id, u.email, u.role, u.admin_role, u.full_name
         FROM sessions s
         JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = ?
          AND s.expires_at > UTC_TIMESTAMP()
          AND u.is_active = 1
          AND COALESCE(u.is_deleted, 0) = 0
        LIMIT 1`,
      [hashToken(token)],
    );

    const user = rows[0] as UserRow | undefined;
    return user ? toAuthUser(user) : null;
  } catch (error) {
    console.error("[auth] Session lookup failed:", error);
    return null;
  }
}

export async function logoutUser(): Promise<{ ok: true }> {
  const token = readCookie(getRequestHeader("cookie"), SESSION_COOKIE);
  if (token) {
    try {
      const pool = getPool();
      const [sessions] = await pool.execute<RowDataPacket[]>(
        "SELECT user_id FROM sessions WHERE token_hash = ? LIMIT 1",
        [hashToken(token)],
      );
      const sessionUserId = (sessions[0] as { user_id?: number } | undefined)?.user_id;
      await pool.execute("DELETE FROM sessions WHERE token_hash = ?", [hashToken(token)]);
      if (sessionUserId) {
        const [users] = await pool.execute<RowDataPacket[]>(
          "SELECT full_name, email FROM users WHERE id = ? LIMIT 1",
          [sessionUserId],
        );
        const name = (users[0] as { full_name?: string | null; email?: string } | undefined);
        await pool
          .execute(
            `INSERT INTO activity_log (actor_user_id, actor_name, action, entity_type)
             VALUES (?, ?, 'Logout', 'login')`,
            [sessionUserId, name?.full_name ?? name?.email ?? "—"],
          )
          .catch(() => undefined);
      }
    } catch (error) {
      console.error("[auth] Session delete failed:", error);
    }
  }

  setResponseHeader("Set-Cookie", sessionCookie("", 0));
  return { ok: true };
}
