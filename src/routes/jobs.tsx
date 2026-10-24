import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Briefcase, MapPin, Building2, CalendarDays } from "lucide-react";
import { AlumniShell } from "@/components/alumni-shell";
import { Modal } from "@/components/modal";

export const Route = createFileRoute("/jobs")({
  head: () => ({
    meta: [
      { title: "Job Offerings — AlumTrack MSU Main Campus" },
      {
        name: "description",
        content:
          "Browse job offerings posted by OARCC partner companies, open the full details, and apply as an MSU Main Campus alumnus.",
      },
      { property: "og:title", content: "Job Offerings — AlumTrack" },
      {
        property: "og:description",
        content: "Job openings from OARCC partner companies, open to MSU alumni.",
      },
    ],
  }),
  component: JobsPage,
});

type Job = {
  id: number;
  title: string;
  company: string;
  location: string;
  type: string;
  posted: string;
  salary: string;
  deadline: string;
  description: string;
  qualifications: string[];
  applyLink: string;
};

const JOBS: Job[] = [
  {
    id: 1,
    title: "Junior Software Developer",
    company: "Accenture Philippines",
    location: "Taguig City, NCR",
    type: "Full-time",
    posted: "2 days ago",
    salary: "PHP 35,000 – 45,000 / month",
    deadline: "30-08-2026",
    description:
      "Join a delivery team building enterprise web applications for international clients. Fresh graduates of IT and Computer Science are welcome to apply.",
    qualifications: [
      "Baccalaureate degree in IT, CS, or related field",
      "Basic knowledge of JavaScript and SQL",
      "Willing to work on-site in Taguig City",
    ],
    applyLink: "https://careers.accenture.com/ph/junior-software-developer",
  },
  {
    id: 2,
    title: "IT Support Officer",
    company: "Lanao del Sur Provincial Government",
    location: "Marawi City, BARMM",
    type: "Contractual",
    posted: "5 days ago",
    salary: "SG 11 — PHP 27,000 / month",
    deadline: "22-08-2026",
    description:
      "Maintain provincial office network and end-user hardware, and assist offices with system troubleshooting.",
    qualifications: [
      "Graduate of any IT-related course",
      "At least 1 year of technical support experience",
      "Residents of Lanao del Sur preferred",
    ],
    applyLink: "https://lanaodelsur.gov.ph/careers/it-support-officer",
  },
  {
    id: 3,
    title: "Civil Engineer II",
    company: "DPWH Region X",
    location: "Cagayan de Oro City",
    type: "Permanent",
    posted: "1 week ago",
    salary: "SG 16 — PHP 39,672 / month",
    deadline: "05-09-2026",
    description:
      "Supervise infrastructure projects, prepare program of works, and validate contractor accomplishment reports.",
    qualifications: [
      "Licensed Civil Engineer",
      "At least 2 years of relevant experience",
      "Willing to be assigned to field offices",
    ],
    applyLink: "https://dpwh.gov.ph/careers/civil-engineer-ii",
  },
  {
    id: 4,
    title: "Staff Accountant",
    company: "SGV & Co.",
    location: "Davao City",
    type: "Full-time",
    posted: "1 week ago",
    salary: "PHP 30,000 – 38,000 / month",
    deadline: "12-09-2026",
    description:
      "Handle audit engagements for mid-sized clients in Mindanao, including fieldwork and working paper preparation.",
    qualifications: [
      "BS Accountancy graduate",
      "CPA licensure an advantage",
      "Strong Excel and analytical skills",
    ],
    applyLink: "https://sgv.ph/careers/staff-accountant",
  },
  {
    id: 5,
    title: "Senior High School Teacher",
    company: "DepEd Marawi City Division",
    location: "Marawi City, BARMM",
    type: "Permanent",
    posted: "2 weeks ago",
    salary: "SG 11 — PHP 27,000 / month",
    deadline: "28-08-2026",
    description:
      "Teach STEM subjects for Grades 11 and 12 and assist in co-curricular student activities.",
    qualifications: [
      "BSEd graduate with LET eligibility",
      "Specialization in Mathematics or Science",
      "Good communication skills in Meranaw and English",
    ],
    applyLink: "https://depedmarawi.gov.ph/hiring/shs-teacher",
  },
];

function JobsPage() {
  const [selected, setSelected] = useState<Job | null>(null);

  return (
    <AlumniShell
      title="Job Offerings"
      subtitle="Click a job to view the full details, then apply."
    >
      <ul className="grid gap-3 md:grid-cols-2">
        {JOBS.map((j) => (
          <li key={j.id}>
            <button
              onClick={() => setSelected(j)}
              className="w-full rounded-lg border border-border bg-card p-5 text-left transition-colors hover:border-brand"
            >
              <span className="inline-flex items-center gap-1.5 rounded-sm bg-highlight px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-highlight-foreground">
                <Briefcase className="size-3" /> {j.type}
              </span>
              <h3 className="mt-3 text-sm font-bold leading-snug text-foreground">{j.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{j.company}</p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="size-3.5 text-brand" />
                {j.location}
              </p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">Posted {j.posted}</span>
                <span className="text-xs font-semibold text-brand">View details</span>
              </div>
            </button>
          </li>
        ))}
      </ul>

      {selected && (
        <Modal title={selected.title} onClose={() => setSelected(null)}>
          <div className="space-y-4">
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <p className="flex items-center gap-1.5">
                <Building2 className="size-3.5 text-brand" /> {selected.company}
              </p>
              <p className="flex items-center gap-1.5">
                <MapPin className="size-3.5 text-brand" /> {selected.location}
              </p>
              <p className="flex items-center gap-1.5">
                <Briefcase className="size-3.5 text-brand" /> {selected.type} · {selected.salary}
              </p>
              <p className="flex items-center gap-1.5">
                <CalendarDays className="size-3.5 text-brand" /> Deadline: {selected.deadline}
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wide text-foreground">
                Job description
              </h4>
              <p className="mt-1.5 text-sm text-muted-foreground">{selected.description}</p>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wide text-foreground">
                Qualifications
              </h4>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {selected.qualifications.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </div>

            <a
              href={selected.applyLink}
              target="_blank"
              rel="noreferrer"
              className="block w-full rounded-md bg-brand py-2.5 text-center text-sm font-semibold text-brand-foreground hover:bg-brand-dark"
            >
              Apply
            </a>
          </div>
        </Modal>
      )}
    </AlumniShell>
  );
}
