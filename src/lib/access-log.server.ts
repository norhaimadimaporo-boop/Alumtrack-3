import { getPool } from "./db.server";

/**
 * Permanent, append-only Login/Logout audit trail for the /admin/usage
 * "Access logs" viewer. Sessions are deleted on logout and activity_log rows
 * are a general admin feed, so neither can guarantee complete historical
 * access history. This table is never trimmed: older records must remain
 * viewable alongside newer ones.
 */

export type AccessAction = "Login" | "Logout";
export type AccessRole = "ADMIN" | "ALUMNI";

let tablePromise: Promise<void> | null = null;
let backfillPromise: Promise<void> | null = null;

export function ensureAccessLogsTable(): Promise<void> {
  if (!tablePromise) {
    tablePromise = getPool()
      .query(
        `
        CREATE TABLE IF NOT EXISTS access_logs (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          user_id BIGINT UNSIGNED NULL,
          user_name VARCHAR(255) NOT NULL,
          role VARCHAR(16) NOT NULL,
          action VARCHAR(16) NOT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_access_logs_created (created_at),
          KEY idx_access_logs_user (user_id)
        ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
      `,
      )
      .then(() => undefined)
      .catch((error) => {
        tablePromise = null;
        throw error;
      });
  }
  return tablePromise;
}

export async function recordAccessLog(input: {
  userId?: number | null;
  userName: string;
  role: AccessRole;
  action: AccessAction;
}): Promise<void> {
  await ensureAccessLogsTable();
  await getPool().execute(
    "INSERT INTO access_logs (user_id, user_name, role, action) VALUES (?, ?, ?, ?)",
    [input.userId ?? null, input.userName.slice(0, 255), input.role, input.action],
  );
}

/**
 * One-time merge of historical Login/Logout rows from activity_log. Uses
 * NOT EXISTS so repeated calls (and fresh server instances) never duplicate.
 */
export function backfillAccessLogsFromActivity(): Promise<void> {
  if (!backfillPromise) {
    backfillPromise = (async () => {
      await ensureAccessLogsTable();
      await getPool().query(`
        INSERT INTO access_logs (user_id, user_name, role, action, created_at)
        SELECT a.actor_user_id,
               COALESCE(NULLIF(TRIM(a.actor_name), ''), u.email, '-'),
               CASE WHEN LOWER(COALESCE(u.role, '')) = 'admin' THEN 'ADMIN' ELSE 'ALUMNI' END,
               a.action,
               a.created_at
          FROM activity_log a
          LEFT JOIN users u ON u.id = a.actor_user_id
         WHERE a.entity_type = 'login'
           AND a.action IN ('Login', 'Logout')
           AND NOT EXISTS (
             SELECT 1 FROM access_logs al
              WHERE al.action = a.action
                AND al.created_at = a.created_at
                AND ((al.user_id IS NULL AND a.actor_user_id IS NULL) OR al.user_id = a.actor_user_id)
           )
      `);
    })().catch((error) => {
      // A merge failure must never block the usage page; live Login/Logout
      // writes are independent and keep working.
      console.error("[access-log] activity_log backfill failed:", error);
    });
  }
  return backfillPromise;
}
