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
} from "lucide-react";
import { AdminShell } from "@/components/admin-shell";

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
  component: AdminDashboard,
});

const stats = [
  { label: "Registered alumni", value: "4,182", icon: Users },
  { label: "Pending verification", value: "37", icon: UserCheck },
  { label: "Employed alumni", value: "3,264", icon: Briefcase },
  { label: "Active posts", value: "18", icon: Megaphone },
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

const activity = [
  { text: "Verified professional info of Norhaimah Y. Dimaporo", time: "10 minutes ago" },
  { text: "Posted job offering — Junior Software Developer", time: "2 hours ago" },
  { text: "Added alumni record — Christian L. Bello", time: "Yesterday" },
  { text: "Deactivated admin account — records.staff02", time: "2 days ago" },
];

function AdminDashboard() {
  return (
    <AdminShell
      title="Admin Dashboard"
      subtitle="Office of Alumni Relations and Career Center — control center."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-card p-4">
            <s.icon className="size-4 text-brand" />
            <p className="mt-3 text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <ul className="grid gap-3 sm:grid-cols-2">
          {modules.map((m) => (
            <li key={m.to}>
              <Link
                to={m.to}
                className="flex h-full flex-col rounded-lg border border-border bg-card p-5 transition-colors hover:border-brand"
              >
                <m.icon className="size-5 text-brand" />
                <h2 className="mt-3 text-sm font-bold text-foreground">{m.title}</h2>
                <p className="mt-1 text-xs text-muted-foreground">{m.desc}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-brand">
                  Open <ArrowRight className="size-3.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="rounded-lg border-t-4 border-brand bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">Recent admin activity</h2>
          <ul className="mt-3 divide-y divide-border">
            {activity.map((a) => (
              <li key={a.text} className="py-3">
                <p className="text-sm leading-snug text-foreground">{a.text}</p>
                <p className="mt-1 text-xs text-muted-foreground">{a.time}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </AdminShell>
  );
}
