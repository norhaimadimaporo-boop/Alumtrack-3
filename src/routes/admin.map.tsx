import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { AdminShell } from "@/components/admin-shell";
import { MultiFilterSelect } from "@/components/multi-filter-select";
import { MultiCollegeCourseSelect } from "@/components/multi-college-course-select";
import { RealAlumniMap } from "@/components/real-alumni-map";
import {
  matchesAny,
  matchesAnyCollege,
  matchesAnyCourse,
  matchesAnyReligion,
} from "@/lib/multi-filter";
import { PHILIPPINE_RELIGIONS } from "@/lib/religions";
import { getReportRecords } from "@/lib/reports.functions";

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
  loader: async () => getReportRecords(),
  component: AdminMapPage,
});

function unique(values: string[]) {
  return [
    ...new Set(values.map((v) => v.trim()).filter((v) => v && v !== "-" && v !== "Not provided")),
  ].sort((a, b) => a.localeCompare(b));
}

function AdminMapPage() {
  const data = Route.useLoaderData();
  const records = useMemo(() => (data.ok ? data.records : []), [data]);

  const [batches, setBatches] = useState<string[]>([]);
  const [colleges, setColleges] = useState<string[]>([]);
  const [courses, setCourses] = useState<string[]>([]);
  const [tribes, setTribes] = useState<string[]>([]);
  const [religions, setReligions] = useState<string[]>([]);
  const [genders, setGenders] = useState<string[]>([]);
  const [affiliations, setAffiliations] = useState<string[]>([]);
  const [employment, setEmployment] = useState<string[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [provinces, setProvinces] = useState<string[]>([]);

  const options = useMemo(
    () => ({
      batches: unique(records.map((r) => r.batch)).sort((a, b) => b.localeCompare(a)),
      tribes: unique(records.map((r) => r.ethnicity)),
      genders: unique(records.map((r) => r.gender)),
      affiliations: unique(records.map((r) => r.affiliation)),
      employments: unique(
        records.map((r) => (r.employmentStatus === "employed" ? "Employed" : "Unemployed")),
      ),
      countries: unique(records.map((r) => r.country)),
      provinces: unique(records.map((r) => r.province)),
    }),
    [records],
  );

  const filtered = useMemo(
    () =>
      records.filter((r) => {
        if (!matchesAny(r.batch, batches)) return false;
        if (!matchesAnyCollege(r.college, colleges)) return false;
        if (!matchesAnyCourse(r.course, courses)) return false;
        if (!matchesAny(r.ethnicity, tribes)) return false;
        if (!matchesAnyReligion(r.religion, religions)) return false;
        if (!matchesAny(r.gender, genders)) return false;
        if (!matchesAny(r.affiliation, affiliations)) return false;
        if (!matchesAny(r.province, provinces)) return false;
        if (!matchesAny(r.country, countries)) return false;
        if (employment.length > 0) {
          const label = r.employmentStatus === "employed" ? "Employed" : "Unemployed";
          if (!employment.includes(label)) return false;
        }
        return true;
      }),
    [
      records,
      batches,
      colleges,
      courses,
      tribes,
      religions,
      genders,
      affiliations,
      employment,
      countries,
      provinces,
    ],
  );

  const pins = useMemo(() => filtered.flatMap((r) => (r.pin ? [r.pin] : [])), [filtered]);
  const employed = pins.filter((pin) => pin.status === "Employed").length;
  const overseas = pins.filter((pin) => pin.country && pin.country !== "Philippines").length;

  const clearAll = () => {
    setBatches([]);
    setColleges([]);
    setCourses([]);
    setTribes([]);
    setReligions([]);
    setGenders([]);
    setAffiliations([]);
    setEmployment([]);
    setCountries([]);
    setProvinces([]);
  };

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

      <div className="rounded-lg border-t-4 border-brand bg-card p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">GIS &amp; report filters</h2>
          <button
            type="button"
            onClick={clearAll}
            className="text-xs font-semibold text-brand hover:underline"
          >
            Clear all
          </button>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MultiFilterSelect
            placeholder="All batch years"
            options={options.batches}
            value={batches}
            onChange={setBatches}
            allLabel="All batch years"
          />
          <div className="sm:col-span-2">
            <MultiCollegeCourseSelect
              colleges={colleges}
              courses={courses}
              onCollegesChange={setColleges}
              onCoursesChange={setCourses}
            />
          </div>
          <MultiFilterSelect
            placeholder="All tribes"
            options={options.tribes}
            value={tribes}
            onChange={setTribes}
            allLabel="All tribes"
          />
          <MultiFilterSelect
            placeholder="All religions"
            options={[...PHILIPPINE_RELIGIONS]}
            value={religions}
            onChange={setReligions}
            allLabel="All religions"
          />
          <MultiFilterSelect
            placeholder="All genders"
            options={options.genders}
            value={genders}
            onChange={setGenders}
            allLabel="All genders"
          />
          <MultiFilterSelect
            placeholder="All group affiliations"
            options={options.affiliations}
            value={affiliations}
            onChange={setAffiliations}
            allLabel="All group affiliations"
          />
          <MultiFilterSelect
            placeholder="All employment statuses"
            options={options.employments}
            value={employment}
            onChange={setEmployment}
            allLabel="All employment statuses"
          />
          <MultiFilterSelect
            placeholder="All countries"
            options={options.countries}
            value={countries}
            onChange={setCountries}
            allLabel="All countries"
          />
          <MultiFilterSelect
            placeholder="All provinces"
            options={options.provinces}
            value={provinces}
            onChange={setProvinces}
            allLabel="All provinces"
          />
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">Pinpointed workplaces</h2>
          <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-muted-foreground">
            <span className="rounded-full border border-border px-2.5 py-1">
              {pins.length} plotted
            </span>
            <span className="rounded-full border border-border px-2.5 py-1">
              {employed} employed
            </span>
            <span className="rounded-full border border-border px-2.5 py-1">
              {overseas} overseas
            </span>
          </div>
        </div>
        <div className="mt-3">
          <RealAlumniMap pins={pins} heightClassName="h-[420px] w-full md:h-[520px]" />
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold text-foreground">Filtered alumni results</h2>
        <p className="mt-1 text-xs text-muted-foreground">{filtered.length} matching alumni</p>
        <div className="mt-2 max-h-[360px] overflow-x-auto overflow-y-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
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
              {filtered.slice(0, 200).map((r) => (
                <tr key={r.userId}>
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{r.course}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{r.batch}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {r.city}, {r.country}
                  </td>
                  <td className="px-3 py-2 text-xs">{r.employmentStatus}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-xs text-muted-foreground">
                    No alumni match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
