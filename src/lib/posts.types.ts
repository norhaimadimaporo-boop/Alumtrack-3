/** Shared types for OARCC posts (News, Events, Announcements, Job Offerings). */

export type PostType = "Announcement" | "News / Event" | "Job Offering";
export type PostStatus = "Published" | "Draft";

/** Admin-facing labels. The stored enum stays unchanged; News and Events are separate here. */
export const POST_TYPE_LABELS: Record<PostType, string> = {
  Announcement: "News",
  "News / Event": "Events",
  "Job Offering": "Job Offering",
};
/** Public-facing category used by /news and /jobs. */
export type PostCategory = "News" | "Event" | "Job";

/** Card and banner summary: the opening of the content, cut at a word boundary. */
export function postExcerpt(content: string, max = 180): string {
  const plain = content.replace(/\s+/g, " ").trim();
  if (plain.length <= max) return plain;
  const cut = plain.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

export type PostRecord = {
  id: number;
  type: PostType;
  category: PostCategory;
  title: string;
  content: string;
  status: PostStatus;
  /** ISO date (YYYY-MM-DD) for form inputs and `datetime` values. */
  postedAt: string;
  /** Display date (DD-MM-YYYY). */
  date: string;
  company: string;
  location: string;
  jobType: string;
  salary: string;
  /** Display date (DD-MM-YYYY). */
  deadline: string;
  /** ISO date (YYYY-MM-DD). */
  deadlineIso: string;
  qualifications: string[];
  applyLink: string;
  images: string[];
  featured: boolean;
  author: string;
  createdAt: string;
};

export type PostInput = {
  id?: number | undefined;
  type: PostType;
  title: string;
  content: string;
  status: PostStatus;
  postedAt: string;
  company: string;
  location: string;
  jobType: string;
  salary: string;
  deadline: string;
  qualifications: string;
  applyLink: string;
  images: string[];
  featured: boolean;
};

export type PostActionResult = { ok: true; message: string } | { ok: false; message: string };

export type PostListResult =
  | { ok: true; posts: PostRecord[] }
  | { ok: false; message: string; posts: [] };

export type PostImageUploadResult = { ok: true; url: string } | { ok: false; message: string };
