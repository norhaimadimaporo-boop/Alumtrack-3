import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { LogIn, LogOut } from "lucide-react";

import { AdminShell } from "@/components/admin-shell";
import { LocationCombobox } from "@/components/location-combobox";
import { getSystemUsageData } from "@/lib/usage.functions";

export const Route = createFileRoute("/admin/system-usage")({
  head: () => ({
    meta: [
      { title: "System Usage - AlumTrack Admin" },
      {
        name: "description",
        content: "Authentication telemetry and complete login/logout access logs.",
      },
    ],
  }),
  loader: async () => getSystemUsageData(),
  component: SystemUsagePage,
});

const MONTHS = [
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

function SystemUsagePage() {
  const data = Route.useLoaderData();
  const usage = data.ok ? data.usage : null;
  const logs = usage?.accessLogs ?? [];
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");

  const yearOptions = useMemo(() => {
    const years = logs.map((log) => log.date.slice(0, 4)).filter(Boolean);
    return [...new Set(years)].sort((a, b) => b.localeCompare(a)).map((label) => ({ label }));
  }, [logs]);
  const monthIndex = month
    ? MONTHS.findIndex((name) => name.toLowerCase().startsWith(month.trim().toLowerCase()))
    : -1;

  const filtered = useMemo(
    () =>
      logs.filter((log) => {
        const [y, m, d] = log.date.split("-");
        if (year && y !== year.trim()) return false;
        if (monthIndex >= 0 && m !== String(monthIndex + 1).padStart(2, "0")) return false;
        if (day && d !== day.trim().padStart(2, "0")) return false;
        return true;
      }),
    [logs, year, month, day, monthIndex],
  );

  // Logins per day from the access log timestamps (Asia/Manila dates).
  const loginsByDay = useMemo(() => {
    const counts = new Map<string, number>();
    for (const log of logs) {
      if (log.action !== "Login") continue;
      counts.set(log.date, (counts.get(log.date) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-14);
  }, [logs]);
  const maxDay = Math.max(1, ...loginsByDay.map(([, count]) => count));

  return (
    <AdminShell
      title="System usage"
      subtitle="Authentication sessions and historical access logs - not employment location data."
    >
      {!data.ok && (
        <p className="rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-700">
          {data.message}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Active login sessions" value={usage?.activeSessions ?? 0} />
        <Metric label="Logins today" value={usage?.loginsToday ?? 0} />
        <Metric label="Regions with sessions" value={usage?.regionsWithActivity ?? 0} />
        <Metric label="Overseas login sessions" value={usage?.overseasSessions ?? 0} />
      </div>

      <div className="mt-4 rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold text-foreground">Logins per day</h2>
        {loginsByDay.length === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">No login records yet.</p>
        ) : (
          <div className="mt-3 flex h-28 items-end gap-1.5">
            {loginsByDay.map(([date, count]) => (
              <div
                key={date}
                className="flex h-full flex-1 flex-col items-center justify-end gap-1"
              >
                <span className="text-[10px] text-muted-foreground">{count}</span>
                <div
                  className="w-full rounded-t bg-brand/80"
                  style={{ height: `${Math.max(4, (count / maxDay) * 100)}%` }}
                  title={`${date}: ${count} logins`}
                />
                <span className="text-[9px] text-muted-foreground">{date.slice(5)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">
            Access logs ({filtered.length} of {usage?.totalAccessLogs ?? logs.length})
          </h2>
          {!usage?.canViewAccessLogs && (
            <span className="text-[11px] text-muted-foreground">Available to Head Admins</span>
          )}
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          <LocationCombobox
            label="Year"
            value={year}
            onChange={(v) => setYear(v.trim())}
            options={yearOptions}
            placeholder="All years"
            sortOptions={false}
          />
          <LocationCombobox
            label="Month"
            value={month}
            onChange={(v) => setMonth(v.trim())}
            options={MONTHS.map((name) => ({ label: name }))}
            placeholder="All months"
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
              value={day}
              onChange={(e) => setDay(e.target.value)}
              placeholder="All days"
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                setYear("");
                setMonth("");
                setDay("");
              }}
              className="w-full rounded-md border border-border px-3 py-2 text-xs font-semibold hover:border-brand"
            >
              Clear date filter
            </button>
          </div>
        </div>
        <div className="mt-3 max-h-[520px] overflow-y-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="sticky top-0 bg-muted/80 text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-semibold">Date / time</th>
                <th className="px-3 py-2 font-semibold">User</th>
                <th className="px-3 py-2 font-semibold">Role</th>
                <th className="px-3 py-2 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((log) => (
                <tr key={log.id}>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {log.date} {log.clock}
                  </td>
                  <td className="px-3 py-2 font-medium">{log.user}</td>
                  <td className="px-3 py-2 text-xs">{log.role}</td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold">
                      {log.action === "Login" ? (
                        <LogIn className="size-3 text-success" />
                      ) : (
                        <LogOut className="size-3 text-highlight" />
                      )}
                      {log.action}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-xs text-muted-foreground">
                    No access logs match these filters.
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

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-2xl font-bold text-foreground">{value.toLocaleString()}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
