import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X, GraduationCap } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { clearSession } from "@/lib/session";

const publicNav = [
  { to: "/", label: "Home" },
  { to: "/search", label: "Search Alumni" },
  { to: "/news", label: "News & Events" },
  { to: "/oarcc", label: "OARCC" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const role = useSession();
  const navigate = useNavigate();

  const nav = [
    ...publicNav,
    ...(role === "alumni" ? ([{ to: "/dashboard", label: "My Dashboard" }] as const) : []),
    ...(role === "admin" ? ([{ to: "/admin", label: "Admin Dashboard" }] as const) : []),
  ];

  const logout = () => {
    clearSession();
    setOpen(false);
    navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background">
      <div className="h-1 w-full bg-brand" />
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <span className="flex size-9 items-center justify-center rounded-md bg-brand text-brand-foreground">
            <GraduationCap className="size-5" />
          </span>
          <span className="leading-tight">
            <span className="block text-base font-bold tracking-tight text-foreground">
              AlumTrack
            </span>
            <span className="block text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              MSU Main Campus
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              activeProps={{ className: "text-brand after:scale-x-100" }}
              className="relative px-3 py-2 text-sm font-medium text-foreground/80 transition-colors after:absolute after:inset-x-3 after:bottom-1 after:h-0.5 after:origin-left after:scale-x-0 after:bg-brand after:transition-transform hover:text-brand"
            >
              {item.label}
            </Link>
          ))}

          {role ? (
            <button
              type="button"
              onClick={logout}
              className="ml-2 inline-flex items-center rounded-md bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand-dark"
            >
              Logout
            </button>
          ) : (
            <>
              <Link
                to="/login"
                className="ml-2 inline-flex items-center rounded-md bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand-dark"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center rounded-md border border-brand px-4 py-2 text-sm font-semibold text-brand transition-colors hover:bg-brand hover:text-brand-foreground"
              >
                Register
              </Link>
            </>
          )}
        </nav>

        <button
          type="button"
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex size-9 items-center justify-center rounded-md border border-border text-foreground md:hidden"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open && (
        <nav className="border-t border-border bg-background px-4 py-2 md:hidden">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              activeOptions={{ exact: item.to === "/" }}
              activeProps={{ className: "text-brand" }}
              className="block border-b border-border py-3 text-sm font-medium text-foreground/80"
            >
              {item.label}
            </Link>
          ))}
          {role ? (
            <button
              type="button"
              onClick={logout}
              className="my-3 inline-flex w-full items-center justify-center rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground"
            >
              Logout
            </button>
          ) : (
            <>
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="my-3 inline-flex w-full items-center justify-center rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground"
              >
                Login
              </Link>
              <Link
                to="/register"
                onClick={() => setOpen(false)}
                className="mb-3 inline-flex w-full items-center justify-center rounded-md border border-brand px-4 py-2.5 text-sm font-semibold text-brand"
              >
                Register
              </Link>
            </>
          )}
        </nav>
      )}
    </header>
  );
}
