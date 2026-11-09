import type { RowDataPacket } from "mysql2/promise";

import { requireAdmin } from "./admin.server";
import { getPool } from "./db.server";
import { ensureSoftDeleteColumns } from "./soft-delete.server";
import { manilaClock, manilaDate } from "./manila-time";
import { fullName } from "./profile-format";
import type { SystemUsageData, SystemUsageResult } from "./usage.types";

type CountRow = RowDataPacket & Record<string, number>;

type LogRow = RowDataPacket & {
  token_hash: string;
  user_id: number;
  role: string;
  email: string;
  full_name: string | null;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  current_city: string | null;
  current_region: string | null;
  address_city: string | null;
  address_province: string | null;
  expires_at: Date | string;
  created_at: Date | string;
};

/**
 * Live system counters from `sessions` + `users`/`alumni_profiles`:
 * active sessions (unexpired, distinct users), logins today (last_login_at,
 * counted by Asia/Manila calendar day — `last_login_at` is stored as UTC),
 * distinct regions with an active session, and overseas active sessions.
 *
 * Access control: detailed per-user login/logout rows are Head Admin only.
 * Standard/Viewer admins still get the aggregate counters, but
 * `canViewAccessLogs` is false and `accessLogs` is never queried or
 * returned for them — the rows are filtered on the server, not just hidden
 * in the UI. Standard history remains available via Recent Admin Activity
 * (`getAdminDashboard`, viewer+).
 */
export async function getSystemUsage(): Promise<SystemUsageResult> {
  const access = await requireAdmin("viewer");
  if (!access.ok) return { ok: false, message: access.message };

  const canViewAccessLogs = access.admin.adminRole === "head";

  try {
    await ensureSoftDeleteColumns();
    const pool = getPool();
    const [[counts], [logRows]] = await Promise.all([
      pool.query<CountRow[]>(
        `SELECT
           (SELECT COUNT(DISTINCT user_id) FROM sessions WHERE expires_at > UTC_TIMESTAMP()) AS active_sessions,
           (SELECT COUNT(*) FROM users WHERE COALESCE(is_deleted, 0) = 0 AND DATE(CONVERT_TZ(last_login_at, '+00:00', '+08:00')) = DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+08:00'))) AS logins_today,
           (SELECT COUNT(DISTINCT p.current_region)
              FROM sessions s
              JOIN alumni_profiles p ON p.user_id = s.user_id AND COALESCE(p.is_deleted, 0) = 0
             WHERE s.expires_at > UTC_TIMESTAMP()
               AND p.current_region IS NOT NULL AND TRIM(p.current_region) <> '') AS regions,
           (SELECT COUNT(DISTINCT s.user_id)
              FROM sessions s
              JOIN alumni_profiles p ON p.user_id = s.user_id AND COALESCE(p.is_deleted, 0) = 0
             WHERE s.expires_at > UTC_TIMESTAMP()
               AND p.current_country IS NOT NULL AND TRIM(p.current_country) <> ''
               AND LOWER(TRIM(p.current_country)) NOT LIKE '%philippines%') AS overseas`,
      ),
      // Head-only: skip the per-user log query entirely for other tiers so
      // their rows never leave the server.
      canViewAccessLogs
        ? pool.query<LogRow[]>(
            `SELECT s.token_hash, s.user_id, u.role, u.email, u.full_name,
                    p.first_name, p.middle_name, p.last_name,
                    p.current_city, p.current_region,
                    cur.city AS address_city, cur.province AS address_province,
                    s.expires_at, s.created_at
               FROM sessions s
               JOIN users u ON u.id = s.user_id AND COALESCE(u.is_deleted, 0) = 0
          LEFT JOIN alumni_profiles p ON p.user_id = s.user_id AND COALESCE(p.is_deleted, 0) = 0
          LEFT JOIN alumni_addresses cur ON cur.user_id = s.user_id AND cur.kind = 'current'
              ORDER BY s.created_at DESC, s.user_id ASC
              LIMIT 200`,
          )
        : Promise.resolve([[]] as [LogRow[]]),
    ]);

    const countRow = counts[0];
    const usage: SystemUsageData = {
      activeSessions: Number(countRow?.active_sessions ?? 0),
      loginsToday: Number(countRow?.logins_today ?? 0),
      regionsWithActivity: Number(countRow?.regions ?? 0),
      overseasSessions: Number(countRow?.overseas ?? 0),
      canViewAccessLogs,
      accessLogs: logRows.map((row) => {
        const created =
          row.created_at instanceof Date ? row.created_at : new Date(row.created_at);
        const expires =
          row.expires_at instanceof Date ? row.expires_at : new Date(row.expires_at);
        const displayName =
          row.role === "alumni" && row.first_name
            ? fullName(row.first_name, row.middle_name ?? "", row.last_name ?? "")
            : row.full_name?.trim() || row.email;
        const where =
          [row.current_city?.trim() || row.address_city?.trim(), row.current_region?.trim() || row.address_province?.trim()]
            .filter(Boolean)
            .join(", ") || "—";
        return {
          id: row.token_hash.slice(0, 16),
          user: displayName,
          role: row.role === "admin" ? ("Admin" as const) : ("Alumni" as const),
          action: "Login" as const,
          date: manilaDate(created),
          clock: manilaClock(created),
          stamp: Number.isNaN(created.getTime()) ? "" : created.toISOString(),
          where,
          active: expires.getTime() > Date.now(),
        };
      }),
    };

    return { ok: true, usage };
  } catch (error) {
    console.error("[usage] System usage query failed:", error);
    return {
      ok: false,
      message: "System usage could not be loaded right now. Please try again later.",
    };
  }
}
