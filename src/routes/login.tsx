import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { GraduationCap } from "lucide-react";
import { setSession } from "@/lib/session";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Alumni Login — AlumTrack MSU Main Campus" },
      {
        name: "description",
        content:
          "Sign in to AlumTrack to update your alumni profile, employment record, and job location.",
      },
      { property: "og:title", content: "Alumni Login — AlumTrack" },
      {
        property: "og:description",
        content: "Sign in to your MSU Main Campus alumni account.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const [role, setRole] = useState<"alumni" | "admin">("alumni");
  const navigate = useNavigate();

  const signIn = () => {
    setSession(role);
    navigate({ to: role === "admin" ? "/admin" : "/dashboard" });
  };

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-20">
      <span className="mx-auto flex size-12 items-center justify-center rounded-lg bg-brand text-brand-foreground">
        <GraduationCap className="size-6" />
      </span>
      <h1 className="mt-6 text-center text-2xl font-bold text-foreground">
        Sign in to AlumTrack
      </h1>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        Use your MSU alumni credentials to manage your profile.
      </p>

      <form
        className="mt-8 space-y-4 rounded-xl border-t-4 border-brand bg-card p-7 shadow-sm"
        onSubmit={(e) => {
          e.preventDefault();
          signIn();
        }}
      >
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
          {(["alumni", "admin"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`rounded-md py-2 text-xs font-semibold capitalize transition-colors ${
                role === r
                  ? "bg-brand text-brand-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-foreground">
            Email
          </label>
          <input
            className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-foreground">
            Password
          </label>
          <input
            type="password"
            className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
            placeholder="••••••••"
          />
        </div>
        <button
          type="submit"
          className="block w-full rounded-lg bg-brand py-2.5 text-center text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand-dark"
        >
          Login
        </button>
        {role === "alumni" && (
          <p className="text-center text-xs text-muted-foreground">
            No account yet?{" "}
            <Link to="/register" className="font-semibold text-brand hover:underline">
              Register here
            </Link>
          </p>
        )}
      </form>

      <Link to="/" className="mx-auto mt-6 text-sm font-medium text-brand hover:underline">
        Back to home
      </Link>
    </div>
  );
}
