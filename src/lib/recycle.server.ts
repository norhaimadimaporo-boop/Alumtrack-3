import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

import { requireAdmin } from "./admin.server";
import { getPool } from "./db.server";
import { manilaClock, manilaDate } from "./manila-time";
import { fullName } from "./profile-format";
import { ensureSoftDeleteColumns, purgeExpiredRecycleBin } from "./soft-delete.server";
import type {
  RecycleActionResult,
  RecycleBinResult,
  RecycleItem,
  RecycleRestoreInput,
} from "./recycle.types";

type AlumniDeletedRow = RowDataPacket & {
  id: number;
  user_id: number;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  course: string | null;
  batch_year: number | null;
  deleted_at: Date | string | null;
};

type PostDeletedRow = RowDataPacket & {
  id: number;
  type: string;
  title: string;
  company: string | null;
  deleted_at: Date | string | null;
};

type AdminDeletedRow = RowDataPacket & {
  id: number;
  email: string;
  full_name: string | null;
  admin_role: string | null;
  deleted_at: Date | string | null;
};

function stampOf(value: Date | string | null) {
  const date = value instanceof Date ? value : value ? new Date(value) : null;
  const valid = date && !Number.isNaN(date.getTime());
  return {
    deletedAt: valid && date ? manilaDate(date) : "—",
    stamp: valid && date ? date.toISOString() : "",
    clock: valid && date ? manilaClock(date) : "",
  };
}

/**
 * Head-Admin-only recycle bin listing. Runs the 7-day purge first (lazy
 * cron check) so expired records are gone before the list is built.
 * Non-head callers get an empty list — rows never leave the server.
 */
export async function listRecycleBin(): Promise<RecycleBinResult> {
  const access = await requireAdmin("viewer");
  if (!access.ok) return { ok: true, canViewRecycleBin: false, items: [] };
  if (access.admin.adminRole !== "head")
    return { ok: true, canViewRecycleBin: false, items: [] };

  try {
    await ensureSoftDeleteColumns();
    await purgeExpiredRecycleBin();
    const pool = getPool();
    const [[alumniRows], [postRows], [adminRows]] = await Promise.all([
      pool.query<AlumniDeletedRow[]>(
        `SELECT p.id, p.user_id, p.first_name, p.middle_name, p.last_name,
                p.course, p.batch_year, p.deleted_at
           FROM alumni_profiles p
          WHERE p.is_deleted = 1
          ORDER BY p.deleted_at DESC, p.id DESC`,
      ),
      pool.query<PostDeletedRow[]>(
        `SELECT p.id, p.type, p.title, p.company, p.deleted_at
           FROM posts p
          WHERE p.is_deleted = 1
          ORDER BY p.deleted_at DESC, p.id DESC`,
      ),
      pool.query<AdminDeletedRow[]>(
        `SELECT u.id, u.email, u.full_name, u.admin_role, u.deleted_at
           FROM users u
          WHERE u.role = 'admin' AND u.is_deleted = 1
          ORDER BY u.deleted_at DESC, u.id DESC`,
      ),
    ]);

    const items: RecycleItem[] = [
      ...alumniRows.map((row) => {
        const s = stampOf(row.deleted_at);
        return {
          key: `alumni-${row.id}`,
          kind: "alumni" as const,
          id: row.id,
          title: fullName(row.first_name, row.middle_name ?? "", row.last_name),
          detail: `${row.course?.trim() || "Course not provided"}${row.batch_year ? ` · Batch ${row.batch_year}` : ""}`,
          deletedAt: s.deletedAt,
          stamp: s.stamp,
        };
      }),
      ...postRows.map((row) => {
        const s = stampOf(row.deleted_at);
        const label =
          row.type === "Job Offering"
            ? "Job Offering"
            : row.type === "News / Event"
              ? "News / Event"
              : "Announcement";
        return {
          key: `posts-${row.id}`,
          kind: "posts" as const,
          id: row.id,
          title: row.title,
          detail: `${label}${row.company?.trim() ? ` · ${row.company.trim()}` : ""}`,
          deletedAt: s.deletedAt,
          stamp: s.stamp,
        };
      }),
      ...adminRows.map((row) => {
        const s = stampOf(row.deleted_at);
        const role =
          row.admin_role === "head"
            ? "Head Admin"
            : row.admin_role === "viewer"
              ? "Viewer Admin"
              : "Standard Admin";
        return {
          key: `admin-${row.id}`,
          kind: "admin" as const,
          id: row.id,
          title: row.full_name?.trim() || row.email,
          detail: `${role} · ${row.email}`,
          deletedAt: s.deletedAt,
          stamp: s.stamp,
        };
      }),
    ].sort((a, b) => b.stamp.localeCompare(a.stamp));

    return { ok: true, canViewRecycleBin: true, items };
  } catch (error) {
    console.error("[recycle] List failed:", error);
    return {
      ok: false,
      canViewRecycleBin: false,
      items: [],
      message: "The recycle bin could not be loaded right now. Please try again later.",
    };
  }
}

/** Sets `is_deleted = 0` so the record returns to every live UI. */
export async function restoreRecycleItem(
  input: RecycleRestoreInput,
): Promise<RecycleActionResult> {
  const access = await requireAdmin("head");
  if (!access.ok) return { ok: false, message: access.message };
  if (!Number.isInteger(input.id) || input.id <= 0)
    return { ok: false, message: "Invalid recycle bin record." };

  try {
    await ensureSoftDeleteColumns();
    const pool = getPool();
    if (input.kind === "posts") {
      const [result] = await pool.execute<ResultSetHeader>(
        `UPDATE posts SET is_deleted = 0, deleted_at = NULL
          WHERE id = ? AND is_deleted = 1`,
        [input.id],
      );
      if (result.affectedRows === 0)
        return { ok: false, message: "That post is no longer in the recycle bin." };
      return { ok: true, message: "The post was restored to the live list." };
    }
    if (input.kind === "admin") {
      const [result] = await pool.execute<ResultSetHeader>(
        `UPDATE users SET is_deleted = 0, deleted_at = NULL
          WHERE id = ? AND role = 'admin' AND is_deleted = 1`,
        [input.id],
      );
      if (result.affectedRows === 0)
        return { ok: false, message: "That admin account is no longer in the recycle bin." };
      return { ok: true, message: "The admin account was restored." };
    }
    // Alumni: restore the profile and its owning user account together.
    const [rows] = await pool.execute<AlumniDeletedRow[]>(
      `SELECT id, user_id FROM alumni_profiles WHERE id = ? AND is_deleted = 1 LIMIT 1`,
      [input.id],
    );
    const profile = rows[0];
    if (!profile) return { ok: false, message: "That alumni record is no longer in the recycle bin." };
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute(
        `UPDATE alumni_profiles SET is_deleted = 0, deleted_at = NULL WHERE id = ?`,
        [input.id],
      );
      await connection.execute(
        `UPDATE users SET is_deleted = 0, deleted_at = NULL WHERE id = ? AND role = 'alumni'`,
        [profile.user_id],
      );
      await connection.execute(
        `INSERT INTO activity_log (actor_user_id, actor_name, action, entity_type, entity_id)
         VALUES (?, ?, 'Restored alumni record from recycle bin', 'restoration', ?)`,
        [access.admin.id, access.admin.fullName ?? access.admin.email, input.id],
      );
      await connection.commit();
      return { ok: true, message: "The alumni record was restored to the directory." };
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("[recycle] Restore failed:", error);
    return { ok: false, message: "The record could not be restored right now. Please try again." };
  }
}

/** Manual/cron entry: permanently removes records binned for > 7 days. */
export async function purgeRecycleBin(): Promise<RecycleActionResult> {
  try {
    const purged = await purgeExpiredRecycleBin();
    const total = purged.posts + purged.alumni + purged.users;
    return {
      ok: true,
      message: `Purge complete: ${total} expired record${total === 1 ? "" : "s"} permanently removed.`,
    };
  } catch (error) {
    console.error("[recycle] Purge failed:", error);
    return { ok: false, message: "The purge could not be completed right now. Please try again." };
  }
}
