/** Shared types for OARCC posts (News, Events, Announcements, Job Offerings). */

export type PostType = "Announcement" | "News / Event" | "Job Offering";
export type PostStatus = "Published" | "Draft";
/** Public-facing category used by /news and /jobs. */
export type PostCategory = "News" | "Event" | "Job";

export type PostRecord = {
  id: number;
  type: PostType;
  category: PostCategory;
  title: string;
  content: string;
  excerpt: string;
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
  excerpt: string;
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
