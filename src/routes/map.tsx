import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MapPinned } from "lucide-react";

import { BarList } from "@/components/cluster-map";
import { MultiFilterSelect } from "@/components/multi-filter-select";
import { RealAlumniMap } from "@/components/real-alumni-map";
import { getAlumniMapPinsData } from "@/lib/gis.functions";
import { matchesAny, matchesAnyCollege, matchesAnyCourse } from "@/lib/multi-filter";
import { COLLEGE_OPTIONS, COURSE_OPTIONS, collegeForCourse } from "@/lib/msu-colleges";
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

  const allPins = mapResult.ok ? mapResult.pins : [];
  const [colleges, setColleges] = useState<string[]>([]);
  const [courses, setCourses] = useState<string[]>([]);
  const [batches, setBatches] = useState<string[]>([]);
  const [countries, setCountries] = useState<string[]>([]);

  const batchOptions = useMemo(
    () =>
      [...new Set(allPins.map((pin) => pin.batch))]
        .filter((b) => b !== "-")
        .sort((a, b) => b.localeCompare(a)),
    [allPins],
  );
  const countryOptions = useMemo(
    () => [...new Set(allPins.map((pin) => pin.country))].sort((a, b) => a.localeCompare(b)),
    [allPins],
  );
  const courseOptions = useMemo(() => {
    if (colleges.length === 0) return COURSE_OPTIONS;
    const allowed = new Set<string>();
    colleges.forEach((college) =>
      COURSE_OPTIONS.filter((course) => collegeForCourse(course) === college).forEach((c) =>
        allowed.add(c),
      ),
    );
    return allowed.size > 0 ? [...allowed] : COURSE_OPTIONS;
  }, [colleges]);

  const pins = useMemo(
    () =>
      allPins.filter((pin) => {
        const pinCollege = collegeForCourse(pin.course) ?? "";
        return (
          matchesAnyCollege(pinCollege, colleges) &&
          matchesAnyCourse(pin.course, courses) &&
          matchesAny(pin.batch, batches) &&
          matchesAny(pin.country, countries)
        );
      }),
    [allPins, colleges, courses, batches, countries],
  );

  const hasFilters =
    colleges.length > 0 || courses.length > 0 || batches.length > 0 || countries.length > 0;

  // Industries are derived from the currently plotted pins so the breakdown
  // responds to the same filters as the map.
  const industries = useMemo(() => {
    const counts = new Map<string, number>();
    for (const pin of pins) {
      if (pin.status !== "Employed") continue;
      const company = pin.role && pin.role !== "Employed" ? pin.role : "Other employers";
      counts.set(company, (counts.get(company) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [pins]);

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <section className="mx-auto w-full max-w-[1720px] px-3 pb-3 pt-6 sm:px-5 lg:px-6 xl:px-8">
        <h1 className="mb-3 border-l-4 border-brand pl-4 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Alumni Map &amp; Statistics
        </h1>
      </section>

      <section className="mx-auto w-full max-w-[1720px] px-3 sm:px-5 lg:px-6 xl:px-8">
        <div className="grid w-full min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {publicStats.map((item) => (
            <div
              key={item.label}
              className="min-w-0 rounded-2xl border border-[#E6DFD5] border-t-4 border-t-brand bg-gradient-to-br from-card to-background p-3 shadow-sm sm:p-3.5"
            >
              <p className="text-lg font-bold text-foreground sm:text-xl">{item.value}</p>
              <p className="mt-0.5 text-xs font-semibold text-foreground">{item.label}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{item.note}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 grid w-full min-w-0 gap-4 lg:grid-cols-[minmax(0,70fr)_minmax(0,30fr)]">
          <div className="w-full min-w-0">
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
                  heightClassName="h-[340px] w-full sm:h-[520px] lg:h-[620px]"
                />
              </div>
              <p className="mt-3 text-xs font-semibold text-foreground">
                {pins.length} alumni plotted · Tap pin for details
              </p>
            </div>
            <div className="mt-3 w-full rounded-2xl border border-[#E6DFD5] border-l-4 border-l-highlight bg-gradient-to-br from-card to-background px-4 py-3 shadow-sm sm:px-5">
              <h3 className="text-xs font-semibold text-foreground">Privacy notice</h3>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                Public maps and statistics show only where alumni are based - never exact street
                addresses, contact numbers, or Akan email addresses. Detailed records are available
                to verified alumni and OARCC administrators.
              </p>
            </div>
          </div>

          <div className="w-full min-w-0 space-y-3">
            <div className="w-full min-w-0 rounded-2xl border border-[#E6DFD5] bg-gradient-to-br from-card to-background p-3 shadow-sm sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-semibold text-foreground">Filter alumni</h3>
                {hasFilters && (
                  <button
                    type="button"
                    onClick={() => {
                      setColleges([]);
                      setCourses([]);
                      setBatches([]);
                      setCountries([]);
                    }}
                    className="text-[11px] font-semibold text-brand hover:underline"
                  >
                    Clear all
                  </button>
                )}
              </div>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <MultiFilterSelect
                  placeholder="All colleges"
                  options={[...COLLEGE_OPTIONS]}
                  value={colleges}
                  onChange={setColleges}
                  allLabel="All colleges"
                />
                <MultiFilterSelect
                  placeholder="All courses"
                  options={courseOptions}
                  value={courses}
                  onChange={setCourses}
                  allLabel="All courses"
                />
                <MultiFilterSelect
                  placeholder="All batch years"
                  options={batchOptions}
                  value={batches}
                  onChange={setBatches}
                  allLabel="All batch years"
                />
                <MultiFilterSelect
                  placeholder="All countries"
                  options={countryOptions}
                  value={countries}
                  onChange={setCountries}
                  allLabel="All countries"
                />
              </div>
            </div>
            <div className="w-full min-w-0 rounded-2xl border border-[#E6DFD5] bg-gradient-to-br from-card to-background p-3 shadow-sm sm:p-4">
              <h3 className="text-xs font-semibold text-foreground">Top industries</h3>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Employers of the {pins.length} alumni currently plotted on the map.
              </p>
              <div className="mt-3 w-full min-w-0">
                {industries.length > 0 ? (
                  <BarList items={industries} />
                ) : (
                  <p className="rounded-lg bg-muted px-3 py-4 text-xs text-muted-foreground">
                    No employment records match the selected filters.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
