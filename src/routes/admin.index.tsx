import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Users,
  UserCheck,
  Briefcase,
  Megaphone,
  History,
  Database,
} from "lucide-react";

import { AdminShell } from "@/components/admin-shell";
import { LocationCombobox } from "@/components/location-combobox";
import { Modal } from "@/components/modal";
import { getAdminDashboardData } from "@/lib/admin.functions";
import type { AdminDashboardStats } from "@/lib/admin.types";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — AlumTrack MSU Main Campus" },
      {
        name: "description",
        content:
          "OARCC administrator dashboard: manage the alumni directory, post announcements and jobs, generate reports, and monitor system usage.",
      },
      { property: "og:title", content: "Admin Dashboard — AlumTrack" },
      {
        property: "og:description",
        content: "Manage alumni records, posts, reports, and admin accounts.",
      },
    ],
  }),
  loader: async () => getAdminDashboardData(),
  component: AdminDashboard,
});

type StatKey = keyof Pick<
  AdminDashboardStats,
  "registeredAlumni" | "pendingVerification" | "employedAlumni" | "activePosts"
>;

const STAT_META: Array<{
  key: StatKey;
  label: string;
  icon: typeof Users;
}> = [
  { key: "registeredAlumni", label: "Registered alumni", icon: Users },
  { key: "pendingVerification", label: "Pending verification", icon: UserCheck },
  { key: "employedAlumni", label: "Employed alumni", icon: Briefcase },
  { key: "activePosts", label: "Active posts", icon: Megaphone },
];

const ACTIVITY_PREVIEW_COUNT = 6;

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

/** Years offered in the history filter (newest first). */
const BASE_YEAR_OPTIONS = Array.from({ length: 2026 - 2015 + 1 }, (_, i) => ({
  label: String(2026 - i),
}));

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-PH").format(value);
}

function AdminDashboard() {
  const data = Route.useLoaderData();
  const [showHistory, setShowHistory] = useState(false);
  const [filterDay, setFilterDay] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");

  if (!data.ok) {
    return (
      <AdminShell
        title="Admin Dashboard"
        subtitle="Office of Alumni Relations and Career Center — control center."
      >
        <div className="rounded-lg border-t-4 border-brand bg-card p-6">
          <h2 className="text-sm font-bold text-foreground">Administrator sign-in required</h2>
          <p className="mt-2 text-sm text-muted-foreground">{data.message}</p>
          <Link
            to="/login"
            className="mt-5 inline-flex rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground hover:bg-brand-dark"
          >
            Go to Login
          </Link>
        </div>
      </AdminShell>
    );
  }

  const { stats, activity } = data;
  const previewActivity = activity.slice(0, ACTIVITY_PREVIEW_COUNT);
  const yearOptions = useMemo(() => {
    const dataYears = activity.map((item) => item.date.slice(0, 4)).filter(Boolean);
    const merged = [...new Set([...dataYears, ...BASE_YEAR_OPTIONS.map((o) => o.label)])].sort(
      (a, b) => b.localeCompare(a),
    );
    return merged.map((year) => ({ label: year }));
  }, [activity]);
  // Chronological Jan-Dec (preserve order — no alphabetical sort).
  const monthOptions = useMemo(() => MONTH_NAMES.map((name) => ({ label: name })), []);
  // filterMonth stores the typed/picked month NAME so typed text stays visible
  // (e.g. "Nov") instead of disappearing on partial matches.
  const monthNumber = filterMonth
    ? MONTH_NAMES.findIndex(
        (name) =>
          name.toLowerCase() === filterMonth.trim().toLowerCase() ||
          name.toLowerCase().startsWith(filterMonth.trim().toLowerCase()),
      )
    : -1;
  const filteredHistory = useMemo(
    () =>
      activity.filter((item) => {
        const [year, month, day] = item.date.split("-");
        if (filterYear && year !== filterYear.trim()) return false;
        if (monthNumber >= 0 && month !== String(monthNumber + 1).padStart(2, "0")) return false;
        if (filterDay && day !== filterDay.trim().padStart(2, "0")) return false;
        return true;
      }),
    [activity, filterDay, filterYear, monthNumber],
  );

  return (
    <AdminShell
      title="Admin Dashboard"
      subtitle="Office of Alumni Relations and Career Center — control center."
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-[11px] font-semibold text-muted-foreground">
          <Database className="size-3.5 text-brand" /> Live data from MySQL
        </p>
        <p className="text-[11px] text-muted-foreground">
          {formatNumber(stats.verifiedAlumni)} verified · {formatNumber(stats.adminAccounts)} active
          admin account{stats.adminAccounts === 1 ? "" : "s"}
        </p>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STAT_META.map((meta) => (
          <div key={meta.key} className="rounded-lg border border-border bg-card p-4">
            <meta.icon className="size-4 text-brand" />
            <p className="mt-3 text-2xl font-bold text-foreground">
              {formatNumber(stats[meta.key])}
            </p>
            <p className="text-xs text-muted-foreground">{meta.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-lg border-t-4 border-brand bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">Recent admin activity</h2>
          <button
            type="button"
            onClick={() => setShowHistory(true)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
          >
            <History className="size-3.5" /> View All / View History
          </button>
        </div>
        {previewActivity.length === 0 ? (
          <p className="mt-3 rounded-lg bg-muted px-3 py-4 text-xs text-muted-foreground">
            No activity yet. New registrations and verification actions will appear here.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {previewActivity.map((item) => (
              <li key={item.id} className="py-3">
                <p className="text-sm leading-snug text-foreground">{item.text}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.actorName} · {item.time}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showHistory && (
        <Modal title="Activity history" onClose={() => setShowHistory(false)} wide>
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
            Showing {filteredHistory.length} of {activity.length} activities
          </p>

          <div className="mt-2 max-h-96 overflow-y-auto rounded-lg border border-border">
            {filteredHistory.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                No activities on the selected date. Try clearing the filter.
              </p>
            ) : (
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="sticky top-0 border-b border-border bg-muted/80 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-semibold">Date</th>
                    <th className="px-4 py-2 font-semibold">Time</th>
                    <th className="px-4 py-2 font-semibold">Admin Name</th>
                    <th className="px-4 py-2 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredHistory.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{item.date}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{item.clock}</td>
                      <td className="px-4 py-2.5 text-xs font-semibold text-foreground">
                        {item.actorName}
                      </td>
                      <td className="px-4 py-2.5 text-xs leading-snug text-foreground">{item.text}</td>
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
