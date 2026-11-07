import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Activity, MapPinned, LogIn } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { LocationCombobox } from "@/components/location-combobox";
import { Modal } from "@/components/modal";
import { RealAlumniMap } from "@/components/real-alumni-map";
import { getAlumniMapPinsData } from "@/lib/gis.functions";
import { getReportRecords } from "@/lib/reports.functions";
import { getSystemUsageData } from "@/lib/usage.functions";

export const Route = createFileRoute("/admin/usage")({
  head: () => ({
    meta: [
      { title: "System Monitoring & Login GIS Map — AlumTrack Admin" },
      {
        name: "description",
        content:
          "Track system access logs by geographic location, monitor active alumni sessions per region, and export tracer reports by batch year, course, and region.",
      },
      { property: "og:title", content: "System Monitoring & Login GIS Map — AlumTrack Admin" },
      {
        property: "og:description",
        content: "Interactive login and activity GIS map with exportable tracer reports.",
      },
    ],
  }),
  loader: async () => {
    const [pins, usage, records] = await Promise.all([
      getAlumniMapPinsData(),
      getSystemUsageData(),
      getReportRecords(),
    ]);
    return { pins, usage, records };
  },
  component: AdminUsage,
});

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const BASE_YEAR_OPTIONS = Array.from({ length: 2026 - 2015 + 1 }, (_, i) => ({
  label: String(2026 - i),
}));

function formatCount(value: number) {
  return new Intl.NumberFormat("en-PH").format(value);
}

function AdminUsage() {
  const data = Route.useLoaderData();
  const pins = data.pins.ok ? data.pins.pins : [];
  const usage = data.usage.ok ? data.usage.usage : null;
  const records = data.records.ok ? data.records.records : [];

  const [showLogs, setShowLogs] = useState(false);
  const [filterDay, setFilterDay] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");

  const monthOptions = useMemo(() => MONTH_NAMES.map((name) => ({ label: name })), []);
  const monthNumber = filterMonth
    ? MONTH_NAMES.findIndex(
        (name) =>
          name.toLowerCase() === filterMonth.trim().toLowerCase() ||
          name.toLowerCase().startsWith(filterMonth.trim().toLowerCase()),
      )
    : -1;

  const yearOptions = useMemo(() => {
    const dataYears = (usage?.accessLogs ?? []).map((item) => item.date.slice(0, 4)).filter(Boolean);
    const merged = [
      ...new Set([...dataYears, ...BASE_YEAR_OPTIONS.map((o) => o.label)]),
    ].sort((a, b) => b.localeCompare(a));
    return merged.map((year) => ({ label: year }));
  }, [usage]);

  const logs = usage?.accessLogs ?? [];
  const previewLogs = logs.slice(0, 6);
  const filteredLogs = useMemo(
    () =>
      logs.filter((item) => {
        const [year, month, day] = item.date.split("-");
        if (filterYear && year !== filterYear.trim()) return false;
        if (monthNumber >= 0 && month !== String(monthNumber + 1).padStart(2, "0")) return false;
        if (filterDay && day !== filterDay.trim().padStart(2, "0")) return false;
        return true;
      }),
    [logs, filterDay, filterYear, monthNumber],
  );

  const summary = [
    { label: "Active sessions now", value: formatCount(usage?.activeSessions ?? 0) },
    { label: "Logins today", value: formatCount(usage?.loginsToday ?? 0) },
    { label: "Regions with activity", value: formatCount(usage?.regionsWithActivity ?? 0) },
    { label: "Overseas sessions", value: formatCount(usage?.overseasSessions ?? 0) },
  ];

  const exportOptions = useMemo(
    () => ({
      batches: [...new Set(records.map((r) => r.batch).filter((b) => /^\d{4}$/.test(b)))].sort(
        (a, b) => Number(b) - Number(a),
      ),
      courses: [...new Set(records.map((r) => r.course))].sort((a, b) => a.localeCompare(b)),
      genders: [...new Set(records.map((r) => r.gender))].sort((a, b) => a.localeCompare(b)),
    }),
    [records],
  );
  const [fBatch, setFBatch] = useState("");
  const [fCourse, setFCourse] = useState("");
  const [fGender, setFGender] = useState("");
  const exportMatches = useMemo(
    () =>
      records.filter((r) => {
        if (fBatch && r.batch !== fBatch) return false;
        if (fCourse && r.course !== fCourse) return false;
        if (fGender && r.gender !== fGender) return false;
        return true;
      }),
    [records, fBatch, fCourse, fGender],
  );

  return (
    <AdminShell
      title="System Monitoring"
      subtitle="Interactive alumni location GIS map, session monitoring, and tracer report exports."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {summary.map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-card p-4">
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-lg border-t-4 border-brand bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <MapPinned className="size-4 text-brand" /> Alumni location GIS map
          </h2>
          <div className="flex items-center gap-3 text-[11px] font-semibold text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-[#2f7d32]" /> Employed
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-[#f2b705]" /> Unemployed
            </span>
          </div>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Domestic and overseas alumni plotted by current location. Tap a pin for the
          graduate&apos;s status, location, and company.
        </p>
        <div className="mt-4">
          <RealAlumniMap pins={pins} heightClassName="h-[calc(100vh-180px)] min-h-[700px]" />
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <LogIn className="size-4 text-brand" /> Access logs
            </h2>
            <button
              type="button"
              onClick={() => setShowLogs(true)}
              className="text-xs font-semibold text-brand hover:underline"
            >
              View All Access Logs
            </button>
          </div>
          <ul className="mt-3 divide-y divide-border">
            {previewLogs.map((l) => (
              <li key={l.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{l.user}</p>
                  <p className="text-xs text-muted-foreground">{l.action}</p>
                  <p className="mt-0.5 text-xs text-brand">{l.where}</p>
                </div>
                <div className="shrink-0 text-right">
                  <span className="inline-flex rounded-sm bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    {l.role}
                  </span>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {l.date} {l.clock}
                  </p>
                </div>
              </li>
            ))}
            {previewLogs.length === 0 && (
              <li className="py-6 text-center text-xs text-muted-foreground">
                No access logs yet. Logins will appear here.
              </li>
            )}
          </ul>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border-t-4 border-brand bg-card p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Activity className="size-4 text-brand" /> Export tracer report
            </h2>
            <div className="mt-3 space-y-2">
              <ExportSelect label="Batch year" options={exportOptions.batches} value={fBatch} onChange={setFBatch} />
              <ExportSelect label="Course" options={exportOptions.courses} value={fCourse} onChange={setFCourse} />
              <ExportSelect label="Gender" options={exportOptions.genders} value={fGender} onChange={setFGender} />
            </div>
            <div className="mt-4">
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{exportMatches.length}</span> matching
                alumni
              </p>
              <div className="mt-2 max-h-60 overflow-y-auto rounded-lg border border-border">
                {exportMatches.length === 0 ? (
                  <p className="px-4 py-6 text-center text-xs text-muted-foreground">
                    No alumni match the selected filters.
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {exportMatches.map((r) => (
                      <li key={r.id} className="flex items-start justify-between gap-3 px-3 py-2">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground">{r.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {r.course} · Batch {r.batch} · {r.gender}
                          </p>
                        </div>
                        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {r.employmentStatus === "employed"
                            ? "Employed"
                            : r.employmentStatus === "unemployed"
                              ? "Unemployed"
                              : "Not provided"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showLogs && (
        <Modal title="Access logs" onClose={() => setShowLogs(false)} wide>
          <div className="grid gap-3 sm:grid-cols-4">
            <LocationCombobox
              label="Year"
              value={filterYear}
              onChange={(name) => setFilterYear(name.trim())}
              options={yearOptions}
              placeholder="Search or type year"
              sortOptions={false}
            />
            <LocationCombobox
              label="Month"
              value={filterMonth}
              onChange={(name) => setFilterMonth(name.trim())}
              options={monthOptions}
              placeholder="Search or type month"
              sortOptions={false}
            />
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Day
              </label>
              <input
                type="number"
                min={1}
                max={31}
                value={filterDay}
                onChange={(e) => setFilterDay(e.target.value)}
                placeholder="Day (1-31)"
                aria-label="Filter by day (1-31)"
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setFilterDay("");
                  setFilterMonth("");
                  setFilterYear("");
                }}
                className="w-full rounded-md border border-border px-3 py-2 text-xs font-semibold text-foreground hover:border-brand"
              >
                Clear date filter
              </button>
            </div>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            Showing {filteredLogs.length} of {logs.length} access logs
          </p>

          <div className="mt-2 max-h-96 overflow-y-auto rounded-lg border border-border">
            {filteredLogs.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                No access logs on the selected date. Try clearing the filter.
              </p>
            ) : (
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="sticky top-0 border-b border-border bg-muted/80 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-semibold">Date</th>
                    <th className="px-4 py-2 font-semibold">Time</th>
                    <th className="px-4 py-2 font-semibold">User</th>
                    <th className="px-4 py-2 font-semibold">Role</th>
                    <th className="px-4 py-2 font-semibold">Action</th>
                    <th className="px-4 py-2 font-semibold">Location</th>
                    <th className="px-4 py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredLogs.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{item.date}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{item.clock}</td>
                      <td className="px-4 py-2.5 text-xs font-semibold text-foreground">{item.user}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{item.role}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{item.action}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{item.where}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {item.active ? "Active" : "Ended"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Modal>
      )}
    </AdminShell>
  );
}

function ExportSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
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
      <option value="">All {label.toLowerCase()}s</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}
