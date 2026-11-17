import type { RowDataPacket } from "mysql2/promise";

import { getSessionUser } from "./auth.server";
import { getPool } from "./db.server";

let schemaPromise: Promise<void> | null = null;

/** Add avatar storage to existing databases (MySQL Workbench/local and Aiven). */
export function ensureAvatarSchema(): Promise<void> {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      const pool = getPool();
      const [columns] = await pool.query<Array<RowDataPacket & { COLUMN_NAME: string }>>(
        `SELECT COLUMN_NAME
           FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'alumni_profiles'
            AND COLUMN_NAME IN ('avatar_data', 'avatar_updated_at')`,
      );
      const existing = new Set(columns.map((column) => column.COLUMN_NAME));

      if (!existing.has("avatar_data")) {
        try {
          await pool.query("ALTER TABLE alumni_profiles ADD COLUMN avatar_data MEDIUMTEXT NULL");
        } catch (error) {
          if ((error as { code?: string }).code !== "ER_DUP_FIELDNAME") throw error;
        }
      }
      if (!existing.has("avatar_updated_at")) {
        try {
          await pool.query(
            "ALTER TABLE alumni_profiles ADD COLUMN avatar_updated_at DATETIME(3) NULL",
          );
        } catch (error) {
          if ((error as { code?: string }).code !== "ER_DUP_FIELDNAME") throw error;
        }
      }
    })().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
}

export function avatarUrlForUser(
  userId: number,
  hasAvatar: boolean | number | null,
  updatedAt: Date | string | null,
): string | null {
  if (!hasAvatar || !updatedAt) return null;
  const time = updatedAt instanceof Date ? updatedAt.getTime() : new Date(updatedAt).getTime();
  const version = Number.isFinite(time) ? time : encodeURIComponent(String(updatedAt));
  return `/api/alumni/avatar?userId=${userId}&v=${version}`;
}

type AvatarRow = RowDataPacket & {
  avatar_data: string | null;
  verification_status: "pending" | "verified" | "rejected";
  profile_deleted: number | boolean | null;
  user_deleted: number | boolean | null;
};

function jsonResponse(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function avatarData(dataUrl: unknown): { dataUrl: string; mime: string } | null {
  if (typeof dataUrl !== "string" || dataUrl.length > 520_000) return null;
  const match = /^data:(image\/(?:webp|jpeg));base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
  if (!match?.[1] || !match[2]) return null;

  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length === 0 || bytes.length > 390_000) return null;
  const isJpeg =
    match[1] === "image/jpeg" && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isWebp =
    match[1] === "image/webp" &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP";
  if (!isJpeg && !isWebp) return null;
  return { dataUrl, mime: match[1] };
}

export async function getAvatarResponse(request: Request): Promise<Response> {
  const userId = Number(new URL(request.url).searchParams.get("userId"));
  if (!Number.isSafeInteger(userId) || userId <= 0) return new Response(null, { status: 404 });

  try {
    await ensureAvatarSchema();
    const viewer = await getSessionUser();
    const [rows] = await getPool().execute<AvatarRow[]>(
      `SELECT p.avatar_data, p.verification_status,
              COALESCE(p.is_deleted, 0) AS profile_deleted,
              COALESCE(u.is_deleted, 0) AS user_deleted
         FROM alumni_profiles p
         JOIN users u ON u.id = p.user_id AND u.is_active = 1
        WHERE p.user_id = ?
        LIMIT 1`,
      [userId],
    );
    const row = rows[0];
    if (
      !row ||
      row.profile_deleted === 1 ||
      row.profile_deleted === true ||
      row.user_deleted === 1 ||
      row.user_deleted === true ||
      (row.verification_status !== "verified" && viewer?.role !== "admin" && viewer?.id !== userId)
    ) {
      return new Response(null, { status: 404 });
    }

    const stored = avatarData(row.avatar_data);
    if (!stored) return new Response(null, { status: 404 });
    const encoded = stored.dataUrl.slice(stored.dataUrl.indexOf(",") + 1);
    const body = new Uint8Array(Buffer.from(encoded, "base64"));
    return new Response(body, {
      headers: {
        "Content-Type": stored.mime,
        "Content-Length": String(body.byteLength),
        "Cache-Control":
          row.verification_status === "verified" && new URL(request.url).searchParams.has("v")
            ? "public, max-age=31536000, immutable"
            : "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[avatar] Image read failed:", error);
    return jsonResponse({ message: "The profile photo could not be loaded." }, 500);
  }
}

export async function saveAvatar(request: Request): Promise<Response> {
  const user = await getSessionUser();
  if (!user || user.role !== "alumni") {
    return jsonResponse({ message: "Sign in with an alumni account to update your photo." }, 401);
  }
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 600_000) {
    return jsonResponse({ message: "Choose a smaller, compressed profile photo." }, 413);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ message: "Choose a valid image file." }, 400);
  }
  const image = avatarData((body as { dataUrl?: unknown } | null)?.dataUrl);
  if (!image) {
    return jsonResponse({ message: "Use a compressed JPEG or WebP photo under 390 KB." }, 400);
  }

  try {
    await ensureAvatarSchema();
    const pool = getPool();
    const [result] = await pool.execute(
      `UPDATE alumni_profiles
          SET avatar_data = ?, avatar_updated_at = UTC_TIMESTAMP(3)
        WHERE user_id = ? AND COALESCE(is_deleted, 0) = 0`,
      [image.dataUrl, user.id],
    );
    if ((result as { affectedRows: number }).affectedRows === 0) {
      const [rows] = await pool.execute<RowDataPacket[]>(
        "SELECT id FROM alumni_profiles WHERE user_id = ? AND COALESCE(is_deleted, 0) = 0 LIMIT 1",
        [user.id],
      );
      if (rows.length === 0) return jsonResponse({ message: "No alumni profile was found." }, 404);
    }
    return jsonResponse({
      ok: true,
      avatarUrl: `/api/alumni/avatar?userId=${user.id}&v=${Date.now()}`,
    });
  } catch (error) {
    console.error("[avatar] Upload failed:", error);
    return jsonResponse(
      { message: "The profile photo could not be saved. Please try again." },
      500,
    );
  }
}

export async function deleteAvatar(): Promise<Response> {
  const user = await getSessionUser();
  if (!user || user.role !== "alumni") {
    return jsonResponse({ message: "Sign in with an alumni account to update your photo." }, 401);
  }

  try {
    await ensureAvatarSchema();
    const pool = getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(
      "SELECT id FROM alumni_profiles WHERE user_id = ? AND COALESCE(is_deleted, 0) = 0 LIMIT 1",
      [user.id],
    );
    if (rows.length === 0) return jsonResponse({ message: "No alumni profile was found." }, 404);
    await pool.execute(
      `UPDATE alumni_profiles
          SET avatar_data = NULL, avatar_updated_at = NULL
        WHERE user_id = ?`,
      [user.id],
    );
    return jsonResponse({ ok: true, avatarUrl: null });
  } catch (error) {
    console.error("[avatar] Delete failed:", error);
    return jsonResponse(
      { message: "The profile photo could not be deleted. Please try again." },
      500,
    );
  }
}
