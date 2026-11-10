import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BarChart3, MapPinned, Search } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { BarList, DonutChart, ColumnChart } from "@/components/cluster-map";
import { RealAlumniMap } from "@/components/real-alumni-map";
import { getReportRecords } from "@/lib/reports.functions";
import type { ReportRecord } from "@/lib/reports.types";

export const Route = createFileRoute("/admin/reports")({
  head: () => ({
    meta: [
      { title: "Reports & Graduate Statistics — AlumTrack Admin" },
      {
        name: "description",
        content:
          "Tracer study analytics with GIS filters: employment rate by college, time to first employment, regional placement, and exportable employment distribution reports.",
      },
      { property: "og:title", content: "Reports & Graduate Statistics — AlumTrack Admin" },
      {
        property: "og:description",
        content: "GIS filtering, tracer analytics charts, and exportable graduate reports.",
      },
    ],
  }),
  loader: async () => getReportRecords(),
  component: AdminReports,
});

type Filters = {
  batch: string;
  college: string;
  course: string;
  tribe: string;
  religion: string;
  province: string;
  gender: string;
  affiliation: string;
  employment: string;
  region: string;
  country: string;
};

const emptyFilters: Filters = {
  batch: "",
  college: "",
  course: "",
  tribe: "",
  religion: "",
  province: "",
  gender: "",
  affiliation: "",
  employment: "",
  region: "",
  country: "",
};

const YEAR_FROM = 2012;
const YEAR_TO = 2026;

function sameValue(value: string, filter: string) {
  return !filter || value.trim().toLowerCase() === filter.trim().toLowerCase();
}

function uniqueSorted(values: string[]) {
  return [
    ...new Set(values.map((v) => v.trim()).filter((v) => v && v !== "—" && v !== "Not provided")),
  ].sort((a, b) => a.localeCompare(b));
}

function AdminReports() {
  const data = Route.useLoaderData();
  const [filters, setFilters] = useState<Filters>(emptyFilters);

  const all = useMemo<ReportRecord[]>(() => (data.ok ? data.records : []), [data]);
  const set = (key: keyof Filters, value: string) => setFilters((f) => ({ ...f, [key]: value }));

  const options = useMemo(
    () => ({
      batches: [...new Set(all.map((r) => r.batch).filter((b) => /^\d{4}$/.test(b)))].sort(
        (a, b) => Number(b) - Number(a),
      ),
      colleges: uniqueSorted(all.map((r) => r.college)),
      courses: uniqueSorted(all.map((r) => r.course)),
      tribes: uniqueSorted(all.map((r) => r.ethnicity)),
      religions: uniqueSorted(all.map((r) => r.religion)),
      provinces: uniqueSorted(all.map((r) => r.province)),
      genders: uniqueSorted(all.map((r) => r.gender)),
      affiliations: ["Secular", "Non-secular", "No affiliation"].filter((label) =>
        all.some((r) => r.affiliation === label),
      ),
      employments: ["Employed", "Unemployed"].filter((label) =>
        all.some(
          (r) =>
            (label === "Employed" && r.employmentStatus === "employed") ||
            (label === "Unemployed" && r.employmentStatus === "unemployed"),
        ),
      ),
      regions: uniqueSorted(all.map((r) => r.region)),
      countries: uniqueSorted(all.map((r) => r.country)),
    }),
    [all],
  );

  const filtered = useMemo(
    () =>
      all.filter((r) => {
        if (filters.batch && r.batch !== filters.batch) return false;
        if (!sameValue(r.college, filters.college)) return false;
        if (!sameValue(r.course, filters.course)) return false;
        if (!sameValue(r.ethnicity, filters.tribe)) return false;
        if (!sameValue(r.religion, filters.religion)) return false;
        if (!sameValue(r.province, filters.province)) return false;
        if (!sameValue(r.gender, filters.gender)) return false;
        if (!sameValue(r.affiliation, filters.affiliation)) return false;
        if (filters.employment) {
          const employed = r.employmentStatus === "employed";
          if (filters.employment === "Employed" && !employed) return false;
          if (filters.employment === "Unemployed" && employed) return false;
        }
        if (!sameValue(r.region, filters.region)) return false;
        if (!sameValue(r.country, filters.country)) return false;
        return true;
      }),
    [all, filters],
  );

  const kpis = useMemo(() => {
    const total = filtered.length;
    const employedList = filtered.filter((r) => r.employmentStatus === "employed");
    const employed = employedList.length;
    const unemployed = filtered.filter((r) => r.employmentStatus === "unemployed").length;
    const local = employedList.filter((r) => !r.abroad).length;
    const abroad = employedList.filter((r) => r.abroad).length;
    const format = (n: number) => new Intl.NumberFormat("en-PH").format(n);
    return [
      { label: "Total graduates", value: format(total) },
      { label: "Employed", value: format(employed) },
      { label: "Unemployed", value: format(unemployed) },
      { label: "Employed locally", value: format(local) },
      { label: "Employed abroad", value: format(abroad) },
    ];
  }, [filtered]);

  const pins = useMemo(() => filtered.flatMap((r) => (r.pin ? [r.pin] : [])), [filtered]);
  const domesticCount = pins.filter((pin) => pin.country === "Philippines").length;
  const overseasCount = pins.length - domesticCount;

  const perYear = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of filtered) {
      if (/^\d{4}$/.test(r.batch)) counts.set(r.batch, (counts.get(r.batch) ?? 0) + 1);
    }
    const items = [];
    for (let year = YEAR_FROM; year <= YEAR_TO; year += 1) {
      const label = String(year);
      items.push({ label, value: counts.get(label) ?? 0 });
    }
    // Include any out-of-range years present in data.
    const extra = [...counts.keys()]
      .filter((y) => Number(y) < YEAR_FROM || Number(y) > YEAR_TO)
      .sort((a, b) => Number(a) - Number(b));
    for (const label of extra) items.push({ label, value: counts.get(label) ?? 0 });
    return items;
  }, [filtered]);

  const tribalSplit = useMemo(() => {
    const muslim = filtered.filter((r) => /islam/i.test(r.religion)).length;
    return [
      { label: "Muslim graduates", value: muslim },
      { label: "Non-Muslim graduates", value: filtered.length - muslim },
    ];
  }, [filtered]);

  const byProvince = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of filtered) {
      if (!/^philippines?$/i.test(r.country)) continue;
      const province = r.province.trim() || "Not provided";
      counts.set(province, (counts.get(province) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
  }, [filtered]);

  const byGender = useMemo(() => {
    const count = (wanted: string) =>
      filtered.filter((r) => r.gender.trim().toLowerCase() === wanted).length;
    const items = [
      { label: "Female", value: count("female") },
      { label: "Male", value: count("male") },
    ];
    const other = filtered.length - count("female") - count("male");
    if (other > 0) items.push({ label: "Not provided", value: other });
    return items;
  }, [filtered]);

  const byAffiliation = useMemo(
    () => [
      {
        label: "Secular organizations",
        value: filtered.filter((r) => r.affiliation === "Secular").length,
      },
      {
        label: "Non-secular organizations",
        value: filtered.filter((r) => r.affiliation === "Non-secular").length,
      },
      {
        label: "No affiliation",
        value: filtered.filter((r) => r.affiliation === "No affiliation").length,
      },
    ],
    [filtered],
  );

  const activeCount = Object.values(filters).filter(Boolean).length;

  return (
    <AdminShell
      title="Reports & Graduate Statistics"
      subtitle="Tracer study analytics and GIS distribution of graduates."
    >
      <section className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            GIS &amp; report filters
          </p>
          {activeCount > 0 && (
            <button
              type="button"
              onClick={() => setFilters(emptyFilters)}
              className="text-xs font-medium text-brand hover:underline"
            >
              Clear all ({activeCount})
            </button>
          )}
        </div>
        {!data.ok && <p className="mt-2 text-xs text-red-600">{data.message}</p>}
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <FilterSelect
            label="Batch year"
            options={options.batches}
            value={filters.batch}
            onChange={(v) => set("batch", v)}
          />
          <FilterSelect
            label="College"
            options={options.colleges}
            value={filters.college}
            onChange={(v) => set("college", v)}
          />
          <FilterSelect
            label="Course"
            options={options.courses}
            value={filters.course}
            onChange={(v) => set("course", v)}
          />
          <FilterSelect
            label="Tribe"
            options={options.tribes}
            value={filters.tribe}
            onChange={(v) => set("tribe", v)}
          />
          <FilterSelect
            label="Religion"
            options={options.religions}
            value={filters.religion}
            onChange={(v) => set("religion", v)}
          />
          <FilterSelect
            label="Province"
            options={options.provinces}
            value={filters.province}
            onChange={(v) => set("province", v)}
          />
          <FilterSelect
            label="Gender"
            options={options.genders}
            value={filters.gender}
            onChange={(v) => set("gender", v)}
          />
          <FilterSelect
            label="Group affiliation"
            options={options.affiliations}
            value={filters.affiliation}
            onChange={(v) => set("affiliation", v)}
            allLabel="All group affiliations"
          />
          <FilterSelect
            label="Employment status"
            options={options.employments}
            value={filters.employment}
            onChange={(v) => set("employment", v)}
            allLabel="All employment statuses"
          />
          <FilterSelect
            label="Region"
            options={options.regions}
            value={filters.region}
            onChange={(v) => set("region", v)}
          />
          <FilterSelect
            label="Country"
            options={options.countries}
            value={filters.country}
            onChange={(v) => set("country", v)}
            allLabel="All countries"
          />
        </div>
      </section>

      <div className="mt-4 grid w-full max-w-full min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-lg border border-border bg-card p-4">
            <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{kpi.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border-t-4 border-brand bg-card p-5 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <MapPinned className="size-4 text-brand" /> AlumTrack Map
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-muted-foreground">
            <span className="rounded-full border border-border px-2.5 py-1">
              {domesticCount} in the Philippines
            </span>
            <span className="rounded-full border border-border px-2.5 py-1">
              {overseasCount} overseas
            </span>
          </div>
        </div>
        <div className="mt-3 w-full">
          <RealAlumniMap pins={pins} heightClassName="w-full h-[300px] sm:h-[450px] lg:h-[520px]" />
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Search className="size-4 text-brand" /> Filtered Alumni Results
          </h2>
          <p className="text-[11px] font-semibold text-muted-foreground">
            Showing {filtered.length} of {all.length}
          </p>
        </div>
        <div className="mt-3 max-h-80 overflow-y-auto rounded-lg border border-border">
          {filtered.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              No alumni match the selected filters. Try clearing a filter.
            </p>
          ) : (
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="sticky top-0 border-b border-border bg-muted/80 text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-semibold">Name</th>
                  <th className="px-4 py-2 font-semibold">Course</th>
                  <th className="px-4 py-2 font-semibold">Batch</th>
                  <th className="px-4 py-2 font-semibold">Location</th>
                  <th className="px-4 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-2.5 text-xs font-semibold text-foreground">{r.name}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{r.course}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{r.batch}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {[r.city !== "—" ? r.city : "", r.province, r.country]
                        .filter(Boolean)
                        .join(", ")}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {r.employmentStatus === "employed"
                        ? "Employed"
                        : r.employmentStatus === "unemployed"
                          ? "Unemployed"
                          : "Not provided"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="mt-4 grid w-full max-w-full min-w-0 gap-4 lg:grid-cols-2">
        <Panel title="1. No. of graduates per year (masteral & undergrad)" icon>
          <div className="block w-full max-w-full overflow-x-auto">
            <div className="w-full min-w-[560px] sm:min-w-0">
              <ColumnChart items={perYear} />
            </div>
          </div>
        </Panel>
        <Panel title="2. Tribal percentage — Muslim / Non-Muslim graduates" icon>
          <DonutChart items={tribalSplit} />
        </Panel>
        <Panel title="3. No. of graduates by province" icon>
          <div className="block w-full max-w-full min-w-0 overflow-x-auto">
            <div className="max-w-full">
              <BarList items={byProvince} suffix="" />
            </div>
          </div>
        </Panel>
        <Panel title="4. No. of graduates by gender" icon>
          <ColumnChart items={byGender} tone="success" />
        </Panel>
        <Panel title="5. Group affiliations (secular / non-secular)" icon>
          <DonutChart items={byAffiliation} />
        </Panel>
      </div>
    </AdminShell>
  );
}

function Panel({
  title,
  children,
  icon,
}: {
  title: string;
  children: React.ReactNode;
  icon?: boolean;
}) {
  return (
    <div className="w-full min-w-0 max-w-full rounded-lg border border-border bg-card p-4 sm:p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        {icon && <BarChart3 className="size-4 text-brand" />}
        {title}
      </h2>
      <div className="mt-4 block w-full min-w-0 max-w-full overflow-x-auto">{children}</div>
    </div>
  );
}

function FilterSelect({
  label,
  options,
  allLabel,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  allLabel?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-muted-foreground outline-none focus:border-brand"
    >
      <option value="">{allLabel ?? `All ${label.toLowerCase()}s`}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}
