import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { GraduationCap, Loader2 } from "lucide-react";
import { login } from "@/lib/auth.functions";
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const navigate = useNavigate();

  const signIn = async () => {
    setError(null);
    setPending(true);

    try {
      const result = await login({ data: { email, password, role } });

      if (!result.ok) {
        setError(result.message);
        return;
      }

      setSession(result.role);
      await navigate({ to: result.role === "admin" ? "/admin" : "/dashboard" });
    } catch (err) {
      console.error(err);
      setError("We could not sign you in right now. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-20">
      <span className="mx-auto flex size-12 items-center justify-center rounded-lg bg-brand text-brand-foreground">
        <GraduationCap className="size-6" />
      </span>
      <h1 className="mt-6 text-center text-2xl font-bold text-foreground">Sign in to AlumTrack</h1>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        Use your MSU alumni credentials to manage your profile.
      </p>

      <form
        className="mt-8 space-y-4 rounded-xl border-t-4 border-brand bg-card p-7 shadow-sm"
        onSubmit={(e) => {
          e.preventDefault();
          void signIn();
        }}
      >
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
          {(["alumni", "admin"] as const).map((r) => (
            <button
              key={r}
              type="button"
              disabled={pending}
              onClick={() => {
                setRole(r);
                setError(null);
              }}
              className={`rounded-md py-2 text-xs font-semibold capitalize transition-colors disabled:opacity-60 ${
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
          <label
            htmlFor="login-email"
            className="text-xs font-semibold uppercase tracking-wide text-foreground"
          >
            Email
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={pending}
            className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand disabled:opacity-60"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label
            htmlFor="login-password"
            className="text-xs font-semibold uppercase tracking-wide text-foreground"
          >
            Password
          </label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={pending}
            className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand disabled:opacity-60"
            placeholder="••••••••"
          />
        </div>
        {error && (
          <p
            role="alert"
            className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand py-2.5 text-center text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          {pending ? "Signing in…" : "Login"}
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
