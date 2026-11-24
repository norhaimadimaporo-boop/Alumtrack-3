import { createFileRoute } from "@tanstack/react-router";
import { Database, MapPinned } from "lucide-react";

import { BarList } from "@/components/cluster-map";
import { RealAlumniMap } from "@/components/real-alumni-map";
import { getAlumniMapPinsData } from "@/lib/gis.functions";
import { getPublicStatsData } from "@/lib/public-stats.functions";

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "Alumni Map & Statistics - AlumTrack MSU Main Campus" },
      {
        name: "description",
        content:
          "Explore live alumni statistics, employment summaries, and the interactive AlumTrack GIS map.",
      },
      { property: "og:title", content: "Alumni Map & Statistics - AlumTrack" },
      {
        property: "og:description",
        content: "Live alumni statistics and an interactive GIS map from the OARCC database.",
      },
    ],
  }),
  loader: async () => {
    const [stats, map] = await Promise.all([getPublicStatsData(), getAlumniMapPinsData()]);
    return { stats, map };
  },
  component: AlumniMapPage,
});

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-PH").format(value);
}

function formatRate(value: number): string {
  return `${Number(value.toFixed(1)).toString()}%`;
}

function AlumniMapPage() {
  const { stats: statsResult, map: mapResult } = Route.useLoaderData();
  const stats = statsResult.ok ? statsResult.stats : null;
  const pins = mapResult.ok ? mapResult.pins : [];
  const knownEmployment = stats ? stats.employed + stats.unemployed : 0;

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
        { value: "-", label: "Alumni Traced" },
        { value: "-", label: "Colleges" },
        { value: "-", label: "Batch Years" },
        { value: "-", label: "Events This Year" },
      ];

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
        {
          value: formatNumber(stats.employedLocally),
          label: "Employed locally",
          note: "Based in the Philippines",
        },
      ]
    : [
        { value: "-", label: "Total traced alumni", note: "Across - batch years" },
        { value: "-", label: "Employment rate", note: "Employment status unavailable" },
        { value: "-", label: "Working overseas", note: "Host countries unavailable" },
        { value: "-", label: "Employed locally", note: "Based in the Philippines" },
      ];

  const industries = stats?.industries ?? [];

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <section className="mx-auto w-full max-w-[1720px] px-3 pb-8 pt-10 sm:px-5 sm:pt-12 lg:px-6 xl:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">
          MSU Main Campus Alumni
        </p>
        <h1 className="mt-2 border-l-4 border-brand pl-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Alumni Map &amp; Statistics
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Explore live alumni statistics and verified graduates&apos; locations across the
          Philippines and overseas.
        </p>
      </section>

      <section className="w-full border-y border-border bg-card">
        <dl className="mx-auto grid w-full max-w-[1720px] grid-cols-2 divide-x divide-border px-3 sm:px-5 md:grid-cols-4 lg:px-6 xl:px-8">
          {topStats.map((item) => (
            <div key={item.label} className="px-3 py-6 text-center sm:px-4 sm:py-8">
              <dt className="text-2xl font-bold text-brand sm:text-3xl">{item.value}</dt>
              <dd className="mt-1 text-[10px] uppercase tracking-[0.12em] text-muted-foreground sm:text-xs sm:tracking-[0.14em]">
                {item.label}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mx-auto flex w-full max-w-[1720px] items-center gap-1.5 px-3 pb-4 text-[11px] font-semibold text-muted-foreground sm:px-5 lg:px-6 xl:px-8">
          <Database className="size-3.5 shrink-0 text-brand" />
          {stats
            ? `Live data from the alumni database · ${formatNumber(stats.totalTraced)} verified alumni`
            : statsResult.ok
              ? "Live data from the alumni database"
              : statsResult.message}
        </p>
      </section>

      <section className="mx-auto w-full max-w-[1720px] px-3 py-12 sm:px-5 sm:py-16 lg:px-6 xl:px-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <h2 className="border-l-4 border-brand pl-4 text-2xl font-bold text-foreground">
            Alumni statistics at a glance
          </h2>
          <p className="text-xs text-muted-foreground">
            Graduate Tracer Study summary · aggregate data only · live from database
          </p>
        </div>

        <div className="mt-6 grid w-full min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {publicStats.map((item) => (
            <div
              key={item.label}
              className="min-w-0 rounded-2xl border border-[#E6DFD5] border-t-4 border-t-brand bg-gradient-to-br from-card to-background p-5 shadow-sm"
            >
              <p className="text-3xl font-bold text-foreground">{item.value}</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{item.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.note}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid w-full min-w-0 gap-4 lg:grid-cols-[1.5fr_1fr]">
          <div className="w-full min-w-0 rounded-2xl border border-[#E6DFD5] bg-gradient-to-br from-card to-background p-4 shadow-sm sm:p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <MapPinned className="size-4 shrink-0 text-brand" /> Where our alumni are now
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Green pins are employed alumni, yellow pins are unemployed. Tap a pin for details.
            </p>
            <div className="mt-4 w-full min-w-0">
              <RealAlumniMap
                pins={pins}
                heightClassName="h-[300px] w-full sm:h-[450px] lg:h-[520px]"
              />
            </div>
          </div>

          <div className="w-full min-w-0 space-y-4">
            <div className="w-full min-w-0 rounded-2xl border border-[#E6DFD5] bg-gradient-to-br from-card to-background p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground">Top industries</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {stats && stats.employedWithSector > 0
                  ? `Share of employed graduates per sector · ${formatNumber(stats.employedWithSector)} of ${formatNumber(stats.employedWithCurrentJob)} employed alumni with a current job record have a sector recorded.`
                  : "Share of employed graduates per sector (current employment records)."}
              </p>
              <div className="mt-4 w-full min-w-0">
                {industries.length > 0 ? (
                  <BarList items={industries} />
                ) : (
                  <p className="rounded-lg bg-muted px-3 py-4 text-xs text-muted-foreground">
                    No employment sector records yet. Sector data appears here once employed alumni
                    save their current job.
                  </p>
                )}
              </div>
            </div>
            <div className="w-full min-w-0 rounded-2xl border border-[#E6DFD5] border-l-4 border-l-highlight bg-gradient-to-br from-card to-background p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground">Privacy notice</h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Public maps and statistics show only where alumni are based - never exact street
                addresses, contact numbers, or Akan email addresses. Detailed records are available
                to verified alumni and OARCC administrators.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
