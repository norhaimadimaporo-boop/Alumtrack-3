import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Briefcase,
  GraduationCap,
  MapPinned,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { AlumniShell } from "@/components/alumni-shell";
import { BarList } from "@/components/cluster-map";
import { RealAlumniMap } from "@/components/real-alumni-map";
import { POSTS, findPostPhoto } from "@/data/news";
import { getAlumniMapPinsData } from "@/lib/gis.functions";
import { getPublishedPosts } from "@/lib/posts.functions";
import { getMyWorkspaceData } from "@/lib/profile.functions";
import { getPublicStatsData } from "@/lib/public-stats.functions";
import { initials } from "@/lib/profile-format";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Alumni Dashboard — AlumTrack MSU Main Campus" },
      {
        name: "description",
        content:
          "Your AlumTrack dashboard: profile completion, employment record, announcements, and job offerings for MSU Main Campus alumni.",
      },
      { property: "og:title", content: "Alumni Dashboard — AlumTrack" },
      {
        property: "og:description",
        content: "Manage your alumni profile, employment history, and posts from OARCC.",
      },
    ],
  }),
  loader: async () => {
    const [workspace, map, published, publicStats] = await Promise.all([
      getMyWorkspaceData(),
      getAlumniMapPinsData(),
      getPublishedPosts(),
      getPublicStatsData(),
    ]);
    return {
      workspace,
      pins: map.ok ? map.pins : [],
      posts: published.ok ? published.posts : [],
      publicStats,
    };
  },
  component: DashboardPage,
});

function DashboardPage() {
  const {
    workspace: data,
    pins,
    posts: storedPosts,
    publicStats: publicStatsResult,
  } = Route.useLoaderData();
  const profile = data.ok ? data.profile : null;
  const publicStats = publicStatsResult.ok ? publicStatsResult.stats : null;

  const firstName = profile?.firstName || "Alumni";
  const fullName = profile?.fullName || "Alumni User";
  const batch = profile?.batch || "—";
  const currentJob = profile?.employment?.[0]?.position || profile?.course || "Not specified";
  const currentCompany = profile?.employment?.[0]?.company || "Unemployed / Not provided";
  const currentRegion = profile?.employment?.[0]?.workLocation || profile?.homeAddress || "—";
  const empCount = profile?.employment?.length ?? 0;
  const eduCount = profile?.education?.length ?? 0;
  const userInitials = profile ? initials(profile.fullName) : "AL";

  const completionChecks = [
    Boolean(profile?.firstName && profile?.lastName),
    Boolean(profile?.birthDate),
    Boolean(profile?.ethnicity),
    Boolean(profile?.religion),
    Boolean(profile?.mobileNumber),
    Boolean(profile?.contactEmail),
    Boolean(profile?.currentAddress),
    Boolean(profile?.homeAddress),
    eduCount > 0,
    empCount > 0,
  ];
  const completion = Math.round(
    (completionChecks.filter(Boolean).length / completionChecks.length) * 100,
  );

  const stats = [
    { label: "Profile completion", value: `${completion}%`, icon: UserRound },
    { label: "Employment records", value: `${empCount}`, icon: Briefcase },
    { label: "Education records", value: `${eduCount}`, icon: GraduationCap },
    {
      label: "Verification",
      value: profile?.verificationStatus === "verified" ? "Verified" : "Pending",
      icon: ShieldCheck,
    },
  ];

  const posts =
    storedPosts.length > 0
      ? storedPosts.slice(0, 4).map((post) => ({
          id: post.id,
          title: post.title,
          category: post.category,
          date: post.date,
          photo: post.images[0] ?? findPostPhoto(post.title),
        }))
      : POSTS.slice(0, 4).map((post) => ({
          id: post.id,
          title: post.title,
          category: post.category,
          date: post.date,
          photo: post.photo,
        }));

  // Tracer snapshot now mirrors the home page: same DB-backed sector mix
  // from `getPublicStats()` instead of the old hardcoded split.
  const sectorItems = publicStats
    ? publicStats.industries.map((industry) => ({
        label: industry.label,
        value: industry.value,
      }))
    : [];

  return (
    <AlumniShell
      title={`Welcome back, ${firstName}`}
      subtitle="Keep your alumni record up to date so OARCC can reach you."
      user={{
        name: fullName,
        batch: batch,
        initials: userInitials,
      }}
    >
      <div className="grid w-full min-w-0 max-w-full gap-3 overflow-x-hidden sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-card p-4">
            <s.icon className="size-4 text-brand" />
            <p className="mt-3 text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 w-full min-w-0 max-w-full rounded-lg border border-border bg-card p-5">
        <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Complete your profile</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {completion >= 100
                ? "Your alumni record is complete. Keep it updated after any career move."
                : "Add your remaining details so OARCC and fellow alumni can reach you."}
            </p>
          </div>
          <Link
            to="/profile"
            className="shrink-0 rounded-md bg-brand px-3 py-2 text-xs font-semibold text-brand-foreground hover:bg-brand-dark"
          >
            Update profile
          </Link>
        </div>
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-success" style={{ width: `${completion}%` }} />
        </div>
      </div>

      <div className="mt-4 grid w-full min-w-0 max-w-full gap-4 overflow-x-hidden lg:grid-cols-[1.5fr_1fr]">
        <div className="min-w-0 rounded-lg border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <MapPinned className="size-4 text-brand" /> GIS Alumni Map
            </h2>
            <Link
              to="/alumni-map"
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
            >
              Open interactive map <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Batchmates at home and overseas — green pins are employed, yellow pins are unemployed.
          </p>
          <div className="mt-4 w-full">
            <RealAlumniMap
              pins={pins}
              heightClassName="h-[400px] md:h-[480px] w-full"
              compact
            />
          </div>
        </div>
        <div className="min-w-0 rounded-lg border-t-4 border-brand bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">Tracer study snapshot</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Where batchmates are employed, by sector.
          </p>
          <div className="mt-4">
            {sectorItems.length > 0 ? (
              <BarList items={sectorItems} tone="success" />
            ) : (
              <p className="rounded-lg bg-muted px-3 py-4 text-xs text-muted-foreground">
                No employment sector records yet. Sector data appears here once employed alumni
                save their current job.
              </p>
            )}
          </div>
          <Link
            to="/employment"
            className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
          >
            Update my employment details <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>

      <div className="mt-4 grid w-full min-w-0 max-w-full gap-4 overflow-x-hidden lg:grid-cols-[1.4fr_1fr]">
        <div className="min-w-0 rounded-lg border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Latest posts</h2>
            <Link to="/news" className="text-xs font-semibold text-brand hover:underline">
              View all
            </Link>
          </div>
          <ul className="mt-3 divide-y divide-border">
            {posts.map((p) => (
              <li key={p.id} className="flex gap-3 py-3">
                {p.photo && (
                  <img
                    src={p.photo}
                    alt=""
                    loading="lazy"
                    className="size-16 shrink-0 rounded-lg object-cover"
                  />
                )}
                <div className="min-w-0">
                  <span className="rounded-sm bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    {p.category}
                  </span>
                  <p className="mt-2 text-sm font-semibold leading-snug text-foreground">
                    {p.title}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{p.date}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground">Current employment</h2>
            <p className="mt-3 text-sm font-semibold text-foreground">{currentJob}</p>
            <p className="text-xs text-muted-foreground">{currentCompany}</p>
            <p className="mt-1 text-xs text-muted-foreground">{currentRegion}</p>
            <Link
              to="/employment"
              className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
            >
              Manage employment history <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <div className="rounded-lg border-t-4 border-brand bg-card p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-foreground">Job offerings</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              5 new openings posted by OARCC partners this month.
            </p>
            <Link
              to="/jobs"
              className="mt-4 inline-flex rounded-md bg-highlight px-3 py-2 text-xs font-bold text-highlight-foreground"
            >
              Browse & apply
            </Link>
          </div>
        </div>
      </div>
    </AlumniShell>
  );
}
