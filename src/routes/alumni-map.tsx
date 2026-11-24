import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Filter, Globe2, MapPinned, RotateCcw } from "lucide-react";
import { AlumniShell } from "@/components/alumni-shell";
import { MultiFilterSelect } from "@/components/multi-filter-select";
import { MultiCollegeCourseSelect } from "@/components/multi-college-course-select";
import { RealAlumniMap } from "@/components/real-alumni-map";
import { matchesAny, matchesAnyCollege, matchesAnyCourse } from "@/lib/multi-filter";
import { collegeForCourse } from "@/lib/msu-colleges";
import { getAlumniMapPinsData } from "@/lib/gis.functions";
import { getMyWorkspaceData } from "@/lib/profile.functions";

export const Route = createFileRoute("/alumni-map")({
  head: () => ({
    meta: [
      { title: "Alumni Map - AlumTrack MSU Main Campus" },
      {
        name: "description",
        content:
          "Interactive GIS map of MSU Main Campus alumni in the Philippines and abroad. Find fellow graduates by city or host country based on opt-in privacy preferences.",
      },
      { property: "og:title", content: "Alumni Map - AlumTrack" },
      {
        property: "og:description",
        content: "View pinpointed alumni workplaces at home and overseas.",
      },
    ],
  }),
  loader: async () => {
    const [workspace, map] = await Promise.all([getMyWorkspaceData(), getAlumniMapPinsData()]);
    return {
      workspace,
      pins: map.ok ? map.pins : [],
      mapError: map.ok ? null : map.message,
    };
  },
  component: AlumniMapPage,
});

const GULF_COUNTRIES = ["United Arab Emirates", "Saudi Arabia", "Qatar"];

/** Pick the preset that best frames the selected host country. */
function focusForCountry(countries: string[]): "region" | "philippines" | "middle-east" {
  if (countries.length === 1) {
    if (countries[0] === "Philippines") return "philippines";
    if (GULF_COUNTRIES.includes(countries[0] ?? "")) return "middle-east";
  }
  return "region";
}

function AlumniMapPage() {
  const { workspace: data, pins: allPins, mapError } = Route.useLoaderData();
  const user = data.ok ? data.user : null;
  const [course, setCourse] = useState<string[]>([]);
  const [college, setCollege] = useState<string[]>([]);
  const [batch, setBatch] = useState<string[]>([]);
  const [country, setCountry] = useState<string[]>([]);

  const batchOptions = useMemo(
    () =>
      Array.from(new Set(allPins.map((pin) => pin.batch)))
        .filter((value) => value !== "-")
        .sort((a, b) => b.localeCompare(a)),
    [allPins],
  );

  const countries = useMemo(
    () =>
      Array.from(new Set(allPins.map((pin) => pin.country))).sort((a, b) =>
        a === "Philippines" ? -1 : b === "Philippines" ? 1 : a.localeCompare(b),
      ),
    [allPins],
  );

  const overseasCountries = countries.filter((value) => value !== "Philippines").length;

  const pins = useMemo(
    () =>
      allPins.filter((pin) => {
        const pinCollege = collegeForCourse(pin.course) ?? "";
        return (
          matchesAnyCourse(pin.course, course) &&
          matchesAnyCollege(pinCollege, college) &&
          matchesAny(pin.batch, batch) &&
          matchesAny(pin.country, country)
        );
      }),
    [allPins, course, college, batch, country],
  );

  const employed = pins.filter((p) => p.status === "Employed").length;
  const hasFilters =
    course.length > 0 || college.length > 0 || batch.length > 0 || country.length > 0;

  return (
    <AlumniShell
      title="Alumni Map"
      subtitle="See where fellow graduates work - from Marawi and Metro Manila to Dubai, Riyadh, and Doha."
      user={
        user
          ? {
              name: user.fullName,
              batch: user.batch,
              initials: user.initials,
              userId: user.userId,
              avatarUrl: user.avatarUrl,
            }
          : undefined
      }
    >
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-2">
        <span className="px-2 text-xs font-semibold text-foreground">Workplace pins</span>
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
          <Globe2 className="size-3.5 text-brand" />
          {countries.length} countries · {overseasCountries} overseas
        </span>
      </div>

      <div className="mt-4 grid gap-4">
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <MapPinned className="size-4 text-brand" />
                Pinpointed workplaces
              </h2>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Green pins are employed alumni, yellow pins are unemployed. Select a pin for
                details.
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-semibold text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-success" />
                {employed} employed
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-highlight" />
                {pins.length - employed} unemployed
              </span>
            </div>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2">
              <MultiCollegeCourseSelect
                colleges={college}
                courses={course}
                onCollegesChange={setCollege}
                onCoursesChange={setCourse}
              />
            </div>
            <MultiFilterSelect
              placeholder="All batch years"
              options={batchOptions}
              value={batch}
              onChange={setBatch}
              allLabel="All batch years"
            />
            <MultiFilterSelect
              placeholder="All countries"
              options={countries}
              value={country}
              onChange={setCountry}
              allLabel="All countries"
            />
          </div>

          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setCourse([]);
                setCollege([]);
                setBatch([]);
                setCountry([]);
              }}
              className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground hover:bg-muted"
            >
              <RotateCcw className="size-3" />
              Clear filters
            </button>
          )}

          <div className="mt-4 w-full">
            <RealAlumniMap
              pins={pins}
              focusView={focusForCountry(country)}
              heightClassName="h-[400px] md:h-[480px] w-full"
            />
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Filter className="size-3" />
            Only alumni who opted in to workplace mapping appear as pins. Overseas locations are
            shown at state or province level.
          </p>
        </div>
      </div>
    </AlumniShell>
  );
}
