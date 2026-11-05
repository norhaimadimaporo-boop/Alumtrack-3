import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useRef, useState, type FormEvent } from "react";
import {
  Plus,
  Megaphone,
  Newspaper,
  Briefcase,
  Eye,
  Pencil,
  Trash2,
  ImagePlus,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Star,
} from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { Modal, LabeledInput, PrimaryButton } from "@/components/modal";
import { useAdminRole } from "@/hooks/use-session";
import {
  createPostRecord,
  deletePostRecord,
  getAdminPosts,
  setPostStatusRecord,
  updatePostRecord,
  uploadPostImageFile,
} from "@/lib/posts.functions";
import type { PostInput, PostRecord, PostStatus, PostType } from "@/lib/posts.types";

export const Route = createFileRoute("/admin/posts")({
  head: () => ({
    meta: [
      { title: "Engagement Network — AlumTrack Admin" },
      {
        name: "description",
        content:
          "Post announcements, news and events, and job offerings for MSU Main Campus alumni from the OARCC admin console.",
      },
      { property: "og:title", content: "Engagement Network — AlumTrack Admin" },
      {
        property: "og:description",
        content: "Publish announcements, news & events, and job offerings.",
      },
    ],
  }),
  loader: async () => getAdminPosts(),
  component: AdminPosts,
});

const TYPES: PostType[] = ["Announcement", "News / Event", "Job Offering"];
const MAX_IMAGES = 5;

const icons = {
  Announcement: Megaphone,
  "News / Event": Newspaper,
  "Job Offering": Briefcase,
} as const;

const typeStyles: Record<PostType, string> = {
  Announcement: "bg-brand/10 text-brand",
  "News / Event": "bg-highlight/30 text-highlight-foreground",
  "Job Offering": "bg-success/12 text-success",
};

function todayIso() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function blankPost(type: PostType): PostInput {
  return {
    type,
    title: "",
    content: "",
    excerpt: "",
    status: "Published",
    postedAt: todayIso(),
    company: "",
    location: "",
    jobType: "",
    salary: "",
    deadline: "",
    qualifications: "",
    applyLink: "",
    images: [],
    featured: false,
  };
}

function toForm(post: PostRecord): PostInput {
  return {
    id: post.id,
    type: post.type,
    title: post.title,
    content: post.content,
    excerpt: post.excerpt,
    status: post.status,
    postedAt: post.postedAt || todayIso(),
    company: post.company,
    location: post.location,
    jobType: post.jobType,
    salary: post.salary,
    deadline: post.deadlineIso,
    qualifications: post.qualifications.join("\n"),
    applyLink: post.applyLink,
    images: post.images,
    featured: post.featured,
  };
}

/** Resize + re-encode in the browser so uploads stay far below the function body limit. */
async function compressImage(file: File, maxSize = 1600, quality = 0.78): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Only image files can be attached.");
  if (file.size > 15 * 1024 * 1024) throw new Error("Choose an image smaller than 15 MB.");

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("That image could not be read."));
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error("That image could not be decoded."));
    element.src = dataUrl;
  });

  const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return dataUrl;
  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}

function AdminPosts() {
  const data = Route.useLoaderData();
  const router = useRouter();
  const adminRole = useAdminRole();
  const canManage = adminRole === "head" || adminRole === "standard";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [typeFilter, setTypeFilter] = useState<PostType | "All">("All");
  const [statusFilter, setStatusFilter] = useState<PostStatus | "All">("All");
  const [composing, setComposing] = useState<PostInput | null>(null);
  const [viewing, setViewing] = useState<PostRecord | null>(null);
  const [deleting, setDeleting] = useState<PostRecord | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const posts = data.ok ? data.posts : [];
  const rows = posts.filter(
    (post) =>
      (typeFilter === "All" || post.type === typeFilter) &&
      (statusFilter === "All" || post.status === statusFilter),
  );

  const published = posts.filter((post) => post.status === "Published").length;
  const drafts = posts.length - published;

  function flash(message: string) {
    setError("");
    setNotice(message);
  }

  function fail(message: string) {
    setNotice("");
    setError(message);
  }

  async function refresh() {
    await router.invalidate();
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0 || !composing) return;
    const remaining = MAX_IMAGES - composing.images.length;
    if (remaining <= 0) {
      fail(`You can attach up to ${MAX_IMAGES} images per post.`);
      return;
    }

    const picked = Array.from(files).slice(0, remaining);
    if (picked.length < files.length) {
      fail(`Only ${remaining} more image(s) can be attached. Extra files were skipped.`);
    }

    setUploading(true);
    setError("");
    for (const file of picked) {
      try {
        const dataUrl = await compressImage(file);
        const result = await uploadPostImageFile({ data: { dataUrl } });
        if (!result.ok) {
          fail(result.message);
          continue;
        }
        setComposing((current) =>
          current ? { ...current, images: [...current.images, result.url].slice(0, MAX_IMAGES) } : current,
        );
      } catch (uploadError) {
        fail(uploadError instanceof Error ? uploadError.message : "The image could not be uploaded.");
      }
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeImage(url: string) {
    setComposing((current) =>
      current ? { ...current, images: current.images.filter((item) => item !== url) } : current,
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!composing) return;
    setSaving(true);
    setError("");
    try {
      const result = composing.id
        ? await updatePostRecord({ data: composing })
        : await createPostRecord({ data: composing });
      if (!result.ok) {
        fail(result.message);
        return;
      }
      setComposing(null);
      flash(result.message);
      await refresh();
    } catch (submitError) {
      console.error(submitError);
      fail("The post could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(post: PostRecord) {
    const next: PostStatus = post.status === "Published" ? "Draft" : "Published";
    setBusyId(post.id);
    setError("");
    try {
      const result = await setPostStatusRecord({ data: { id: post.id, status: next } });
      if (!result.ok) {
        fail(result.message);
        return;
      }
      flash(result.message);
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusyId(deleting.id);
    setError("");
    try {
      const result = await deletePostRecord({ data: { id: deleting.id } });
      if (!result.ok) {
        fail(result.message);
        return;
      }
      setDeleting(null);
      flash(result.message);
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AdminShell
      title="Engagement Network"
      subtitle="Post announcements, news & events, and job offerings."
      action={
        canManage ? (
          <button
            onClick={() => {
              setError("");
              setComposing(blankPost("Announcement"));
            }}
            className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-2 text-xs font-semibold text-brand-foreground hover:bg-brand-dark"
          >
            <Plus className="size-3.5" /> New post
          </button>
        ) : undefined
      }
    >
      {!data.ok && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{data.message}</span>
        </div>
      )}

      {notice && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-success/30 bg-success/10 p-4 text-sm text-success">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}
      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        {TYPES.map((type) => {
          const Icon = icons[type];
          return (
            <button
              key={type}
              onClick={() => {
                if (canManage) {
                  setError("");
                  setNotice("");
                  setComposing(blankPost(type));
                }
              }}
              disabled={!canManage}
              className="rounded-lg border border-border bg-card p-5 text-left transition-colors hover:border-brand disabled:cursor-default disabled:hover:border-border"
            >
              <Icon className="size-5 text-brand" />
              <p className="mt-3 text-sm font-bold text-foreground">Post {type}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Publish to the alumni dashboard and public pages.
              </p>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {(["All", ...TYPES] as const).map((type) => (
          <button
            key={type}
            onClick={() => setTypeFilter(type)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
              typeFilter === type
                ? "border-brand bg-brand text-brand-foreground"
                : "border-border text-muted-foreground hover:border-brand"
            }`}
          >
            {type}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-border" />
        {(["All", "Published", "Draft"] as const).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
              statusFilter === status
                ? "border-brand bg-brand text-brand-foreground"
                : "border-border text-muted-foreground hover:border-brand"
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        {posts.length} post{posts.length === 1 ? "" : "s"} · {published} published · {drafts} draft
        {drafts === 1 ? "" : "s"}
      </p>

      <ul className="mt-4 space-y-3">
        {rows.length === 0 && (
          <li className="rounded-lg border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            No posts match this filter yet.
          </li>
        )}
        {rows.map((post) => (
          <li
            key={post.id}
            className="flex flex-wrap items-start gap-3 rounded-lg border border-border bg-card p-5"
          >
            {post.images[0] ? (
              <img
                src={post.images[0]}
                alt=""
                loading="lazy"
                className="size-20 shrink-0 rounded-lg object-cover"
              />
            ) : (
              <div className="flex size-20 shrink-0 items-center justify-center rounded-lg bg-secondary">
                {(() => {
                  const Icon = icons[post.type];
                  return <Icon className="size-6 text-muted-foreground" />;
                })()}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-sm px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${typeStyles[post.type]}`}
                >
                  {post.type}
                </span>
                {post.featured && (
                  <span className="inline-flex items-center gap-1 rounded-sm bg-highlight px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-highlight-foreground">
                    <Star className="size-3" /> Featured
                  </span>
                )}
                {post.images.length > 1 && (
                  <span className="text-[11px] text-muted-foreground">
                    {post.images.length} images
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm font-semibold leading-snug text-foreground">{post.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Posted {post.date || "—"} · by {post.author}
              </p>
            </div>

            <div className="text-right">
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                  post.status === "Published"
                    ? "bg-success text-success-foreground"
                    : "bg-highlight text-highlight-foreground"
                }`}
              >
                {post.status}
              </span>
              <div className="mt-2 flex flex-wrap items-center justify-end gap-3">
                <button
                  onClick={() => setViewing(post)}
                  className="flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                >
                  <Eye className="size-3" /> View
                </button>
                {canManage && (
                  <>
                    <button
                      onClick={() => {
                        setError("");
                        setNotice("");
                        setComposing(toForm(post));
                      }}
                      className="flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                    >
                      <Pencil className="size-3" /> Edit
                    </button>
                    <button
                      disabled={busyId === post.id}
                      onClick={() => toggleStatus(post)}
                      className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-brand hover:underline disabled:opacity-50"
                    >
                      {busyId === post.id ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <CheckCircle2 className="size-3" />
                      )}
                      {post.status === "Published" ? "Unpublish" : "Publish"}
                    </button>
                    <button
                      onClick={() => setDeleting(post)}
                      className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-destructive hover:underline"
                    >
                      <Trash2 className="size-3" /> Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {viewing && (
        <Modal title={viewing.title} onClose={() => setViewing(null)} wide>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wide">
              <span className={`rounded-sm px-2 py-0.5 ${typeStyles[viewing.type]}`}>
                {viewing.type}
              </span>
              <span className="rounded-sm bg-muted px-2 py-0.5 text-muted-foreground">
                Posted {viewing.date || "—"}
              </span>
              <span className="rounded-sm bg-muted px-2 py-0.5 text-muted-foreground">
                {viewing.status}
              </span>
              {viewing.featured && (
                <span className="rounded-sm bg-highlight px-2 py-0.5 text-highlight-foreground">
                  Featured
                </span>
              )}
            </div>

            {viewing.images.length > 0 && (
              <div className="grid gap-2 sm:grid-cols-2">
                {viewing.images.map((url) => (
                  <img key={url} src={url} alt="" loading="lazy" className="w-full rounded-lg object-cover" />
                ))}
              </div>
            )}

            {viewing.type === "Job Offering" ? (
              <div className="space-y-3">
                <div className="rounded-lg border-t-4 border-brand bg-card p-4">
                  <p className="flex items-center gap-2 text-sm font-bold text-foreground">
                    <Briefcase className="size-4 text-brand" /> {viewing.company}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{viewing.location}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wide">
                    {viewing.jobType && (
                      <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-brand">
                        {viewing.jobType}
                      </span>
                    )}
                    {viewing.salary && (
                      <span className="rounded-full bg-success/15 px-2.5 py-0.5 text-success">
                        {viewing.salary}
                      </span>
                    )}
                    {viewing.deadline && (
                      <span className="rounded-full bg-highlight px-2.5 py-0.5 text-highlight-foreground">
                        Deadline {viewing.deadline}
                      </span>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-border p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-brand">Description</p>
                  <p className="mt-1.5 whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
                    {viewing.content}
                  </p>
                </div>

                {viewing.qualifications.length > 0 && (
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-brand">
                      Qualifications
                    </p>
                    <ul className="mt-1.5 list-disc space-y-1 pl-5 text-xs leading-relaxed text-muted-foreground">
                      {viewing.qualifications.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {viewing.applyLink && (
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-brand">Apply link</p>
                    <a
                      href={viewing.applyLink}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1.5 block break-all text-xs text-brand hover:underline"
                    >
                      {viewing.applyLink}
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {viewing.excerpt && (
                  <p className="text-sm font-medium leading-relaxed text-foreground">{viewing.excerpt}</p>
                )}
                <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {viewing.content}
                </p>
              </div>
            )}

            {canManage && (
              <button
                type="button"
                onClick={() => {
                  setComposing(toForm(viewing));
                  setViewing(null);
                }}
                className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-2 text-xs font-semibold text-brand-foreground hover:bg-brand-dark"
              >
                <Pencil className="size-3.5" /> Edit post
              </button>
            )}
          </div>
        </Modal>
      )}

      {canManage && deleting && (
        <Modal title="Delete post" onClose={() => setDeleting(null)}>
          <p className="text-sm text-muted-foreground">
            Remove <span className="font-semibold text-foreground">{deleting.title}</span> from the
            alumni dashboard and public pages? Uploaded images are deleted too.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              onClick={() => setDeleting(null)}
              className="rounded-md border border-border py-2.5 text-sm font-semibold text-foreground hover:border-brand"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              disabled={busyId === deleting.id}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-destructive py-2.5 text-sm font-semibold text-destructive-foreground hover:opacity-90 disabled:opacity-60"
            >
              {busyId === deleting.id && <Loader2 className="size-4 animate-spin" />}
              Delete post
            </button>
          </div>
        </Modal>
      )}

      {canManage && composing && (
        <Modal
          title={composing.id ? "Edit post" : `Post ${composing.type}`}
          onClose={() => setComposing(null)}
          wide
        >
          <form className="space-y-4" onSubmit={submit}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Post type
                </label>
                <select
                  value={composing.type}
                  onChange={(event) =>
                    setComposing({ ...composing, type: event.target.value as PostType })
                  }
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand"
                >
                  {TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Status
                </label>
                <select
                  value={composing.status}
                  onChange={(event) =>
                    setComposing({ ...composing, status: event.target.value as PostStatus })
                  }
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand"
                >
                  <option value="Published">Published</option>
                  <option value="Draft">Draft</option>
                </select>
              </div>
            </div>

            <LabeledInput
              label="Title"
              value={composing.title}
              onChange={(title) => setComposing({ ...composing, title })}
              required
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <LabeledInput
                label="Post date"
                type="date"
                value={composing.postedAt}
                onChange={(postedAt) => setComposing({ ...composing, postedAt })}
              />
              <label className="flex items-end gap-2 pb-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={composing.featured}
                  onChange={(event) =>
                    setComposing({ ...composing, featured: event.target.checked })
                  }
                  className="size-4 accent-brand"
                />
                Feature this post on the News page
              </label>
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Short summary <span className="font-normal normal-case">(optional)</span>
              </label>
              <textarea
                rows={2}
                value={composing.excerpt}
                onChange={(event) => setComposing({ ...composing, excerpt: event.target.value })}
                placeholder="Shown on cards. Leave blank to use the start of the content."
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand"
              />
            </div>

            {composing.type === "Job Offering" && (
              <>
                <LabeledInput
                  label="Company / Agency name"
                  value={composing.company}
                  onChange={(company) => setComposing({ ...composing, company })}
                  required
                />
                <LabeledInput
                  label="Location"
                  value={composing.location}
                  onChange={(location) => setComposing({ ...composing, location })}
                  required
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <LabeledInput
                    label="Employment type"
                    placeholder="Full-time"
                    value={composing.jobType}
                    onChange={(jobType) => setComposing({ ...composing, jobType })}
                  />
                  <LabeledInput
                    label="Salary"
                    placeholder="PHP 35,000 – 45,000 / month"
                    value={composing.salary}
                    onChange={(salary) => setComposing({ ...composing, salary })}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <LabeledInput
                    label="Application deadline"
                    type="date"
                    value={composing.deadline}
                    onChange={(deadline) => setComposing({ ...composing, deadline })}
                  />
                  <LabeledInput
                    label="Apply link"
                    placeholder="https://company.com/careers/apply"
                    value={composing.applyLink}
                    onChange={(applyLink) => setComposing({ ...composing, applyLink })}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Qualifications <span className="font-normal normal-case">(one per line)</span>
                  </label>
                  <textarea
                    rows={4}
                    value={composing.qualifications}
                    onChange={(event) =>
                      setComposing({ ...composing, qualifications: event.target.value })
                    }
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand"
                  />
                </div>
              </>
            )}

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Content
              </label>
              <textarea
                rows={6}
                value={composing.content}
                onChange={(event) => setComposing({ ...composing, content: event.target.value })}
                required
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Photos <span className="font-normal normal-case">(up to {MAX_IMAGES})</span>
              </label>

              {composing.images.length > 0 && (
                <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {composing.images.map((url) => (
                    <div key={url} className="group relative overflow-hidden rounded-lg border border-border">
                      <img src={url} alt="" className="h-20 w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(url)}
                        aria-label="Remove image"
                        className="absolute right-1 top-1 rounded-full bg-foreground/70 p-1 text-background opacity-90 transition-opacity hover:opacity-100"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <label
                className={`mt-2 flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border px-4 py-6 text-center transition-colors hover:border-brand ${
                  uploading || composing.images.length >= MAX_IMAGES
                    ? "pointer-events-none opacity-60"
                    : ""
                }`}
              >
                {uploading ? (
                  <Loader2 className="size-5 animate-spin text-brand" />
                ) : (
                  <ImagePlus className="size-5 text-brand" />
                )}
                <span className="text-xs font-semibold text-foreground">
                  {uploading ? "Uploading…" : "Add photos"}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  JPG, PNG, or WebP — compressed automatically, up to {MAX_IMAGES} images.
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  className="hidden"
                  disabled={uploading || composing.images.length >= MAX_IMAGES}
                  onChange={(event) => handleFiles(event.target.files)}
                />
              </label>
            </div>

            <PrimaryButton type="submit" disabled={saving || uploading}>
              {saving ? "Saving…" : composing.id ? "Save changes" : "Publish post"}
            </PrimaryButton>
          </form>
        </Modal>
      )}
    </AdminShell>
  );
}
