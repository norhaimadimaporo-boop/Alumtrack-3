import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Search,
  MapPinned,
  Newspaper,
  UserRoundPen,
  ArrowRight,
  CalendarDays,
} from "lucide-react";
import heroImage from "@/assets/campus-hero.jpg";
import { POSTS } from "@/data/news";
import {
  REGION_CLUSTERS,
  OVERSEAS_CLUSTERS,
  PUBLIC_STATS,
  TOP_INDUSTRIES,
} from "@/data/gis";
import { ClusterMap, BarList } from "@/components/cluster-map";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AlumTrack — MSU Main Campus Alumni Tracing System" },
      {
        name: "description",
        content:
          "AlumTrack is the alumni tracing system and online platform of Mindanao State University — Main Campus. Search graduates, read OARCC news, and stay connected.",
      },
      { property: "og:title", content: "AlumTrack — MSU Main Campus Alumni Platform" },
      {
        property: "og:description",
        content:
          "Search MSU Marawi alumni, follow OARCC news and events, and keep your graduate profile updated.",
      },
    ],
  }),
  component: Index,
});

const STATS = [
  { value: "12,480", label: "Alumni Traced" },
  { value: "14", label: "Colleges" },
  { value: "52", label: "Batch Years" },
  { value: "36", label: "Events This Year" },
];

const FEATURES = [
  {
    icon: Search,
    title: "Search Alumni",
    text: "Browse the public directory and filter by course, college, region, and batch year.",
    to: "/search" as const,
    action: "Open directory",
  },
  {
    icon: MapPinned,
    title: "Alumni Map",
    text: "See where MSU graduates work across the Philippines and overseas on a GIS map.",
    to: "/search" as const,
    action: "View coverage",
  },
  {
    icon: Newspaper,
    title: "News & Events",
    text: "Announcements, homecomings, and job postings published by the OARCC.",
    to: "/news" as const,
    action: "Read updates",
  },
  {
    icon: UserRoundPen,
    title: "Register or Update",
    text: "Alumni can create an account and keep their employment record current.",
    to: "/login" as const,
    action: "Sign in",
  },
];

function Index() {
  const latest = POSTS.slice(0, 3);

  return (
    <div>
      <section className="relative isolate overflow-hidden bg-foreground">
        <img
          src={heroImage}
          alt="Mindanao State University Marawi campus at golden hour"
          width={1920}
          height={1080}
          className="absolute inset-0 size-full object-cover opacity-35"
        />
        <div className="relative mx-auto max-w-6xl px-4 py-24 md:py-32">
          <span className="inline-block bg-highlight px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-highlight-foreground">
            Office of Alumni Relations and Career Center
          </span>
          <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-[1.1] text-background sm:text-5xl md:text-6xl">
            AlumTrack
            <span className="mt-3 block text-lg font-medium leading-snug text-background/80 sm:text-xl">
              Alumni Tracing System and Online Platform for Mindanao State University — Main
              Campus
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-sm leading-relaxed text-background/70">
            One centralized portal for tracing graduates, keeping alumni records current, and
            strengthening the bond between the University and her alumni.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              to="/search"
              className="inline-flex items-center gap-2 rounded-sm bg-brand px-6 py-3 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand-dark"
            >
              <Search className="size-4" /> Search Alumni
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-sm border border-background/35 px-6 py-3 text-sm font-semibold text-background transition-colors hover:bg-background hover:text-foreground"
            >
              Alumni Login
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-card">
        <dl className="mx-auto grid max-w-6xl grid-cols-2 divide-x divide-border px-4 md:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="px-4 py-8 text-center">
              <dt className="text-3xl font-bold text-brand">{s.value}</dt>
              <dd className="mt-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                {s.label}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="border-l-4 border-brand pl-4 text-2xl font-bold text-foreground">
            Alumni statistics at a glance
          </h2>
          <p className="text-xs text-muted-foreground">
            Graduate Tracer Study summary · aggregate data only
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PUBLIC_STATS.map((s) => (
            <div
              key={s.label}
              className="rounded-lg border-t-4 border-brand bg-card p-5"
            >
              <p className="text-3xl font-bold text-foreground">{s.value}</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{s.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{s.note}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground">
              Regional distribution of alumni
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Cluster totals per region. Individual names and home addresses are never shown
              on the public map.
            </p>
            <div className="mt-4">
              <ClusterMap
                clusters={REGION_CLUSTERS}
                caption="Bubble size reflects the number of traced graduates in that region."
              />
            </div>
            <h3 className="mt-6 text-sm font-semibold text-foreground">
              Alumni working abroad
            </h3>
            <div className="mt-3">
              <ClusterMap
                clusters={OVERSEAS_CLUSTERS}
                tone="highlight"
                height="h-[220px]"
                caption="Country-level totals for graduates employed overseas."
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground">Top industries</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Share of employed graduates per sector.
              </p>
              <div className="mt-4">
                <BarList items={TOP_INDUSTRIES} />
              </div>
            </div>
            <div className="rounded-lg border-l-4 border-highlight bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground">Privacy notice</h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Public maps and statistics show aggregate counts by region or country only —
                no personal names, exact home addresses, contact numbers, or Akan email
                addresses. Detailed records are available to verified alumni and OARCC
                administrators.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="border-l-4 border-brand pl-4 text-2xl font-bold text-foreground">
          What you can do here
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <Link
              key={f.title}
              to={f.to}
              className="group flex flex-col rounded-sm border border-border bg-card p-6 transition-colors hover:border-brand"
            >
              <span className="flex size-10 items-center justify-center rounded-sm bg-brand/8 text-brand transition-colors group-hover:bg-brand group-hover:text-brand-foreground">
                <f.icon className="size-5" />
              </span>
              <h3 className="mt-4 text-base font-bold text-foreground">{f.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                {f.text}
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-brand">
                {f.action} <ArrowRight className="size-3.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-secondary/60">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="border-l-4 border-brand pl-4 text-2xl font-bold text-foreground">
              Latest from OARCC
            </h2>
            <Link
              to="/news"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
            >
              View all news &amp; events <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {latest.map((post) => (
              <Link
                key={post.id}
                to="/news"
                className="group rounded-sm border border-border bg-card p-6 transition-colors hover:border-brand"
              >
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CalendarDays className="size-3.5" />
                  {post.date}
                </p>
                <h3 className="mt-3 text-base font-bold leading-snug text-foreground group-hover:text-brand">
                  {post.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {post.excerpt}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-20 md:grid-cols-[1.2fr_1fr] md:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand">
            The office behind AlumTrack
          </p>
          <h2 className="mt-3 text-2xl font-bold leading-snug text-foreground">
            Office of Alumni Relations and Career Center
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Created in 1972 under the supervision of the Office of the President, OARCC
            enhances mutuality of interests and concerns between the University and her
            pride — her alumni.
          </p>
          <Link
            to="/oarcc"
            className="mt-6 inline-flex items-center gap-2 rounded-sm bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand-dark"
          >
            Learn about the office <ArrowRight className="size-4" />
          </Link>
        </div>
        <ul className="space-y-3">
          {[
            "MSU System Alumni Data Bank",
            "Alumni job placement program",
            "Linkages with alumni chapters worldwide",
          ].map((item) => (
            <li
              key={item}
              className="flex items-center gap-3 rounded-sm border-l-4 border-highlight bg-card px-5 py-4 text-sm font-medium text-foreground"
            >
              {item}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
