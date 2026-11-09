import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MapPinned, LogIn, Trash2, Undo2 } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { LocationCombobox } from "@/components/location-combobox";
import { Modal } from "@/components/modal";
import { RealAlumniMap } from "@/components/real-alumni-map";
import { getAdminMapPinsData } from "@/lib/gis.functions";
import { getSystemUsageData } from "@/lib/usage.functions";
import { getRecycleBinData, restoreRecycle } from "@/lib/recycle.functions";

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
    const [pins, usage, recycle] = await Promise.all([
      getAdminMapPinsData(),
      getSystemUsageData(),
      getRecycleBinData(),
    ]);
    return { pins, usage, recycle };
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
  const router = useRouter();
  const pins = data.pins.ok ? data.pins.pins : [];
  const usage = data.usage.ok ? data.usage.usage : null;
  const recycleItems = data.recycle.ok && data.recycle.canViewRecycleBin ? data.recycle.items : [];
  const canViewRecycleBin = Boolean(data.recycle.ok && data.recycle.canViewRecycleBin);
  // Server is the source of truth: only Head Admins receive access log rows.
  const canViewAccessLogs = usage?.canViewAccessLogs ?? false;

  const [showLogs, setShowLogs] = useState(false);
  const [confirmingRestoreKey, setConfirmingRestoreKey] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [recycleMessage, setRecycleMessage] = useState("");

  const handleRestore = async (
    kind: "alumni" | "posts" | "admin",
    id: number,
    key: string,
  ) => {
    if (confirmingRestoreKey !== key) {
      setConfirmingRestoreKey(key);
      return;
    }
    setRestoring(true);
    setRecycleMessage("");
    try {
      const result = await restoreRecycle({ data: { kind, id } });
      setRecycleMessage(result.message);
      setConfirmingRestoreKey(null);
      if (result.ok) await router.invalidate();
    } finally {
      setRestoring(false);
    }
  };
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

  return (
    <AdminShell
      title="System Monitoring"
      subtitle="Interactive alumni location GIS map and session monitoring."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {summary.map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-card p-4">
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border-t-4 border-brand bg-card p-5 pb-3">
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
        <div className="mt-3 w-full">
          <RealAlumniMap pins={pins} heightClassName="w-full h-[300px] sm:h-[450px] lg:h-[560px]" />
        </div>
      </div>

      <div className="mt-4">
        {canViewAccessLogs && (
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
        )}
      </div>

      {canViewRecycleBin && (
        <div className="mt-4 rounded-lg border-t-4 border-brand bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Trash2 className="size-4 text-brand" /> Recycle Bin Records
            </h2>
            <span className="rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
              {recycleItems.length} in recycle bin
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Soft-deleted alumni, posts, and admin accounts. Records are permanently removed after
            7 days. Restore returns them to the live directory.
          </p>

          {recycleMessage && (
            <p className="mt-3 rounded-lg border border-brand/40 bg-brand/5 px-3 py-2 text-xs text-foreground">
              {recycleMessage}
            </p>
          )}

          <div className="mt-3 max-h-[350px] overflow-y-auto rounded-lg border border-border">
            {recycleItems.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-muted-foreground">
                Recycle bin is empty. Deleted records will appear here for 7 days.
              </p>
            ) : (
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="sticky top-0 border-b border-border bg-muted/80 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-semibold">Type</th>
                    <th className="px-4 py-2 font-semibold">Record</th>
                    <th className="px-4 py-2 font-semibold">Deleted</th>
                    <th className="px-4 py-2 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recycleItems.map((item) => {
                    const typeLabel =
                      item.kind === "alumni"
                        ? "Alumni"
                        : item.kind === "admin"
                          ? "Admin"
                          : item.detail.split(" · ")[0] || "Post";
                    return (
                      <tr key={item.key}>
                        <td className="px-4 py-2.5">
                          <span className="rounded-sm bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                            {typeLabel}
                          </span>
                        </td>
                        <td className="min-w-0 px-4 py-2.5">
                          <p className="truncate text-xs font-semibold text-foreground">
                            {item.title}
                          </p>
                          <p className="text-[11px] text-muted-foreground">{item.detail}</p>
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground">
                          {item.deletedAt}
                        </td>
                        <td className="px-4 py-2.5">
                          {confirmingRestoreKey === item.key ? (
                            <div className="flex flex-col items-end gap-1.5">
                              <p className="text-[11px] font-semibold text-foreground">
                                Are you sure you want to Restore?
                              </p>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  disabled={restoring}
                                  onClick={() => void handleRestore(item.kind, item.id, item.key)}
                                  className="rounded-md bg-brand px-3 py-1.5 text-[11px] font-semibold text-brand-foreground hover:bg-brand-dark disabled:opacity-50"
                                >
                                  {restoring ? "Restoring…" : "Yes"}
                                </button>
                                <button
                                  type="button"
                                  disabled={restoring}
                                  onClick={() => setConfirmingRestoreKey(null)}
                                  className="rounded-md border border-border px-3 py-1.5 text-[11px] font-semibold text-foreground hover:border-brand disabled:opacity-50"
                                >
                                  No
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void handleRestore(item.kind, item.id, item.key)}
                              className="ml-auto flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                            >
                              <Undo2 className="size-3" /> Restore / Undo
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {showLogs && canViewAccessLogs && (
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
