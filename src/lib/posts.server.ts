import { randomUUID } from "node:crypto";
import { del, put } from "@vercel/blob";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

import { requireAdmin } from "./admin.server";
import { getSessionUser } from "./auth.server";
import { getPool } from "./db.server";
import { ensureSoftDeleteColumns } from "./soft-delete.server";
import { formatDate } from "./profile-format";
import { postExcerpt } from "./posts.types";
import type {
  PostActionResult,
  PostCategory,
  PostImageUploadResult,
  PostInput,
  PostListResult,
  PostRecord,
  PostStatus,
  PostType,
} from "./posts.types";

const MAX_IMAGES = 5;
const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // client compresses; keep well under the 4.5 MB function limit
const BLOB_HOST_SUFFIX = ".public.blob.vercel-storage.com";

const POST_TYPES: PostType[] = ["Announcement", "News / Event", "Job Offering"];
const POST_STATUSES: PostStatus[] = ["Published", "Draft"];

type PostRow = RowDataPacket & {
  id: number;
  type: PostType;
  title: string;
  content: string | null;
  status: PostStatus;
  posted_at: Date | string | null;
  company: string | null;
  location: string | null;
  job_type: string | null;
  salary: string | null;
  deadline: Date | string | null;
  qualifications: string | null;
  apply_link: string | null;
  images: string | string[] | null;
  featured: number | boolean | null;
  created_at: Date | string | null;
  author: string | null;
};

const SELECT_COLUMNS = `p.id, p.type, p.title, p.content, p.status, p.posted_at,
       p.company, p.location, p.job_type, p.salary, p.deadline, p.qualifications,
       p.apply_link, p.images, p.featured, p.created_at,
       COALESCE(u.full_name, u.email) AS author`;

const FROM_POSTS = `FROM posts p LEFT JOIN users u ON u.id = p.created_by`;

const MESSAGES = {
  unauthorized: "Sign in with an administrator account to manage posts.",
  forbidden: "Only a Standard or Head Admin can publish posts.",
  failed: "The request could not be completed right now. Please try again.",
  duplicate:
    "A post with this title already exists. Change the title or edit the existing post instead.",
};

function isPostType(value: string): value is PostType {
  return (POST_TYPES as string[]).includes(value);
}

function isPostStatus(value: string): value is PostStatus {
  return (POST_STATUSES as string[]).includes(value);
}

function categoryOf(type: PostType): PostCategory {
  if (type === "Job Offering") return "Job";
  if (type === "News / Event") return "Event";
  return "News";
}

function isoDate(value: Date | string | null): string {
  if (!value) return "";
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? "" : value.toISOString().slice(0, 10);
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value);
  return match?.[1] ?? "";
}

function normalizeDate(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  return trimmed;
}

function parseImages(value: PostRow["images"]): string[] {
  if (!value) return [];
  let list: unknown = value;
  if (typeof value === "string") {
    try {
      list = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(list)) return [];
  return list
    .filter((item): item is string => typeof item === "string" && /^https?:\/\//.test(item))
    .slice(0, MAX_IMAGES);
}

function parseQualifications(value: string | null): string[] {
  return (value ?? "")
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);
}

function toPost(row: PostRow): PostRecord {
  const qualifications = parseQualifications(row.qualifications);
  return {
    id: row.id,
    type: row.type,
    category: categoryOf(row.type),
    title: row.title,
    content: row.content ?? "",
    status: row.status,
    postedAt: isoDate(row.posted_at),
    date: formatDate(row.posted_at ?? row.created_at),
    company: row.company ?? "",
    location: row.location ?? "",
    jobType: row.job_type ?? "",
    salary: row.salary ?? "",
    deadline: formatDate(row.deadline),
    deadlineIso: isoDate(row.deadline),
    qualifications,
    applyLink: row.apply_link ?? "",
    images: parseImages(row.images),
    featured: Boolean(row.featured),
    author: row.author ?? "OARCC",
    createdAt: formatDate(row.created_at),
  };
}

function clean(value: string | undefined, max: number): string {
  return (value ?? "").trim().slice(0, max);
}

function validateInput(input: PostInput): { ok: true; input: PostInput } | { ok: false; message: string } {
  if (!isPostType(input.type)) return { ok: false, message: "Choose a valid post type." };
  if (!isPostStatus(input.status)) return { ok: false, message: "Choose a valid post status." };

  const title = clean(input.title, 255);
  if (title.length < 3) return { ok: false, message: "Enter a title with at least 3 characters." };

  const content = (input.content ?? "").trim();
  if (!content) return { ok: false, message: "Write the post content before saving." };

  if (input.postedAt && !normalizeDate(input.postedAt)) {
    return { ok: false, message: "Enter the post date as YYYY-MM-DD." };
  }
  if (input.deadline && !normalizeDate(input.deadline)) {
    return { ok: false, message: "Enter the deadline as YYYY-MM-DD." };
  }
  if (input.type === "Job Offering") {
    if (!clean(input.company, 255)) return { ok: false, message: "Enter the company or agency name." };
    if (!clean(input.location, 255)) return { ok: false, message: "Enter the job location." };
    if (input.applyLink && !/^https?:\/\/\S+$/i.test(input.applyLink.trim())) {
      return { ok: false, message: "The apply link must start with http:// or https://." };
    }
  }

  const images = Array.isArray(input.images)
    ? input.images.filter((url) => typeof url === "string" && /^https?:\/\//i.test(url)).slice(0, MAX_IMAGES)
    : [];
  const featured = Boolean(input.featured);

  return {
    ok: true,
    input: {
      ...(input.id ? { id: input.id } : {}),
      type: input.type,
      title,
      content,
      status: input.status,
      postedAt: normalizeDate(input.postedAt ?? "") ?? new Date().toISOString().slice(0, 10),
      company: clean(input.company, 255),
      location: clean(input.location, 255),
      jobType: clean(input.jobType, 100),
      salary: clean(input.salary, 160),
      deadline: normalizeDate(input.deadline ?? "") ?? "",
      qualifications: clean(input.qualifications, 4000),
      applyLink: clean(input.applyLink, 500),
      images,
      featured,
    },
  };
}

async function logPostActivity(
  admin: { id: number; email: string; fullName: string | null },
  action: string,
  entityId: number | null,
) {
  try {
    await getPool().execute(
      `INSERT INTO activity_log (actor_user_id, actor_name, action, entity_type, entity_id)
       VALUES (?, ?, ?, 'post', ?)`,
      [admin.id, admin.fullName ?? admin.email, action, entityId],
    );
  } catch (error) {
    // Activity logging must never block publishing.
    console.error("[posts] Activity log failed:", error);
  }
}

/** Guests see News and Events only; signed-in alumni and administrators also see Jobs. */
export async function viewerCanSeeJobs(): Promise<boolean> {
  return (await getSessionUser()) !== null;
}

/** Public feed used by /news, /jobs, the dashboard and the landing page. */
export async function listPublishedPosts(
  options: { limit?: number; includeJobs?: boolean } = {},
): Promise<PostListResult> {
  try {
    await ensureSoftDeleteColumns();
    const limit = options.limit;
    const safeLimit = Number.isFinite(limit) && (limit ?? 0) > 0 ? Math.min(Math.floor(limit!), 100) : null;
    const jobFilter = options.includeJobs ? "" : "AND p.type <> 'Job Offering'";
    const [rows] = await getPool().query<PostRow[]>(
      `SELECT ${SELECT_COLUMNS}
         ${FROM_POSTS}
        WHERE p.status = 'Published' AND COALESCE(p.is_deleted, 0) = 0 ${jobFilter}
        ORDER BY p.featured DESC, COALESCE(p.posted_at, DATE(p.created_at)) DESC, p.id DESC
        ${safeLimit ? "LIMIT ?" : ""}`,
      safeLimit ? [safeLimit] : [],
    );
    return { ok: true, posts: rows.map(toPost) };
  } catch (error) {
    console.error("[posts] Published feed failed:", error);
    return {
      ok: false,
      posts: [],
      message: "Posts could not be loaded right now.",
    };
  }
}

/** Admin list: drafts included. */
export async function listAdminPosts(): Promise<PostListResult> {
  const access = await requireAdmin("viewer");
  if (!access.ok) return { ok: false, posts: [], message: access.message };

  try {
    await ensureSoftDeleteColumns();
    const [rows] = await getPool().query<PostRow[]>(
      `SELECT ${SELECT_COLUMNS}
         ${FROM_POSTS}
        WHERE COALESCE(p.is_deleted, 0) = 0
        ORDER BY
          CASE p.status WHEN 'Published' THEN 0 ELSE 1 END,
          p.featured DESC,
          COALESCE(p.posted_at, DATE(p.created_at)) DESC,
          p.id DESC`,
    );
    return { ok: true, posts: rows.map(toPost) };
  } catch (error) {
    console.error("[posts] Admin list failed:", error);
    return { ok: false, posts: [], message: MESSAGES.failed };
  }
}

export async function createPost(input: PostInput): Promise<PostActionResult> {
  const access = await requireAdmin("standard");
  if (!access.ok) return { ok: false, message: access.message || MESSAGES.forbidden };

  const validated = validateInput({ ...input, id: undefined });
  if (!validated.ok) return { ok: false, message: validated.message };
  const post = validated.input;

  try {
    const [result] = await getPool().execute<ResultSetHeader>(
      `INSERT INTO posts
         (type, title, content, excerpt, status, posted_at, company, location, job_type,
          salary, deadline, qualifications, apply_link, images, featured, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON), ?, ?, ?)`,
      [
        post.type,
        post.title,
        post.content,
        postExcerpt(post.content),
        post.status,
        post.postedAt,
        post.company || null,
        post.location || null,
        post.jobType || null,
        post.salary || null,
        post.deadline || null,
        post.qualifications || null,
        post.applyLink || null,
        JSON.stringify(post.images),
        post.featured ? 1 : 0,
        access.admin.id,
        access.admin.id,
      ],
    );

    const id = Number(result.insertId);
    await logPostActivity(
      access.admin,
      `${post.status === "Published" ? "Published" : "Saved draft"}: ${post.title}`,
      id,
    );
    return {
      ok: true,
      message: post.status === "Published" ? "Post published." : "Draft saved.",
    };
  } catch (error) {
    if ((error as { code?: string }).code === "ER_DUP_ENTRY") {
      return { ok: false, message: MESSAGES.duplicate };
    }
    console.error("[posts] Create failed:", error);
    return { ok: false, message: MESSAGES.failed };
  }
}

export async function updatePost(input: PostInput): Promise<PostActionResult> {
  const access = await requireAdmin("standard");
  if (!access.ok) return { ok: false, message: access.message || MESSAGES.forbidden };
  if (!input.id) return { ok: false, message: "Choose a post to update." };

  const validated = validateInput(input);
  if (!validated.ok) return { ok: false, message: validated.message };
  const post = validated.input;

  try {
    await ensureSoftDeleteColumns();
    const [existing] = await getPool().execute<PostRow[]>(
      `SELECT images ${FROM_POSTS} WHERE p.id = ? AND COALESCE(p.is_deleted, 0) = 0`,
      [input.id],
    );
    if (existing.length === 0) return { ok: false, message: "That post no longer exists." };

    const previousImages = parseImages(existing[0]?.images ?? null);

    await getPool().execute(
      `UPDATE posts
          SET type = ?, title = ?, content = ?, excerpt = ?, status = ?, posted_at = ?,
              company = ?, location = ?, job_type = ?, salary = ?, deadline = ?,
              qualifications = ?, apply_link = ?, images = CAST(? AS JSON), featured = ?,
              updated_by = ?
        WHERE id = ?`,
      [
        post.type,
        post.title,
        post.content,
        postExcerpt(post.content),
        post.status,
        post.postedAt,
        post.company || null,
        post.location || null,
        post.jobType || null,
        post.salary || null,
        post.deadline || null,
        post.qualifications || null,
        post.applyLink || null,
        JSON.stringify(post.images),
        post.featured ? 1 : 0,
        access.admin.id,
        input.id,
      ],
    );

    const removed = previousImages.filter((url) => !post.images.includes(url));
    await deleteBlobs(removed);
    await logPostActivity(
      access.admin,
      `${post.status === "Published" ? "Updated" : "Moved to draft"}: ${post.title}`,
      input.id,
    );
    return { ok: true, message: post.status === "Published" ? "Post updated." : "Draft saved." };
  } catch (error) {
    if ((error as { code?: string }).code === "ER_DUP_ENTRY") {
      return { ok: false, message: MESSAGES.duplicate };
    }
    console.error("[posts] Update failed:", error);
    return { ok: false, message: MESSAGES.failed };
  }
}

export async function setPostStatus(id: number, status: PostStatus): Promise<PostActionResult> {
  const access = await requireAdmin("standard");
  if (!access.ok) return { ok: false, message: access.message || MESSAGES.forbidden };
  if (!isPostStatus(status)) return { ok: false, message: "Choose a valid post status." };

  try {
    await ensureSoftDeleteColumns();
    const [result] = await getPool().execute<ResultSetHeader>(
      `UPDATE posts SET status = ?, updated_by = ? WHERE id = ? AND COALESCE(is_deleted, 0) = 0`,
      [status, access.admin.id, id],
    );
    if (result.affectedRows === 0) return { ok: false, message: "That post no longer exists." };
    await logPostActivity(
      access.admin,
      `${status === "Published" ? "Published" : "Unpublished"} post #${id}`,
      id,
    );
    return { ok: true, message: status === "Published" ? "Post published." : "Post moved to draft." };
  } catch (error) {
    console.error("[posts] Status update failed:", error);
    return { ok: false, message: MESSAGES.failed };
  }
}

export async function deletePost(id: number): Promise<PostActionResult> {
  const access = await requireAdmin("standard");
  if (!access.ok) return { ok: false, message: access.message || MESSAGES.forbidden };

  try {
    await ensureSoftDeleteColumns();
    const [existing] = await getPool().execute<PostRow[]>(
      `SELECT p.title, p.images FROM posts p WHERE p.id = ? AND COALESCE(p.is_deleted, 0) = 0`,
      [id],
    );
    if (existing.length === 0) return { ok: false, message: "That post no longer exists." };

    const title = existing[0]?.title ?? `#${id}`;
    // Soft delete: keep images/row for the Head Admin Recycle Bin (7-day purge).
    await getPool().execute(
      `UPDATE posts SET is_deleted = 1, deleted_at = UTC_TIMESTAMP() WHERE id = ?`,
      [id],
    );
    await logPostActivity(access.admin, `Deleted post: ${title}`, null);
    return { ok: true, message: "Post deleted." };
  } catch (error) {
    console.error("[posts] Delete failed:", error);
    return { ok: false, message: MESSAGES.failed };
  }
}

/**
 * Stores a compressed data URL in Vercel Blob and returns its public URL.
 * The browser sends a base64 string so the request stays small and avoids
 * multipart parsing inside a serverless function.
 */
export async function uploadPostImage(dataUrl: string): Promise<PostImageUploadResult> {
  const access = await requireAdmin("standard");
  if (!access.ok) return { ok: false, message: access.message || MESSAGES.forbidden };

  const match = /^data:(image\/(?:png|jpeg|jpg|webp));base64,([A-Za-z0-9+/=\s]+)$/i.exec(
    (dataUrl ?? "").trim(),
  );
  if (!match) {
    return { ok: false, message: "Upload a PNG, JPG, or WebP image." };
  }

  const mime = match[1]!.toLowerCase() === "image/jpg" ? "image/jpeg" : match[1]!.toLowerCase();
  const extension = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  const buffer = Buffer.from(match[2]!, "base64");

  if (buffer.byteLength === 0) return { ok: false, message: "The selected image is empty." };
  if (buffer.byteLength > MAX_IMAGE_BYTES) {
    return {
      ok: false,
      message: `That image is too large (${Math.round(buffer.byteLength / 1024)} KB). Use an image under 3 MB.`,
    };
  }

  const token = process.env["BLOB_READ_WRITE_TOKEN"]?.trim();
  if (!token) {
    console.error("[posts] BLOB_READ_WRITE_TOKEN is not configured.");
    return {
      ok: false,
      message: "Image storage is not configured yet. Add BLOB_READ_WRITE_TOKEN to the deployment.",
    };
  }

  try {
    const now = new Date();
    const pathname = `posts/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(
      2,
      "0",
    )}/${randomUUID()}.${extension}`;
    const blob = await put(pathname, buffer, {
      access: "public",
      contentType: mime,
      addRandomSuffix: false,
      token,
    });
    return { ok: true, url: blob.url };
  } catch (error) {
    console.error("[posts] Blob upload failed:", error);
    return { ok: false, message: "The image could not be uploaded. Please try again." };
  }
}

/** Removes previously uploaded blobs; silently skips external/unknown URLs. */
async function deleteBlobs(urls: string[]) {
  const token = process.env["BLOB_READ_WRITE_TOKEN"]?.trim();
  if (!token || urls.length === 0) return;

  const owned = urls.filter((url) => {
    try {
      return new URL(url).hostname.endsWith(BLOB_HOST_SUFFIX);
    } catch {
      return false;
    }
  });
  if (owned.length === 0) return;

  try {
    await del(owned, { token });
  } catch (error) {
    console.error("[posts] Blob cleanup failed:", error);
  }
}
