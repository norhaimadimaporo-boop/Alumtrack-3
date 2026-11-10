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
  user,
  children,
}: {
  title: string;
  subtitle?: string;
  user?: { name?: string; batch?: string; initials?: string } | undefined;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col items-start gap-6 px-4 pt-6 pb-12 md:flex-row">
      <AlumniSidebar user={user} />

      <section className="w-full min-w-0 max-w-full flex-1">
        <div className="flex w-full flex-col gap-3 border-l-4 border-brand pl-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        <div className="mt-6 w-full min-w-0 max-w-full px-3 sm:px-0">{children}</div>
      </section>
    </div>
  );
}

/** Shared left sidebar; first child in the flex wrapper for top-edge parity. */
export function AlumniSidebar({
  user,
}: {
  user?: { name?: string; batch?: string; initials?: string } | undefined;
}) {
  const displayName = user?.name || "Alumni";
  const displayBatch = user?.batch && user.batch !== "" ? user.batch : "—";
  const displayInitials = user?.initials || "AL";

  return (
    <aside className="w-full shrink-0 md:sticky md:top-[73px] md:w-64 md:self-start">
      <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-[#5A0012]/85 p-3 text-white shadow-sm backdrop-blur-sm">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-highlight text-sm font-bold text-highlight-foreground">
          {displayInitials}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-white">{displayName}</span>
          <span className="block text-[11px] text-white/70">Batch {displayBatch}</span>
        </span>
      </div>

      <nav
        aria-label="Alumni portal navigation"
        className="mt-3 grid w-full min-w-0 grid-cols-3 gap-1.5 rounded-2xl border border-white/15 bg-[#5A0012]/85 p-2 text-white shadow-sm backdrop-blur-sm md:flex md:flex-col md:overflow-visible"
      >
        {links.map((l) => (
          <Link
            key={l.to}
            title={l.label}
            to={l.to}
            activeProps={{ className: "bg-highlight text-highlight-foreground shadow-sm" }}
            inactiveProps={{ className: "text-white/85 hover:bg-white/10" }}
            className="flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1.5 py-2 text-center text-[11px] font-medium leading-tight transition-colors md:min-h-0 md:flex-row md:justify-start md:gap-2 md:px-3 md:text-left md:text-sm"
          >
            <l.icon className="size-4 shrink-0" />
            <span className="min-w-0 whitespace-normal">{l.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
