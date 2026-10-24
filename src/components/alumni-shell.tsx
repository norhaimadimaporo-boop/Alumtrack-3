import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  LayoutDashboard,
  UserRound,
  GraduationCap,
  Briefcase,
  Users,
  Newspaper,
  MapPinned,
  Settings,
} from "lucide-react";
import { ME } from "@/data/me";
import { NotificationBell } from "@/components/notification-bell";

const NOTIFICATIONS = [
  {
    title: "Profile verified",
    body: "OARCC has verified your alumni record.",
    time: "2 hours ago",
  },
  {
    title: "New job offering",
    body: "IT Officer I — DICT Region X is now accepting applicants.",
    time: "Yesterday",
  },
  {
    title: "Upcoming event",
    body: "MSU Grand Alumni Homecoming 2026 registration is open.",
    time: "3 days ago",
  },
];

const links = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/profile", label: "My Profile", icon: UserRound },
  { to: "/education", label: "Education Details", icon: GraduationCap },
  { to: "/employment", label: "Employment History", icon: Briefcase },
  { to: "/alumni-map", label: "Alumni Map", icon: MapPinned },
  { to: "/organization", label: "Organization", icon: Users },
  { to: "/jobs", label: "Job Offerings", icon: Newspaper },
  { to: "/settings", label: "Privacy & Settings", icon: Settings },
] as const;

export function AlumniShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 md:grid-cols-[220px_1fr]">
      <aside className="md:sticky md:top-24 md:self-start">
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-brand-foreground">
            NA
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-foreground">
              {ME.name}
            </span>
            <span className="block text-[11px] text-muted-foreground">
              Batch {ME.batch}
            </span>
          </span>
        </div>

        <nav className="mt-3 flex gap-1 overflow-x-auto rounded-lg border border-border bg-card p-2 md:flex-col md:overflow-visible">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
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
        <div className="flex flex-wrap items-start justify-between gap-3 border-l-4 border-brand pl-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          <NotificationBell items={NOTIFICATIONS} />
        </div>
        <div className="mt-6">{children}</div>
      </section>
    </div>
  );
}
