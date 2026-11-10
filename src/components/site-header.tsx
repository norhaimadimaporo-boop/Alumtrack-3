import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { useSession } from "@/hooks/use-session";
import { logout as logoutRequest } from "@/lib/auth.functions";
import { clearSession } from "@/lib/session";

const publicNav = [
  { to: "/", label: "Home" },
  { to: "/search", label: "Search Alumni" },
  { to: "/news", label: "Latest Posts" },
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

  const logout = async () => {
    try {
      await logoutRequest();
    } catch (error) {
      console.error("Failed to end the server session", error);
    }
    clearSession();
    setOpen(false);
    navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-50 bg-brand px-2 pt-2 sm:px-4">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 rounded-2xl border border-white/15 bg-brand px-3 py-3 shadow-sm sm:px-4">
        <Link to="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <BrandMark className="size-11 shrink-0" />
          <span className="leading-tight">
            <span className="block text-base font-bold tracking-tight text-white">
              AlumTrack
            </span>
            <span className="block text-[10px] uppercase tracking-[0.18em] text-white/70">
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
              activeProps={{ className: "text-highlight after:scale-x-100" }}
              className="relative px-3 py-2 text-sm font-medium text-white/85 transition-colors after:absolute after:inset-x-3 after:bottom-1 after:h-0.5 after:origin-left after:scale-x-0 after:bg-highlight after:transition-transform hover:text-highlight"
            >
              {item.label}
            </Link>
          ))}

          {role ? (
            <button
              type="button"
              onClick={() => void logout()}
              className="ml-2 inline-flex items-center rounded-xl bg-highlight px-4 py-2 text-sm font-semibold text-highlight-foreground transition-colors hover:bg-highlight/90"
            >
              Logout
            </button>
          ) : (
            <>
              <Link
                to="/login"
                className="ml-2 inline-flex items-center rounded-xl bg-highlight px-4 py-2 text-sm font-semibold text-highlight-foreground transition-colors hover:bg-highlight/90"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center rounded-xl border border-highlight px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-highlight hover:text-highlight-foreground"
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
          className="inline-flex size-9 items-center justify-center rounded-xl border border-white/25 text-white md:hidden"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open && (
        <nav className="mx-2 rounded-b-2xl border-t border-white/15 bg-brand px-4 py-2 md:hidden">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              activeOptions={{ exact: item.to === "/" }}
              activeProps={{ className: "text-highlight" }}
              className="block border-b border-white/15 py-3 text-sm font-medium text-white/85"
            >
              {item.label}
            </Link>
          ))}
          {role ? (
            <button
              type="button"
              onClick={() => void logout()}
              className="my-3 inline-flex w-full items-center justify-center rounded-xl bg-highlight px-4 py-2.5 text-sm font-semibold text-highlight-foreground"
            >
              Logout
            </button>
          ) : (
            <>
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="my-3 inline-flex w-full items-center justify-center rounded-xl bg-highlight px-4 py-2.5 text-sm font-semibold text-highlight-foreground"
              >
                Login
              </Link>
              <Link
                to="/register"
                onClick={() => setOpen(false)}
                className="mb-3 inline-flex w-full items-center justify-center rounded-xl border border-highlight px-4 py-2.5 text-sm font-semibold text-white"
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
