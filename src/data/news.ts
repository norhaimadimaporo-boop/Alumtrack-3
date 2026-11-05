import photoHomecoming from "@/assets/posts/homecoming.jpg";
import photoLaunch from "@/assets/posts/announcement-validation.jpg";
import photoCareerFair from "@/assets/posts/career-fair.jpg";
import photoGovJob from "@/assets/posts/job-developer.jpg";
import photoTracer from "@/assets/posts/tracer-survey.jpg";
import photoScholarship from "@/assets/posts/scholarship-fund.jpg";
import photoTechHiring from "@/assets/posts/tech-hiring.jpg";
import photoOfficeHours from "@/assets/posts/office-hours.jpg";

export type Post = {
  id: number;
  title: string;
  category: "News" | "Event" | "Job";
  date: string;
  excerpt: string;
  body: string;
  photo?: string;
  featured?: boolean;
};

export const POSTS: Post[] = [
  {
    id: 1,
    title: "MSU Grand Alumni Homecoming 2026 set for December",
    category: "Event",
    date: "August 1, 2026",
    excerpt:
      "The Office of Alumni Relations and Career Center invites all MSU Main Campus graduates to the Grand Alumni Homecoming at the University Gymnasium.",
    body: "Registration opens in October. Alumni are encouraged to update their AlumTrack profiles so the office can send confirmations and program schedules directly.",
    photo: photoHomecoming,
    featured: true,
  },
  {
    id: 2,
    title: "OARCC launches AlumTrack online alumni tracing portal",
    category: "News",
    date: "July 24, 2026",
    excerpt:
      "Graduates can now register, update employment records, and pin their workplace on the alumni map through a single online platform.",
    body: "AlumTrack replaces the paper profile forms and spreadsheet records previously used by the office.",
    photo: photoLaunch,
  },
  {
    id: 3,
    title: "Career Fair 2026: 40 partner companies confirmed",
    category: "Event",
    date: "July 12, 2026",
    excerpt:
      "Graduating students and alumni may attend the two-day career fair at the Dimaporo Gymnasium with on-site interviews.",
    body: "Bring printed resumes and a valid ID. Pre-registration through OARCC is encouraged.",
    photo: photoCareerFair,
  },
  {
    id: 4,
    title: "Now hiring: IT Support Officers — Lanao del Sur Provincial Government",
    category: "Job",
    date: "July 5, 2026",
    excerpt:
      "Five plantilla positions are open to IT and Computer Science graduates of MSU Main Campus.",
    body: "Applications are accepted at the OARCC office until the end of the month.",
    photo: photoGovJob,
  },
  {
    id: 5,
    title: "Alumni tracer survey for Batch 2020–2024 now open",
    category: "News",
    date: "June 28, 2026",
    excerpt:
      "Results of the graduate tracer study will support program evaluation and AACCUP accreditation requirements.",
    body: "The survey takes about ten minutes and is available inside the alumni dashboard.",
    photo: photoTracer,
  },
  {
    id: 6,
    title: "Scholarship fund drive reaches its first milestone",
    category: "News",
    date: "June 10, 2026",
    excerpt:
      "Alumni donations have funded the first batch of student grantees under the OARCC assistance program.",
    body: "The office thanks all alumni chapters that contributed to the fund drive.",
    photo: photoScholarship,
  },
  {
    id: 7,
    title: "Now hiring: Junior Software Developers — Davao tech hub",
    category: "Job",
    date: "May 30, 2026",
    excerpt:
      "Open to fresh graduates with web development experience. Onsite and hybrid arrangements available.",
    body: "Interested alumni may email their resume to the OARCC placement desk.",
    photo: photoTechHiring,
  },
];

/**
 * The rows seeded into MySQL use shorter titles than the static examples
 * above, so map them explicitly and fall back to a loose normalized match.
 */
const PHOTO_ALIASES: Record<string, string> = {
  "MSU Grand Alumni Homecoming 2026": photoHomecoming,
  "Alumni data validation drive extended until September": photoLaunch,
  "Junior Software Developer — Accenture Philippines": photoGovJob,
  "OARCC office hours during the semestral break": photoOfficeHours,
};

function normalizeTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Best-effort photo for a DB post title, so seeded rows are not left blank. */
export function findPostPhoto(title: string): string | undefined {
  const trimmed = title.trim();
  if (!trimmed) return undefined;

  const alias = PHOTO_ALIASES[trimmed];
  if (alias) return alias;

  const target = normalizeTitle(trimmed);
  if (!target) return undefined;

  const exact = POSTS.find((post) => normalizeTitle(post.title) === target);
  if (exact?.photo) return exact.photo;

  const prefix = POSTS.find((post) => {
    const candidate = normalizeTitle(post.title);
    return candidate.startsWith(target) || target.startsWith(candidate);
  });
  return prefix?.photo;
}
