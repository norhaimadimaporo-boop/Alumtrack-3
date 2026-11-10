import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, MapPinned, Newspaper, UserRoundPen, ArrowRight, CalendarDays, Database } from "lucide-react";
const heroImage = "/assets/hero-bg.jpg";
import { POSTS, findPostPhoto } from "@/data/news";
import { BarList } from "@/components/cluster-map";
import { RealAlumniMap } from "@/components/real-alumni-map";
import { getAlumniMapPinsData } from "@/lib/gis.functions";
import { getPublishedPosts } from "@/lib/posts.functions";
import { getPublicStatsData } from "@/lib/public-stats.functions";
import { postExcerpt } from "@/lib/posts.types";

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
  loader: async () => {
    const [stats, map, published] = await Promise.all([
      getPublicStatsData(),
      getAlumniMapPinsData(),
      getPublishedPosts(),
    ]);
    return { stats, map, posts: published.ok ? published.posts : [] };
  },
  component: Index,
});

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-PH").format(value);
}

function formatRate(value: number): string {
  // One decimal, dropping the trailing ".0" (e.g. 70.8%, 100%).
  return `${Number(value.toFixed(1)).toString()}%`;
}

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
    title: "Latest Posts",
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
  const { stats: statsResult, map: mapData, posts: storedPosts } = Route.useLoaderData();
  const stats = statsResult.ok ? statsResult.stats : null;

  const latest =
    storedPosts.length > 0
      ? storedPosts.slice(0, 3).map((post) => ({
          id: post.id,
          title: post.title,
          date: post.date,
          excerpt: postExcerpt(post.content),
          photo: post.images[0] ?? findPostPhoto(post.title),
        }))
      : POSTS.slice(0, 3);
  const pins = mapData.ok ? mapData.pins : [];

  // --- Live counters: every value comes from `getPublicStats()` (MySQL),
  // whether this build is pointed at the local database or the hosted
  // Aiven database. No hardcoded snapshot is ever rendered.
  const topStats = stats
    ? [
        { value: formatNumber(stats.totalTraced), label: "Alumni Traced" },
        { value: formatNumber(stats.colleges), label: "Colleges" },
        { value: formatNumber(stats.batchYears), label: "Batch Years" },
        {
          value: formatNumber(stats.eventsThisYear),
          label: `Events This Year (${stats.currentYear})`,
        },
      ]
    : [
        { value: "—", label: "Alumni Traced" },
        { value: "—", label: "Colleges" },
        { value: "—", label: "Batch Years" },
        { value: "—", label: "Events This Year" },
      ];

  const knownEmployment = stats ? stats.employed + stats.unemployed : 0;
  const publicStats = stats
    ? [
        {
          value: formatNumber(stats.totalTraced),
          label: "Total traced alumni",
          note: `Across ${stats.batchYears} batch years`,
        },
        {
          value: formatRate(stats.employmentRate),
          label: "Employment rate",
          note:
            knownEmployment > 0
              ? `${formatNumber(stats.employed)} employed of ${formatNumber(knownEmployment)} with employment status`
              : "No employment status recorded yet",
        },
        {
          value: formatNumber(stats.workingOverseas),
          label: "Working overseas",
          note:
            stats.hostCountries > 0
              ? `${stats.hostCountries} host ${stats.hostCountries === 1 ? "country" : "countries"}`
              : "No overseas placements recorded yet",
        },
        // "Degree-aligned jobs" was a hardcoded placeholder: the database has
        // no course-alignment column, so the card now shows the real
        // employed-locally split derived from the same employment records.
        {
          value: formatNumber(stats.employedLocally),
          label: "Employed locally",
          note: "Based in the Philippines",
        },
      ]
    : [
        { value: "—", label: "Total traced alumni", note: "Across — batch years" },
        { value: "—", label: "Employment rate", note: "Employment status unavailable" },
        { value: "—", label: "Working overseas", note: "Host countries unavailable" },
        { value: "—", label: "Employed locally", note: "Based in the Philippines" },
      ];

  const industries = stats ? stats.industries : [];

  return (
    <div>
      <section className="relative isolate overflow-hidden bg-foreground">
        <img
          src={heroImage}
          alt="Graduates at the 62nd Pre-Commencement Exercises in the Dimaporo Gymnasium"
          width={1536}
          height={1024}
          fetchPriority="high"
          className="absolute inset-0 size-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/85 via-foreground/65 to-foreground/35" />
        <div className="relative mx-auto max-w-6xl px-4 py-24 md:py-32">
          <span className="inline-block bg-highlight px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-highlight-foreground">
            Office of Alumni Relations and Career Center
          </span>
          <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-[1.1] text-background sm:text-5xl md:text-6xl">
            AlumTrack
            <span className="mt-3 block text-lg font-medium leading-snug text-background/80 sm:text-xl">
              Alumni Tracing System and Online Platform for Mindanao State University — Main Campus
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
          {topStats.map((s) => (
            <div key={s.label} className="px-4 py-8 text-center">
              <dt className="text-3xl font-bold text-brand">{s.value}</dt>
              <dd className="mt-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                {s.label}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mx-auto flex max-w-6xl items-center gap-1.5 px-4 pb-4 text-[11px] font-semibold text-muted-foreground">
          <Database className="size-3.5 text-brand" />
          {stats
            ? `Live data from the alumni database · ${formatNumber(stats.totalTraced)} verified alumni`
            : statsResult.ok
              ? "Live data from the alumni database"
              : statsResult.message}
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="border-l-4 border-brand pl-4 text-2xl font-bold text-foreground">
            Alumni statistics at a glance
          </h2>
          <p className="text-xs text-muted-foreground">
            Graduate Tracer Study summary · aggregate data only · live from database
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {publicStats.map((s) => (
            <div key={s.label} className="rounded-lg border-t-4 border-brand bg-card p-5">
              <p className="text-3xl font-bold text-foreground">{s.value}</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{s.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{s.note}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground">Where our alumni are now</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Green pins are employed alumni, yellow pins are unemployed. Home cities and overseas
              workplaces are plotted — tap a pin for details.
            </p>
            <div className="mt-4 w-full">
              <RealAlumniMap pins={pins} heightClassName="w-full h-[300px] sm:h-[450px] lg:h-[520px]" />
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground">Top industries</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {stats && stats.employedWithSector > 0
                  ? `Share of employed graduates per sector · ${formatNumber(stats.employedWithSector)} of ${formatNumber(stats.employedWithCurrentJob)} employed alumni with a current job record have a sector recorded.`
                  : "Share of employed graduates per sector (current employment records)."}
              </p>
              <div className="mt-4">
                {industries.length > 0 ? (
                  <BarList items={industries} />
                ) : (
                  <p className="rounded-lg bg-muted px-3 py-4 text-xs text-muted-foreground">
                    No employment sector records yet. Sector data appears here once employed
                    alumni save their current job.
                  </p>
                )}
              </div>
            </div>
            <div className="rounded-lg border-l-4 border-highlight bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground">Privacy notice</h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Public maps and statistics show only where alumni are based — never exact street
                addresses, contact numbers, or Akan email addresses. Detailed records are available
                to verified alumni and OARCC administrators.
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
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{f.text}</p>
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
              View all latest posts <ArrowRight className="size-4" />
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
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{post.excerpt}</p>
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
            Created in 1972 under the supervision of the Office of the President, OARCC enhances
            mutuality of interests and concerns between the University and her pride — her alumni.
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
