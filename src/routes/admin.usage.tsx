import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Activity, MapPinned, LogIn, Users } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { ClusterMap } from "@/components/cluster-map";
import { LOGIN_ACTIVITY } from "@/data/gis";
import { BATCHES, COURSES, REGIONS } from "@/data/alumni";

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
  component: AdminUsage,
});

const logins = [
  { user: "Naimah T. Abdulcader", role: "Alumni", when: "08-08-2026 09:14", device: "Chrome · Windows", where: "Taguig, NCR" },
  { user: "oarcc.head", role: "Admin", when: "08-08-2026 08:52", device: "Edge · Windows", where: "Marawi City, BARMM" },
  { user: "Rania K. Bantuas", role: "Alumni", when: "07-08-2026 21:03", device: "Safari · iPhone", where: "Makati, NCR" },
  { user: "records.staff01", role: "Admin", when: "07-08-2026 16:40", device: "Chrome · macOS", where: "Iligan City, Region X" },
  { user: "Omar H. Pangandaman", role: "Alumni", when: "07-08-2026 12:27", device: "Chrome · Android", where: "Riyadh, KSA" },
];

const summary = [
  { label: "Active sessions now", value: "184" },
  { label: "Logins today", value: "612" },
  { label: "Regions with activity", value: "11" },
  { label: "Overseas sessions", value: "37" },
];

const SHORTS: Record<string, string> = {
  BARMM: "BARMM",
  "Region X — Northern Mindanao": "R-X",
  "NCR — Metro Manila": "NCR",
  "Region XI — Davao": "R-XI",
  Overseas: "ABROAD",
};

const clusters = LOGIN_ACTIVITY.map((l) => ({
  region: l.region,
  short: SHORTS[l.region] ?? l.region.slice(0, 6),
  count: l.sessions,
  x: l.x,
  y: l.y,
}));

function AdminUsage() {
  const [range, setRange] = useState<"today" | "week" | "month">("today");

  return (
    <AdminShell
      title="System Monitoring"
      subtitle="Interactive login & activity GIS map, session monitoring, and tracer report exports."
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
            <MapPinned className="size-4 text-brand" /> Login &amp; activity GIS map
          </h2>
          <div className="flex gap-1 rounded-md border border-border p-1">
            {(
              [
                ["today", "Today"],
                ["week", "This week"],
                ["month", "This month"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setRange(key)}
                className={`rounded px-3 py-1.5 text-xs font-semibold transition-colors ${
                  range === key
                    ? "bg-brand text-brand-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4">
          <ClusterMap
            clusters={clusters}
            unit="sessions"
            tone="success"
            caption="Active alumni and admin sessions grouped by access region."
          />
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <LogIn className="size-4 text-brand" /> Access logs
          </h2>
          <ul className="mt-3 divide-y divide-border">
            {logins.map((l) => (
              <li key={l.when} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{l.user}</p>
                  <p className="text-xs text-muted-foreground">{l.device}</p>
                  <p className="mt-0.5 text-xs text-brand">{l.where}</p>
                </div>
                <div className="shrink-0 text-right">
                  <span className="inline-flex rounded-sm bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    {l.role}
                  </span>
                  <p className="mt-1 text-xs text-muted-foreground">{l.when}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Users className="size-4 text-brand" /> Active sessions per region
            </h2>
            <ul className="mt-3 space-y-2">
              {LOGIN_ACTIVITY.map((l) => (
                <li key={l.region} className="flex items-center justify-between text-xs">
                  <span className="text-foreground">{l.region}</span>
                  <span className="font-semibold text-muted-foreground">{l.sessions}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border-t-4 border-brand bg-card p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Activity className="size-4 text-brand" /> Export tracer report
            </h2>
            <div className="mt-3 space-y-2">
              <Select label="Batch year" options={[...BATCHES]} />
              <Select label="Course" options={[...COURSES]} />
              <Select label="Current region" options={[...REGIONS]} />
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

function Select({ label, options }: { label: string; options: string[] }) {
  return (
    <select
      aria-label={label}
      defaultValue=""
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
