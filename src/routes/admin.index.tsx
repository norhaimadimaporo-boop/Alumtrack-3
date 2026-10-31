import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Users,
  UserCheck,
  Briefcase,
  Megaphone,
  BarChart3,
  ShieldCheck,
  Activity,
  ArrowRight,
  Database,
} from "lucide-react";

import { AdminShell } from "@/components/admin-shell";
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

const modules = [
  {
    to: "/admin/alumni",
    title: "Manage Alumni Directory",
    desc: "Add, edit, search, delete records and verify alumni professional info.",
    icon: Users,
  },
  {
    to: "/admin/posts",
    title: "Engagement Network",
    desc: "Post announcements, news & events, and job offerings.",
    icon: Megaphone,
  },
  {
    to: "/admin/reports",
    title: "Generate Reports",
    desc: "Employment statuses, professional development, and graduate statistics.",
    icon: BarChart3,
  },
  {
    to: "/admin/accounts",
    title: "Manage Admin Accounts",
    desc: "Add new admins, set roles and grants, deactivate or delete accounts.",
    icon: ShieldCheck,
  },
  {
    to: "/admin/usage",
    title: "Monitor System Usage",
    desc: "Trace login activity and view the alumni map.",
    icon: Activity,
  },
] as const;

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-PH").format(value);
}

function AdminDashboard() {
  const data = Route.useLoaderData();

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

  const { stats, activity, recentRegistrations } = data;

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

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <ul className="grid gap-3 sm:grid-cols-2">
          {modules.map((module) => (
            <li key={module.to}>
              <Link
                to={module.to}
                className="flex h-full flex-col rounded-lg border border-border bg-card p-5 transition-colors hover:border-brand"
              >
                <module.icon className="size-5 text-brand" />
                <h2 className="mt-3 text-sm font-bold text-foreground">{module.title}</h2>
                <p className="mt-1 text-xs text-muted-foreground">{module.desc}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-brand">
                  Open <ArrowRight className="size-3.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="rounded-lg border-t-4 border-brand bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">Recent admin activity</h2>
          {activity.length === 0 ? (
            <p className="mt-3 rounded-lg bg-muted px-3 py-4 text-xs text-muted-foreground">
              No activity yet. New registrations and verification actions will appear here.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {activity.map((item) => (
                <li key={item.id} className="py-3">
                  <p className="text-sm leading-snug text-foreground">{item.text}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.time}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">Latest registrations</h2>
          <Link
            to="/admin/alumni"
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
          >
            Open directory <ArrowRight className="size-3.5" />
          </Link>
        </div>

        {recentRegistrations.length === 0 ? (
          <p className="mt-3 rounded-lg bg-muted px-3 py-4 text-xs text-muted-foreground">
            No alumni profiles yet. New registrations will show up here immediately.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="pb-2 font-semibold">Alumni</th>
                  <th className="pb-2 font-semibold">Course</th>
                  <th className="pb-2 font-semibold">Batch</th>
                  <th className="pb-2 font-semibold">Status</th>
                  <th className="pb-2 text-right font-semibold">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentRegistrations.map((alumnus) => (
                  <tr key={alumnus.id}>
                    <td className="py-3 font-semibold text-foreground">{alumnus.name}</td>
                    <td className="py-3 text-xs text-muted-foreground">{alumnus.course}</td>
                    <td className="py-3 text-xs text-muted-foreground">{alumnus.batch}</td>
                    <td className="py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                          alumnus.verificationStatus === "verified"
                            ? "bg-success text-success-foreground"
                            : "bg-highlight text-highlight-foreground"
                        }`}
                      >
                        {alumnus.verificationStatus === "verified"
                          ? "Verified"
                          : "For verification"}
                      </span>
                    </td>
                    <td className="py-3 text-right text-xs text-muted-foreground">
                      {alumnus.createdAt}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
