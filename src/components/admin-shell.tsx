import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { LayoutDashboard, Users, Megaphone, BarChart3, ShieldCheck, Activity } from "lucide-react";
import { useAdminName, useAdminRole } from "@/hooks/use-session";
import type { AdminRole } from "@/lib/session";

const ADMIN_RANK: Record<AdminRole, number> = { viewer: 0, standard: 1, head: 2 };

const ROLE_LABEL: Record<AdminRole, string> = {
  head: "Head Admin",
  standard: "Standard Admin",
  viewer: "Viewer Admin",
};

const links = [
  { to: "/admin", label: "Admin Dashboard", icon: LayoutDashboard, min: "viewer" },
  { to: "/admin/alumni", label: "Alumni Directory", icon: Users, min: "viewer" },
  { to: "/admin/posts", label: "Engagement Network", icon: Megaphone, min: "standard" },
  { to: "/admin/reports", label: "Reports & Statistics", icon: BarChart3, min: "viewer" },
  { to: "/admin/accounts", label: "Admin Accounts", icon: ShieldCheck, min: "head" },
  { to: "/admin/usage", label: "System Usage", icon: Activity, min: "viewer" },
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
  const adminRole = useAdminRole();
  const adminName = useAdminName();
  // Fail safe before hydration: only show links every tier may open.
  const visibleLinks = links.filter(
    (link) => ADMIN_RANK[adminRole ?? "viewer"] >= ADMIN_RANK[link.min],
  );

  return (
    <div className="mx-auto grid w-full max-w-6xl items-start gap-8 overflow-x-clip px-4 pb-4 pt-6 md:grid-cols-[230px_1fr]">
      <aside className="md:sticky md:top-[73px] md:self-start">
        <div className="rounded-2xl border border-white/15 bg-[#5A0012]/85 p-4 text-white shadow-sm backdrop-blur-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand">
            <span className="text-highlight">Administrator</span>
          </p>
          <p className="mt-1 text-sm font-semibold text-white">
            {adminName ?? "OARCC Main Office"}
          </p>
          <p className="text-[11px] text-white/70">
            {adminRole ? ROLE_LABEL[adminRole] : "System Administrator"}
          </p>
        </div>

        <nav className="mt-3 grid w-full max-w-full grid-cols-3 gap-1.5 rounded-2xl border border-white/15 bg-[#5A0012]/85 px-2 py-3 text-white shadow-sm backdrop-blur-sm md:flex md:flex-col md:overflow-visible">
          {visibleLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              title={l.label}
              activeOptions={{ exact: l.to === "/admin" }}
              activeProps={{ className: "bg-highlight text-highlight-foreground shadow-sm" }}
              inactiveProps={{ className: "text-white/85 hover:bg-white/10" }}
              className="flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-center text-[10px] font-medium leading-tight transition-colors md:min-h-0 md:flex-row md:justify-start md:gap-2 md:px-3 md:text-left md:text-sm"
            >
              <l.icon className="size-4 shrink-0" />
              <span className="min-w-0 whitespace-normal">{l.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      <section className="w-full min-w-0">
        <div className="flex w-full flex-col gap-3 border-l-4 border-brand pl-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {action && <div className="flex items-center gap-3">{action}</div>}
        </div>
        <div className="mt-6">{children}</div>
      </section>
    </div>
  );
}
