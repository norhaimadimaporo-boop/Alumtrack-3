import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  MapPinned,
  Megaphone,
  MessageCircle,
  BarChart3,
  Activity,
  History,
  Trash2,
  ShieldCheck,
} from "lucide-react";
import { getAdminChatUnread } from "@/lib/chat.functions";
import { getAdminDashboardData } from "@/lib/admin.functions";
import { useAdminName, useAdminRole } from "@/hooks/use-session";
import type { AdminRole } from "@/lib/session";

const ADMIN_RANK: Record<AdminRole, number> = { viewer: 0, standard: 1, head: 2 };

const ROLE_LABEL: Record<AdminRole, string> = {
  head: "Head Admin",
  standard: "Standard Admin",
  viewer: "Viewer Admin",
};

type NavLink = {
  to: string;
  label: string;
  icon: typeof Users;
  min: AdminRole;
  badge?: "pending" | "unread" | "new";
};

const NAV_GROUPS: Array<{ section: string; links: NavLink[] }> = [
  {
    section: "Overview",
    links: [{ to: "/admin", label: "Dashboard", icon: LayoutDashboard, min: "viewer" }],
  },
  {
    section: "Alumni",
    links: [
      {
        to: "/admin/alumni",
        label: "Alumni directory",
        icon: Users,
        min: "viewer",
        badge: "pending",
      },
      { to: "/admin/map", label: "Alumni map (GIS)", icon: MapPinned, min: "viewer", badge: "new" },
    ],
  },
  {
    section: "Engagement",
    links: [
      { to: "/admin/posts", label: "Engagement network", icon: Megaphone, min: "standard" },
      {
        to: "/admin/messages",
        label: "Messages",
        icon: MessageCircle,
        min: "standard",
        badge: "unread",
      },
    ],
  },
  {
    section: "Insights",
    links: [
      { to: "/admin/reports", label: "Reports and statistics", icon: BarChart3, min: "viewer" },
    ],
  },
  {
    section: "System",
    links: [
      { to: "/admin/system-usage", label: "System usage", icon: Activity, min: "viewer" },
      {
        to: "/admin/activity-history",
        label: "Activity history",
        icon: History,
        min: "viewer",
        badge: "new",
      },
      {
        to: "/admin/recycle-bin",
        label: "Recycle bin",
        icon: Trash2,
        min: "standard",
        badge: "new",
      },
      { to: "/admin/accounts", label: "Admin accounts", icon: ShieldCheck, min: "head" },
    ],
  },
];

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
  const [pending, setPending] = useState(0);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [dashboard, messages] = await Promise.all([
          getAdminDashboardData(),
          adminRole && ADMIN_RANK[adminRole] >= ADMIN_RANK.standard
            ? getAdminChatUnread()
            : Promise.resolve(0),
        ]);
        if (!active) return;
        if (dashboard.ok) setPending(dashboard.stats.pendingVerification);
        setUnread(messages);
      } catch {
        // Sidebar badges are best-effort; the page itself still loads.
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 30_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [adminRole]);

  return (
    <div className="mx-auto grid w-full max-w-[1720px] items-start gap-5 overflow-x-clip px-3 pb-4 pt-6 sm:px-5 md:grid-cols-[240px_minmax(0,1fr)] lg:gap-6 lg:px-6 xl:grid-cols-[256px_minmax(0,1fr)] xl:px-8">
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

        <nav className="mt-3 rounded-2xl border border-white/15 bg-[#5A0012]/85 px-2 py-3 text-white shadow-sm backdrop-blur-sm">
          {NAV_GROUPS.map((group) => {
            const visible = group.links.filter(
              (link) => (ADMIN_RANK[adminRole ?? "viewer"] ?? 0) >= ADMIN_RANK[link.min],
            );
            if (visible.length === 0) return null;
            return (
              <div key={group.section} className="mb-2 last:mb-0">
                <p className="px-3 pb-1 pt-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-white/45">
                  {group.section}
                </p>
                <div className="grid grid-cols-3 gap-1.5 md:flex md:flex-col md:gap-0.5">
                  {visible.map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      title={link.label}
                      activeOptions={{ exact: link.to === "/admin" }}
                      activeProps={{
                        className: "!bg-[#D6B46C] !text-[#3B2412] font-semibold shadow-sm",
                      }}
                      inactiveProps={{ className: "text-white/85 hover:bg-white/10" }}
                      className="flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-center text-[10px] font-medium leading-tight transition-colors md:min-h-0 md:flex-row md:justify-start md:gap-2 md:px-3 md:text-left md:text-sm"
                    >
                      <link.icon className="size-4 shrink-0" />
                      <span className="min-w-0 truncate">{link.label}</span>
                      <Badge kind={link.badge} pending={pending} unread={unread} />
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
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

function Badge({
  kind,
  pending,
  unread,
}: {
  kind?: NavLink["badge"];
  pending: number;
  unread: number;
}) {
  if (kind === "new") {
    return (
      <span className="ml-auto rounded-full bg-[#D6B46C]/25 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#F0D9A8] md:text-[10px]">
        New
      </span>
    );
  }
  const count = kind === "pending" ? pending : kind === "unread" ? unread : 0;
  if (count <= 0) return null;
  return (
    <span className="ml-auto inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-[#D6B46C] px-1.5 py-0.5 text-[9px] font-bold leading-none text-[#3B2412] md:text-[10px]">
      {count > 99 ? "99+" : count}
    </span>
  );
}
