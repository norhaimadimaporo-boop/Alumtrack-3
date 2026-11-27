import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { History } from "lucide-react";

import { AdminShell } from "@/components/admin-shell";
import { getAdminDashboardData } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/activity-history")({
  head: () => ({
    meta: [
      { title: "Activity History - AlumTrack Admin" },
      { name: "description", content: "Administrative audit log of all record changes." },
    ],
  }),
  loader: async () => getAdminDashboardData(),
  component: ActivityHistoryPage,
});

const ACTION_LABELS: Record<string, string> = {
  registration: "Registration",
  verification: "Verification",
  deletion: "Deletion / restoration",
  admin: "Admin change",
  login: "Login / logout",
};

function ActivityHistoryPage() {
  const data = Route.useLoaderData();
  const activity = data.ok ? data.activity.filter((item) => item.kind !== "login") : [];
  const [actor, setActor] = useState("");
  const [action, setAction] = useState("");
  const [date, setDate] = useState("");

  const actors = useMemo(
    () => [...new Set(activity.map((item) => item.actorName))].sort(),
    [activity],
  );

  const filtered = useMemo(
    () =>
      activity.filter((item) => {
        if (actor && item.actorName !== actor) return false;
        if (action && item.kind !== action) return false;
        if (date && !item.date.includes(date.trim())) return false;
        return true;
      }),
    [activity, actor, action, date],
  );

  return (
    <AdminShell
      title="Activity history"
      subtitle="Administrative audit trail - who changed what, and when."
    >
      {!data.ok && (
        <p className="rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-700">
          {data.message}
        </p>
      )}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Admin
            </span>
            <select
              value={actor}
              onChange={(e) => setActor(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
            >
              <option value="">All admins</option>
              {actors.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Action type
            </span>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
            >
              <option value="">All actions</option>
              {Object.entries(ACTION_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Date
            </span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </label>
        </div>

        <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
          <History className="size-3.5 text-brand" /> Showing {filtered.length} of {activity.length}{" "}
          administrative actions
        </p>

        <div className="mt-2 max-h-[600px] overflow-x-auto overflow-y-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="sticky top-0 bg-muted/80 text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-semibold">Date / time</th>
                <th className="px-3 py-2 font-semibold">Admin</th>
                <th className="px-3 py-2 font-semibold">Action</th>
                <th className="px-3 py-2 font-semibold">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                    {item.date} {item.clock}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs font-medium">
                    {item.actorName}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <span className="rounded-full bg-brand/10 px-2 py-0.5 font-semibold text-brand">
                      {ACTION_LABELS[item.kind] ?? item.kind}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs">{item.text}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-xs text-muted-foreground">
                    No administrative activity matches these filters.
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
