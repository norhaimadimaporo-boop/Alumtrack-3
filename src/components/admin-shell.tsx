import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  LayoutDashboard,
  Users,
  Megaphone,
  BarChart3,
  ShieldCheck,
  Activity,
} from "lucide-react";
import { NotificationBell } from "@/components/notification-bell";

const NOTIFICATIONS = [
  {
    title: "5 alumni for verification",
    body: "New registrations are waiting for review in the directory.",
    time: "1 hour ago",
  },
  {
    title: "Tracer form responses",
    body: "23 alumni updated their employment records this week.",
    time: "Today",
  },
  {
    title: "Job posting expiring",
    body: "IT Officer I — DICT Region X closes in 3 days.",
    time: "2 days ago",
  },
];

const links = [
  { to: "/admin", label: "Admin Dashboard", icon: LayoutDashboard },
  { to: "/admin/alumni", label: "Alumni Directory", icon: Users },
  { to: "/admin/posts", label: "Engagement Network", icon: Megaphone },
  { to: "/admin/reports", label: "Reports & Statistics", icon: BarChart3 },
  { to: "/admin/accounts", label: "Admin Accounts", icon: ShieldCheck },
  { to: "/admin/usage", label: "System Usage", icon: Activity },
] as const;

export function AdminShell({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 md:grid-cols-[230px_1fr]">
      <aside className="md:sticky md:top-24 md:self-start">
        <div className="rounded-lg border-t-4 border-brand bg-card p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand">
            Administrator
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">OARCC Main Office</p>
          <p className="text-[11px] text-muted-foreground">System Administrator</p>
        </div>

        <nav className="mt-3 flex gap-1 overflow-x-auto rounded-lg border border-border bg-card p-2 md:flex-col md:overflow-visible">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeOptions={{ exact: l.to === "/admin" }}
              activeProps={{ className: "bg-brand text-brand-foreground" }}
              inactiveProps={{ className: "text-foreground/80 hover:bg-muted" }}
              className="flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors"
            >
              <l.icon className="size-4" />
              <span className="whitespace-nowrap">{l.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3 border-l-4 border-brand pl-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-3">
            {action}
            <NotificationBell items={NOTIFICATIONS} />
          </div>
        </div>
        <div className="mt-6">{children}</div>
      </section>
    </div>
  );
}
