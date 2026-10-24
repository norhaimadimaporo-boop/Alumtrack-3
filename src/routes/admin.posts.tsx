import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Megaphone, Newspaper, Briefcase, Eye, Pencil, Trash2, ImagePlus } from "lucide-react";
import photoValidation from "@/assets/posts/announcement-validation.jpg";
import photoHomecoming from "@/assets/posts/homecoming.jpg";
import photoJob from "@/assets/posts/job-developer.jpg";
import photoOfficeHours from "@/assets/posts/office-hours.jpg";
import { AdminShell } from "@/components/admin-shell";
import { Modal, LabeledInput, PrimaryButton } from "@/components/modal";

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
  component: AdminPosts,
});

const TYPES = ["Announcement", "News / Event", "Job Offering"] as const;

type Post = {
  id: number;
  type: string;
  title: string;
  date: string;
  status: string;
  content?: string;
  company?: string;
  location?: string;
  jobType?: string;
  salary?: string;
  deadline?: string;
  qualifications?: string;
  applyLink?: string;
  photo?: string;
};

const POSTS: Post[] = [
  {
    id: 1,
    type: "Announcement",
    title: "Alumni data validation drive extended until September",
    date: "05-08-2026",
    status: "Published",
    content:
      "All registered alumni are requested to validate their employment and contact details until 30 September 2026.",
    photo: photoValidation,
  },
  {
    id: 2,
    type: "News / Event",
    title: "MSU Grand Alumni Homecoming 2026",
    date: "01-08-2026",
    status: "Published",
    content:
      "The Grand Alumni Homecoming will be held at the MSU Main Campus Gymnasium with batch reunions and an awards night.",
    photo: photoHomecoming,
  },
  {
    id: 3,
    type: "Job Offering",
    title: "Junior Software Developer — Accenture Philippines",
    date: "28-07-2026",
    status: "Published",
    company: "Accenture Philippines",
    location: "Taguig City, NCR",
    jobType: "Full-time",
    salary: "PHP 35,000 – 45,000 / month",
    deadline: "30-08-2026",
    content:
      "Join a delivery team building enterprise web applications for international clients. Fresh graduates of IT and Computer Science are welcome to apply.",
    qualifications:
      "Baccalaureate degree in IT, CS, or related field; basic knowledge of JavaScript and SQL; willing to work on-site in Taguig City.",
    applyLink: "https://careers.accenture.com/ph/junior-software-developer",
    photo: photoJob,
  },
  {
    id: 4,
    type: "Announcement",
    title: "OARCC office hours during the semestral break",
    date: "20-07-2026",
    status: "Draft",
    content: "The OARCC will be open Monday to Friday, 8:00 AM to 3:00 PM, during the break.",
    photo: photoOfficeHours,
  },
];

const icons = {
  Announcement: Megaphone,
  "News / Event": Newspaper,
  "Job Offering": Briefcase,
} as const;

function AdminPosts() {
  const [composing, setComposing] = useState<string | null>(null);
  const [filter, setFilter] = useState("All");
  const [viewing, setViewing] = useState<Post | null>(null);
  const [deleting, setDeleting] = useState<Post | null>(null);

  const rows = POSTS.filter((p) => filter === "All" || p.type === filter);

  return (
    <AdminShell
      title="Engagement Network"
      subtitle="Post announcements, news & events, and job offerings."
      action={
        <button
          onClick={() => setComposing(TYPES[0])}
          className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-2 text-xs font-semibold text-brand-foreground hover:bg-brand-dark"
        >
          <Plus className="size-3.5" /> New post
        </button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        {TYPES.map((t) => {
          const Icon = icons[t];
          return (
            <button
              key={t}
              onClick={() => setComposing(t)}
              className="rounded-lg border border-border bg-card p-5 text-left transition-colors hover:border-brand"
            >
              <Icon className="size-5 text-brand" />
              <p className="mt-3 text-sm font-bold text-foreground">Post {t}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Publish to the alumni dashboard and public pages.
              </p>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {["All", ...TYPES].map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
              filter === t
                ? "border-brand bg-brand text-brand-foreground"
                : "border-border text-muted-foreground hover:border-brand"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <ul className="mt-4 space-y-3">
        {rows.map((p) => (
          <li
            key={p.id}
            className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border bg-card p-5"
          >
            {p.photo && (
              <img
                src={p.photo}
                alt=""
                loading="lazy"
                className="size-20 shrink-0 rounded-lg object-cover"
              />
            )}
            <div className="min-w-0">
              <span className="rounded-sm bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                {p.type}
              </span>
              <p className="mt-2 text-sm font-semibold leading-snug text-foreground">{p.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">Posted {p.date}</p>
            </div>
            <div className="text-right">
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                  p.status === "Published"
                    ? "bg-success text-success-foreground"
                    : "bg-highlight text-highlight-foreground"
                }`}
              >
                {p.status}
              </span>
              <div className="mt-2 flex items-center justify-end gap-3">
                <button
                  onClick={() => setViewing(p)}
                  className="flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                >
                  <Eye className="size-3" /> View
                </button>
                <button
                  onClick={() => setDeleting(p)}
                  className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-brand hover:underline"
                >
                  <Trash2 className="size-3" /> Delete
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {viewing && (
        <Modal title={viewing.title} onClose={() => setViewing(null)}>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wide">
              <span className="rounded-sm bg-muted px-2 py-0.5 text-muted-foreground">
                {viewing.type}
              </span>
              <span className="rounded-sm bg-muted px-2 py-0.5 text-muted-foreground">
                Posted {viewing.date}
              </span>
              <span className="rounded-sm bg-muted px-2 py-0.5 text-muted-foreground">
                {viewing.status}
              </span>
            </div>

            {viewing.photo && (
              <img
                src={viewing.photo}
                alt=""
                loading="lazy"
                className="w-full rounded-lg object-cover"
              />
            )}

            {viewing.type === "Job Offering" ? (
              <div className="space-y-3">
                <div className="rounded-lg border-t-4 border-brand bg-card p-4">
                  <p className="flex items-center gap-2 text-sm font-bold text-foreground">
                    <Briefcase className="size-4 text-brand" /> {viewing.company}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{viewing.location}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wide">
                    <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-brand">
                      {viewing.jobType}
                    </span>
                    <span className="rounded-full bg-success/15 px-2.5 py-0.5 text-success">
                      {viewing.salary}
                    </span>
                    <span className="rounded-full bg-highlight px-2.5 py-0.5 text-highlight-foreground">
                      Deadline {viewing.deadline}
                    </span>
                  </div>
                </div>

                <div className="rounded-lg border border-border p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-brand">
                    Job description
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    {viewing.content}
                  </p>
                </div>

                <div className="rounded-lg border border-border p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-brand">
                    Qualifications
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    {viewing.qualifications}
                  </p>
                </div>

                <div className="rounded-lg border border-border p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-brand">
                    Apply link
                  </p>
                  <p className="mt-1.5 break-all text-xs text-muted-foreground">
                    {viewing.applyLink}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{viewing.content}</p>
            )}


            <button
              type="button"
              onClick={() => {
                setComposing(viewing.type);
                setViewing(null);
              }}
              className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-2 text-xs font-semibold text-brand-foreground hover:bg-brand-dark"
            >
              <Pencil className="size-3.5" /> Edit post
            </button>
          </div>
        </Modal>
      )}

      {deleting && (
        <Modal title="Delete post" onClose={() => setDeleting(null)}>
          <p className="text-sm text-muted-foreground">
            Remove <span className="font-semibold text-foreground">{deleting.title}</span> from
            the alumni dashboard and public pages?
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              onClick={() => setDeleting(null)}
              className="rounded-md border border-border py-2.5 text-sm font-semibold text-foreground hover:border-brand"
            >
              Cancel
            </button>
            <button
              onClick={() => setDeleting(null)}
              className="rounded-md bg-brand py-2.5 text-sm font-semibold text-brand-foreground hover:bg-brand-dark"
            >
              Delete post
            </button>
          </div>
        </Modal>
      )}

      {composing && (
        <Modal title={`Post ${composing}`} onClose={() => setComposing(null)}>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setComposing(null);
            }}
          >
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Post type
              </label>
              <select
                defaultValue={composing}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
              >
                {TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <LabeledInput label="Title" />
            <LabeledInput label="Date" placeholder="DD-MM-YYYY" />
            {composing === "Job Offering" && (
              <>
                <LabeledInput label="Company / Agency name" />
                <LabeledInput label="Location" />
                <div className="grid grid-cols-2 gap-3">
                  <LabeledInput label="Employment type" placeholder="Full-time" />
                  <LabeledInput label="Salary" placeholder="PHP 35,000 – 45,000 / month" />
                </div>
                <LabeledInput label="Application deadline" placeholder="DD-MM-YYYY" />
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Qualifications
                  </label>
                  <textarea
                    rows={3}
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
                  />
                </div>
                <LabeledInput
                  label="Apply link"
                  placeholder="https://company.com/careers/apply"
                />
                <p className="text-[11px] text-muted-foreground">
                  Alumni who click “Apply” on their dashboard are redirected to this link.
                </p>
              </>
            )}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Content
              </label>
              <textarea
                rows={5}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Photos
              </label>
              <label className="mt-1 flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border px-4 py-6 text-center transition-colors hover:border-brand">
                <ImagePlus className="size-5 text-brand" />
                <span className="text-xs font-semibold text-foreground">Add photos</span>
                <span className="text-[11px] text-muted-foreground">
                  Click to upload or drag and drop — JPG or PNG, up to 5 images.
                </span>
                <input type="file" accept="image/*" multiple className="hidden" />
              </label>
            </div>
            <PrimaryButton type="submit">Publish post</PrimaryButton>
          </form>
        </Modal>
      )}
    </AdminShell>
  );
}
