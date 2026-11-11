import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Eye, EyeOff, Home, Loader2, Lock, Mail } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
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
  const [showPassword, setShowPassword] = useState(false);
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

      setSession(result.role, result.user.adminRole, result.user.fullName);
      await navigate({ to: result.role === "admin" ? "/admin" : "/dashboard" });
    } catch (err) {
      console.error(err);
      setError("We could not sign you in right now. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center overflow-y-auto p-4 md:p-6">
      <section className="my-auto w-full max-w-[380px] rounded-3xl border border-white/50 bg-white/60 p-5 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl sm:max-w-[400px] sm:p-6">
        <div className="flex justify-center">
          <BrandMark className="h-12 w-12 sm:h-14 sm:w-14" />
        </div>
        <h1 className="mt-3 text-center text-xl font-bold text-[#2B2827] sm:text-2xl">
          Sign in to AlumTrack
        </h1>
        <p className="mt-1 mb-4 text-center text-xs text-slate-600 sm:text-sm">
          Use your MSU alumni credentials to manage your profile.
        </p>

        <form
          className="space-y-3.5"
          onSubmit={(e) => {
            e.preventDefault();
            void signIn();
          }}
        >
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[#EFE6DC] p-1">
            {(["alumni", "admin"] as const).map((r) => (
              <button
                key={r}
                type="button"
                disabled={pending}
                onClick={() => {
                  setRole(r);
                  setError(null);
                }}
                className={`rounded-xl py-2.5 text-sm font-semibold capitalize transition-colors disabled:opacity-60 ${
                  role === r
                    ? "bg-[#80001B] text-white shadow-sm"
                    : "text-slate-600 hover:text-[#80001B]"
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <div>
            <label
              htmlFor="login-email"
              className="mb-2 block text-sm font-semibold text-[#2B2827]"
            >
              Email
            </label>
            <div className="relative flex items-center">
              <Mail
                aria-hidden="true"
                className="pointer-events-none absolute left-4 size-5 text-slate-500"
              />
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={pending}
                className="login-input h-10 w-full rounded-2xl border border-[#E6DFD5] bg-[#F5EFE6]/80 py-2.5 pl-11 pr-4 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-[#80001B] focus:bg-white disabled:opacity-60 sm:h-11"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="mb-2 block text-sm font-semibold text-[#2B2827]"
            >
              Password
            </label>
            <div className="relative flex items-center">
              <Lock
                aria-hidden="true"
                className="pointer-events-none absolute left-4 size-5 text-slate-500"
              />
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={pending}
                className="login-input h-10 w-full rounded-2xl border border-[#E6DFD5] bg-[#F5EFE6]/80 py-2.5 pl-11 pr-11 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-[#80001B] focus:bg-white disabled:opacity-60 sm:h-11"
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((show) => !show)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="absolute right-4 text-slate-500 transition-colors hover:text-[#80001B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#80001B]/30"
              >
                {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            </div>
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-2xl border border-red-300 bg-red-50/90 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#80001B] py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-[#600014] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {pending ? (
              <>
                <Loader2 className="size-5 animate-spin" /> Signing in…
              </>
            ) : (
              <>
                Login <ArrowRight className="size-5" />
              </>
            )}
          </button>

          {role === "alumni" && (
            <p className="text-center text-sm text-slate-600">
              No account yet?{" "}
              <Link to="/register" className="font-semibold text-[#80001B] hover:underline">
                Register here
              </Link>
            </p>
          )}
        </form>

        <div className="mt-4 border-t border-[#5A0012]/10 pt-4">
          <Link
            to="/"
            className="mx-auto flex w-fit items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-[#80001B] transition-colors hover:bg-[#F5EFE6]"
          >
            <Home className="size-4" /> Back to home
          </Link>
        </div>
      </section>
    </div>
  );
}
