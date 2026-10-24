import { createFileRoute } from "@tanstack/react-router";
import { Facebook, Mail, MapPin, Phone, Clock, Globe } from "lucide-react";

export const Route = createFileRoute("/oarcc")({
  head: () => ({
    meta: [
      { title: "OARCC — Office of Alumni Relations and Career Center | AlumTrack" },
      {
        name: "description",
        content:
          "Vision, mission, goals, core values, sections, and contact information of the MSU Office of Alumni Relations and Career Center.",
      },
      { property: "og:title", content: "Office of Alumni Relations and Career Center" },
      {
        property: "og:description",
        content:
          "The office behind AlumTrack — serving MSU Marawi alumni since 1972 under the Office of the President.",
      },
    ],
  }),
  component: OarccPage,
});

const GOALS = [
  "To maintain a strong alumni job placement program;",
  "To ensure optimum University-wide communication link through a sustained publication program and such other media as may be necessary;",
  "To evolve long-term projects aimed at soliciting alumni funding assistance for University programs and, if and when workable, to undertake similar projects aimed at soliciting funding assistance from other sources;",
  "To formulate plans and policies tending to improve the cooperation and support of the alumni towards the pursuit of the University's objectives;",
  "To serve as the MSU System Alumni Data Bank;",
  "To maintain an MSU System Alumni Web Portal;",
  "To coordinate alumni affairs of the University System;",
  "To establish linkages with the alumni of the University and all alumni chapters in the Philippines or elsewhere;",
  "To maintain a directory of the MSU System alumni and other statistical data of alumni importance; and",
  "To act as the personality extension of the University President and/or Campus Chancellor in promoting University-Alumni relations.",
];

const VALUES = [
  "Teamwork",
  "Excellence",
  "Transparency",
  "Equity",
  "Accountability",
  "Participative",
  "Commitment",
];

const SECTIONS = [
  {
    title: "Research and Multi-media Section",
    text: "Handles alumni research, data studies, publications, and the office's digital and media presence.",
  },
  {
    title: "Administrative Section",
    text: "Manages office records, correspondence, and the day-to-day administrative operations of OARCC.",
  },
  {
    title: "Community Service and Development of Alumni Support Section",
    text: "Builds alumni chapters, community programs, and support initiatives for the University.",
  },
];

function OarccPage() {
  return (
    <div>
      <section className="border-b border-border bg-brand text-brand-foreground">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-highlight">
            Office of the President
          </p>
          <h1 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">
            Office of Alumni Relations and Career Center
          </h1>
          <p className="mt-4 text-sm text-brand-foreground/80">
            Mindanao State University — Main Campus, Marawi City
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 py-14">
        <Block title="Brief Description of the Office">
          <p>
            The Office of Alumni Relations (OAR) at Mindanao State University, Marawi City
            was created in 1972 under the supervision of the Office of the President. As
            conceived, this office functions to enhance mutuality of interests and concerns
            between the University and her pride—her alumni, as stipulated in Special Order
            #119-P, series 1975 and in Section 9, Article 3 of the 1978 MSU System
            Reorganization Plan.
          </p>
        </Block>

        <div className="mt-12 grid gap-4 md:grid-cols-2">
          <div className="rounded-sm border-t-4 border-brand bg-card p-7 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-brand">Vision</h2>
            <p className="mt-3 text-sm leading-relaxed text-foreground/85">
              To promote sustainable cooperation, support and harmonious relationship between
              and among alumni and the University in the attainment of common good.
            </p>
          </div>
          <div className="rounded-sm border-t-4 border-highlight bg-card p-7 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-brand">Mission</h2>
            <p className="mt-3 text-sm leading-relaxed text-foreground/85">
              OAR shall become responsive and responsible conduit unit of the university in
              the establishment of linkages with the alumni organization, domestic and
              global.
            </p>
          </div>
        </div>

        <Block title="Goals">
          <p className="mb-5">
            Pursuant to Special Order #119-P series of 1975 and in Section 9 of Article 3 of
            the 1978 MSU System Reorganization Plan, following are the Office of Alumni
            Relations' goals:
          </p>
          <ol className="space-y-3">
            {GOALS.map((goal, i) => (
              <li key={goal} className="flex gap-3 text-sm leading-relaxed">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-sm bg-brand text-xs font-bold text-brand-foreground">
                  {i + 1}
                </span>
                <span className="text-foreground/85">{goal}</span>
              </li>
            ))}
          </ol>
        </Block>

        <Block title="Core Values">
          <p>
            The MSU–Office of Alumni Relations (OAR) enfolds/adopts the highest standard of
            work ethics and excellent services to the university alumni. We attempt to
            produce globally competitive graduates. It is created to become
            partner/counterpart of the university and its alumni. Maintaining harmonious
            relationship between and among its alumni or graduates is of utmost goal.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {VALUES.map((v) => (
              <span
                key={v}
                className="rounded-sm border border-brand/25 bg-brand/5 px-3 py-1.5 text-sm font-medium text-brand"
              >
                {v}
              </span>
            ))}
          </div>
        </Block>

        <Block title="Function of the Office">
          <p>
            This office functions to enhance mutuality of interests and concerns between the
            University and her pride—alumni, as stipulated in Special Order #119-P, series
            1975 and Section 9, Article 3 of the MSU System Reorganization.
          </p>
        </Block>

        <Block title="The Three (3) Sections of the Office">
          <div className="grid gap-4 md:grid-cols-3">
            {SECTIONS.map((s, i) => (
              <div key={s.title} className="rounded-sm border border-border bg-card p-5">
                <span className="text-2xl font-bold text-highlight">0{i + 1}</span>
                <h3 className="mt-2 text-sm font-bold leading-snug text-foreground">
                  {s.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{s.text}</p>
              </div>
            ))}
          </div>
        </Block>

        <section className="mt-14 rounded-sm bg-foreground p-8 text-background md:p-10">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-highlight">
            Office Contact Info
          </h2>
          <p className="mt-3 text-xl font-bold">
            Office of Alumni Relations and Career Center
          </p>
          <ul className="mt-6 grid gap-4 text-sm text-background/80 md:grid-cols-2">
            <li className="flex gap-3">
              <MapPin className="mt-0.5 size-4 shrink-0 text-highlight" />
              Ground Floor, Isidro Hall Building, 2nd Street, Mindanao State University,
              Marawi City, Lanao del Sur, Philippines
            </li>
            <li className="flex gap-3">
              <Phone className="mt-0.5 size-4 shrink-0 text-highlight" />
              0956-739-3998
            </li>
            <li className="flex gap-3">
              <Mail className="mt-0.5 size-4 shrink-0 text-highlight" />
              msuoarcc@gmail.com
            </li>
            <li className="flex gap-3">
              <Clock className="mt-0.5 size-4 shrink-0 text-highlight" />
              Office Hours: Monday – Friday, 8:00 A.M. – 5:00 P.M.
            </li>
          </ul>

          <p className="mt-8 text-xs font-bold uppercase tracking-[0.2em] text-highlight">
            Social Info
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <SocialButton icon={<Facebook className="size-4" />} label="Facebook Page" />
            <SocialButton icon={<Mail className="size-4" />} label="Email Us" />
            <SocialButton icon={<Globe className="size-4" />} label="MSU Website" />
          </div>
        </section>
      </div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="border-l-4 border-brand pl-3 text-lg font-bold text-foreground">
        {title}
      </h2>
      <div className="mt-4 text-sm leading-relaxed text-foreground/85">{children}</div>
    </section>
  );
}

function SocialButton({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="inline-flex items-center gap-2 rounded-sm border border-background/25 px-4 py-2 text-sm font-medium transition-colors hover:bg-brand hover:text-brand-foreground">
      {icon}
      {label}
    </button>
  );
}