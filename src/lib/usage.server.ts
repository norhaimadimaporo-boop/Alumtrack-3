import type { RowDataPacket } from "mysql2/promise";

import { requireAdmin } from "./admin.server";
import { backfillAccessLogsFromActivity } from "./access-log.server";
import { getPool } from "./db.server";
import { ensureSoftDeleteColumns } from "./soft-delete.server";
import { manilaClock, manilaDate } from "./manila-time";
import type { SystemUsageData, SystemUsageResult } from "./usage.types";

type CountRow = RowDataPacket & Record<string, number>;

type LogRow = RowDataPacket & {
  id: number;
  user_id: number | null;
  user_name: string;
  role: string;
  action: string;
  created_at: Date | string;
  current_city: string | null;
  current_region: string | null;
  address_city: string | null;
  address_province: string | null;
};

/**
 * Live system counters from `sessions` + `users`/`alumni_profiles`, plus the
 * permanent `access_logs` Login/Logout trail for the /admin/usage viewer.
 * Access logs are append-only: every stored row is returned (no LIMIT), so the
 * "View All Access Logs" modal shows full history while the summary card
 * locally slices a short preview.
 *
 * Access control: detailed rows are Head Admin only. Standard/Viewer admins
 * get the aggregate counters but no log rows leave the server.
 */
export async function getSystemUsage(): Promise<SystemUsageResult> {
  const access = await requireAdmin("viewer");
  if (!access.ok) return { ok: false, message: access.message };

  const canViewAccessLogs = access.admin.adminRole === "head";

  try {
    await ensureSoftDeleteColumns();
    if (canViewAccessLogs) await backfillAccessLogsFromActivity();

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
               AND LOWER(TRIM(p.current_country)) NOT LIKE '%philippines%') AS overseas,
           (SELECT COUNT(*) FROM access_logs) AS access_logs`,
      ),
      // Head-only: skip the per-user log query entirely for other tiers.
      canViewAccessLogs
        ? pool.query<LogRow[]>(
            `SELECT l.id, l.user_id, l.user_name, l.role, l.action, l.created_at,
                    p.current_city, p.current_region,
                    cur.city AS address_city, cur.province AS address_province
               FROM access_logs l
               LEFT JOIN users u ON u.id = l.user_id
               LEFT JOIN alumni_profiles p ON p.user_id = l.user_id AND COALESCE(p.is_deleted, 0) = 0
               LEFT JOIN alumni_addresses cur ON cur.user_id = l.user_id AND cur.kind = 'current'
              ORDER BY l.created_at DESC, l.id DESC`,
          )
        : Promise.resolve([[]] as [LogRow[]]),
    ]);

    const countRow = counts[0];
    const usage: SystemUsageData = {
      activeSessions: Number(countRow?.["active_sessions"] ?? 0),
      loginsToday: Number(countRow?.["logins_today"] ?? 0),
      regionsWithActivity: Number(countRow?.["regions"] ?? 0),
      overseasSessions: Number(countRow?.["overseas"] ?? 0),
      canViewAccessLogs,
      totalAccessLogs: Number(countRow?.["access_logs"] ?? 0),
      accessLogs: logRows.map((row) => {
        const created = row.created_at instanceof Date ? row.created_at : new Date(row.created_at);
        const where =
          [
            row.current_city?.trim() || row.address_city?.trim(),
            row.current_region?.trim() || row.address_province?.trim(),
          ]
            .filter(Boolean)
            .join(", ") || "-";
        return {
          id: `log-${row.id}`,
          user: row.user_name?.trim() || "-",
          role: row.role === "ADMIN" ? ("Admin" as const) : ("Alumni" as const),
          action: row.action === "Logout" ? ("Logout" as const) : ("Login" as const),
          date: manilaDate(created),
          clock: manilaClock(created),
          stamp: Number.isNaN(created.getTime()) ? "" : created.toISOString(),
          where,
          active: false,
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
