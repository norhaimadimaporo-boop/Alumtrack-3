import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";

import { getPool } from "./db.server";

/**
 * Soft-delete (recycle bin) plumbing.
 *
 * `is_deleted = 1` + `deleted_at` mark a row as binned. Every live listing
 * filters with `COALESCE(is_deleted, 0) = 0` so soft-deleted rows disappear
 * from directories, feeds, maps, and search while remaining restorable.
 * `purgeExpiredRecycleBin` hard-deletes rows binned for more than 7 days;
 * it is invoked lazily on each Recycle Bin load (serverless cron check) and
 * can also be run standalone via `npm run db:purge` / OS cron.
 */

export const SOFT_DELETE_TTL_DAYS = 7;

const TABLES = ["users", "alumni_profiles", "posts"] as const;

let ensurePromise: Promise<void> | null = null;

async function addColumnIfMissing(
  table: string,
  column: string,
  definition: string,
  indexName: string,
) {
  const pool = getPool();
  const [cols] = await pool.query<RowDataPacket[]>(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column],
  );
  if (cols.length === 0) {
    // Identifiers are internal constants, never user input.
    await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN ${definition}`);
  }
  const [idx] = await pool.query<RowDataPacket[]>(
    `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [table, indexName],
  );
  if (idx.length === 0) {
    await pool.query(`ALTER TABLE \`${table}\` ADD KEY \`${indexName}\` (\`${column}\`)`);
  }
}

/** Idempotently adds `is_deleted` / `deleted_at` to soft-deletable tables. */
export function ensureSoftDeleteColumns(): Promise<void> {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      for (const table of TABLES) {
        await addColumnIfMissing(
          table,
          "is_deleted",
          "`is_deleted` TINYINT(1) NOT NULL DEFAULT 0 AFTER `id`",
          `idx_${table}_is_deleted`,
        );
        await addColumnIfMissing(
          table,
          "deleted_at",
          "`deleted_at` DATETIME NULL",
          `idx_${table}_deleted_at`,
        );
      }
    })().catch((error) => {
      // Allow a retry on the next request instead of caching the failure.
      ensurePromise = null;
      throw error;
    });
  }
  return ensurePromise;
}

/** SQL fragment that keeps only live (not soft-deleted) rows for an alias. */
export function notDeleted(alias: string): string {
  const prefix = alias ? `${alias}.` : "";
  return `COALESCE(${prefix}is_deleted, 0) = 0`;
}

/**
 * Permanently removes soft-deleted rows older than 7 days. Safe to call on
 * every Recycle Bin load; indexed on `deleted_at` so it is cheap.
 */
export async function purgeExpiredRecycleBin(): Promise<{
  posts: number;
  alumni: number;
  users: number;
}> {
  await ensureSoftDeleteColumns();
  const pool = getPool();
  const cutoff = `deleted_at < UTC_TIMESTAMP() - INTERVAL ${SOFT_DELETE_TTL_DAYS} DAY`;

  // Posts first (blob cleanup skipped here; recycle.server handles images).
  const [postRes] = await pool.execute<ResultSetHeader>(
    `DELETE FROM posts WHERE is_deleted = 1 AND ${cutoff}`,
  );
  // Alumni profiles before users so the FK cascade order is deterministic.
  const [profileRes] = await pool.execute<ResultSetHeader>(
    `DELETE FROM alumni_profiles WHERE is_deleted = 1 AND ${cutoff}`,
  );
  // Users last: this cascades any remaining profile/address/education rows
  // and covers soft-deleted admin accounts.
  const [userRes] = await pool.execute<ResultSetHeader>(
    `DELETE FROM users WHERE is_deleted = 1 AND ${cutoff}`,
  );
  return {
    posts: Number(postRes.affectedRows ?? 0),
    alumni: Number(profileRes.affectedRows ?? 0),
    users: Number(userRes.affectedRows ?? 0),
  };
}
