import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MapPinned } from "lucide-react";

import { AdminShell } from "@/components/admin-shell";
import { MultiFilterSelect } from "@/components/multi-filter-select";
import { MultiCollegeCourseSelect } from "@/components/multi-college-course-select";
import { RealAlumniMap } from "@/components/real-alumni-map";
import { getAdminMapPinsData } from "@/lib/gis.functions";
import { matchesAny, matchesAnyCollege, matchesAnyCourse } from "@/lib/multi-filter";
import { collegeForCourse } from "@/lib/msu-colleges";

export const Route = createFileRoute("/admin/map")({
  head: () => ({
    meta: [
      { title: "Alumni Map (GIS) - AlumTrack Admin" },
      {
        name: "description",
        content: "Interactive GIS map of verified alumni workplaces and locations.",
      },
    ],
  }),
  loader: async () => getAdminMapPinsData(),
  component: AdminMapPage,
});

function AdminMapPage() {
  const data = Route.useLoaderData();
  const allPins = data.ok ? data.pins : [];
  const [colleges, setColleges] = useState<string[]>([]);
  const [courses, setCourses] = useState<string[]>([]);
  const [batches, setBatches] = useState<string[]>([]);
  const [countries, setCountries] = useState<string[]>([]);

  const batchOptions = useMemo(
    () =>
      [...new Set(allPins.map((p) => p.batch))]
        .filter((b) => b !== "-")
        .sort((a, b) => b.localeCompare(a)),
    [allPins],
  );
  const countryOptions = useMemo(
    () => [...new Set(allPins.map((p) => p.country))].sort((a, b) => a.localeCompare(b)),
    [allPins],
  );

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

  const employed = pins.filter((p) => p.status === "Employed").length;
  const overseas = pins.filter((p) => p.country && p.country !== "Philippines").length;
  const hasFilters =
    colleges.length > 0 || courses.length > 0 || batches.length > 0 || countries.length > 0;

  return (
    <AdminShell
      title="Alumni map (GIS)"
      subtitle="Verified alumni locations, filtered by their present address."
    >
      {!data.ok && (
        <p className="rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-700">
          {data.message}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Alumni plotted" value={pins.length} />
        <Stat label="Employed" value={employed} />
        <Stat label="Working overseas" value={overseas} />
      </div>

      <div className="mt-4 rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <MapPinned className="size-4 text-brand" /> Pinpointed workplaces
          </h2>
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setColleges([]);
                setCourses([]);
                setBatches([]);
                setCountries([]);
              }}
              className="text-xs font-semibold text-brand hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <MultiCollegeCourseSelect
              colleges={colleges}
              courses={courses}
              onCollegesChange={setColleges}
              onCoursesChange={setCourses}
            />
          </div>
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
        <div className="mt-4">
          <RealAlumniMap pins={pins} heightClassName="h-[420px] w-full md:h-[520px]" />
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold text-foreground">Filtered alumni results</h2>
        <div className="mt-2 max-h-[360px] overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-muted/80 text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-semibold">Name</th>
                <th className="px-3 py-2 font-semibold">Course</th>
                <th className="px-3 py-2 font-semibold">Batch</th>
                <th className="px-3 py-2 font-semibold">Location</th>
                <th className="px-3 py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pins.slice(0, 200).map((pin) => (
                <tr key={pin.id}>
                  <td className="px-3 py-2">{pin.name}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{pin.course}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{pin.batch}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {pin.city}, {pin.country}
                  </td>
                  <td className="px-3 py-2 text-xs">{pin.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-2xl font-bold text-foreground">{value.toLocaleString()}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
