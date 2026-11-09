import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Search,
  LayoutGrid,
  List,
  Briefcase,
  MapPin,
  X,
  ShieldCheck,
  Lock,
  Database,
  Phone,
  Mail,
  Globe,
} from "lucide-react";
import { getPublicAlumni } from "@/lib/search.functions";
import { initials } from "@/lib/profile-format";
import type { PublicAlumnus } from "@/lib/search.types";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Search Alumni — AlumTrack MSU Main Campus" },
      {
        name: "description",
        content:
          "Search MSU Main Campus graduates by name, course, college, region, and batch year, and view their current job, company, and location.",
      },
      { property: "og:title", content: "Search Alumni — AlumTrack" },
      {
        property: "og:description",
        content: "Find MSU Main Campus alumni by name, course, college, region, and batch year.",
      },
    ],
  }),
  loader: async () => getPublicAlumni(),
  component: SearchPage,
});

type Filters = {
  course: string;
  college: string;
  batch: string;
};

const empty: Filters = { course: "", college: "", batch: "" };

/** Case-insensitive equality so "lanao del sur" matches "Lanao del Sur". */
function sameValue(value: string, filter: string) {
  return !filter || value.trim().toLowerCase() === filter.trim().toLowerCase();
}

/** Deduplicates filter values, keeping the best-capitalised spelling. */
function pickLabels(values: string[]) {
  const seen = new Map<string, string>();
  for (const raw of values) {
    const value = raw.trim();
    if (!value || value === "—" || value === "Not provided") continue;
    const key = value.toLowerCase();
    const current = seen.get(key);
    const capitals = (value.match(/[A-Z]/g) ?? []).length;
    const currentCapitals = current ? (current.match(/[A-Z]/g) ?? []).length : -1;
    if (!current || capitals > currentCapitals) seen.set(key, value);
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

function SearchPage() {
  const data = Route.useLoaderData();
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>(empty);
  const [view, setView] = useState<"grid" | "list">("grid");

  const alumni = useMemo(() => (data.ok ? data.alumni : []), [data]);
  const signedIn = data.ok && data.signedIn;

  const options = useMemo(
    () => ({
      courses: pickLabels(alumni.map((a) => a.course)),
      colleges: pickLabels(alumni.map((a) => a.college)),
      batches: [...new Set(alumni.map((a) => a.batch).filter((b) => b !== "—"))].sort((a, b) =>
        b.localeCompare(a),
      ),
    }),
    [alumni],
  );

  const set = (key: keyof Filters, value: string) => setFilters((f) => ({ ...f, [key]: value }));

  const results = useMemo(() => {
    // Text search matches the alumni NAME only: every typed word must appear
    // in first/middle/last name (case-insensitive), so "Naimah" shows only
    // Naimah Tomawis Abdulcader and "abdul" shows only the Abdul/Abdulcader
    // names — never alumni whose name does not match the query.
    const q = query.trim().toLowerCase();
    const tokens = q ? q.split(/\s+/).filter(Boolean) : [];
    return alumni.filter((a) => {
      if (tokens.length > 0) {
        const nameParts = [
          a.firstName ?? "",
          a.middleName ?? "",
          a.lastName ?? "",
        ].map((part) => part.toLowerCase());
        const nameWords = a.name
          .toLowerCase()
          .split(/\s+/)
          .filter(Boolean);
        const nameText = `${nameParts.join(" ")} ${nameWords.join(" ")}`.trim();
        const matches = tokens.every((token) => {
          if (nameParts.some((part) => part.includes(token))) return true;
          if (nameText.includes(token)) return true;
          return nameWords.some((word) => word.includes(token));
        });
        if (!matches) return false;
      }
      if (!sameValue(a.course, filters.course)) return false;
      if (!sameValue(a.college, filters.college)) return false;
      if (filters.batch && a.batch !== filters.batch) return false;
      return true;
    });
  }, [alumni, query, filters]);

  const activeCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="border-l-4 border-brand pl-4">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Search Alumni</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Browse the public directory of Mindanao State University — Main Campus graduates.
        </p>
      </div>

      <div className="mt-5 flex items-start gap-3 rounded-lg border-l-4 border-highlight bg-card p-4">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">Privacy-protected results.</span> Public
          cards show only name, degree, batch year, employment status, company, and general region.
          Exact addresses, mobile numbers, and Akan email addresses stay private to verified alumni
          and OARCC administrators.
        </p>
      </div>

      <div className="mt-3 flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">
        <Database className="size-3.5 text-brand" />
        {data.ok ? (
          <>
            Live records from the OARCC alumni database · {alumni.length} verified{" "}
            {alumni.length === 1 ? "alumnus" : "alumni"}
          </>
        ) : (
          <span className="text-red-600">{data.message}</span>
        )}
      </div>

      <div className="mt-6 flex items-center gap-2 rounded-sm border border-border bg-card px-3 py-2 focus-within:border-brand">
        <Search className="size-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name..."
          className="w-full bg-transparent py-1.5 text-sm outline-none placeholder:text-muted-foreground"
        />
        {query && (
          <button onClick={() => setQuery("")} aria-label="Clear search">
            <X className="size-4 text-muted-foreground hover:text-brand" />
          </button>
        )}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground">
              Filters
            </p>
            {activeCount > 0 && (
              <button
                onClick={() => setFilters(empty)}
                className="text-xs font-medium text-brand hover:underline"
              >
                Clear all ({activeCount})
              </button>
            )}
          </div>
          <FilterSelect
            label="Course"
            options={options.courses}
            value={filters.course}
            onChange={(v) => set("course", v)}
          />
          <FilterSelect
            label="College"
            options={options.colleges}
            value={filters.college}
            onChange={(v) => set("college", v)}
          />
          <FilterSelect
            label="Batch Year"
            options={options.batches}
            value={filters.batch}
            onChange={(v) => set("batch", v)}
          />
        </aside>

        <section>
          <div className="flex items-center justify-between border-b border-border pb-3">
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{results.length}</span> of{" "}
              {alumni.length} verified alumni
            </p>
            <div className="flex items-center gap-1">
              <ViewButton
                active={view === "grid"}
                onClick={() => setView("grid")}
                label="Grid view"
              >
                <LayoutGrid className="size-4" />
              </ViewButton>
              <ViewButton
                active={view === "list"}
                onClick={() => setView("list")}
                label="List view"
              >
                <List className="size-4" />
              </ViewButton>
            </div>
          </div>

          {results.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              {alumni.length === 0
                ? data.ok
                  ? "No verified alumni are available yet. Records appear here once the OARCC verifies them."
                  : "The alumni directory is temporarily unavailable."
                : "No alumni match your search. Try adjusting the filters."}
            </p>
          ) : (
            <div
              className={
                view === "grid"
                  ? "mt-6 grid max-h-[650px] gap-4 overflow-y-auto pr-2 scroll-smooth sm:grid-cols-2 xl:grid-cols-3"
                  : "mt-6 max-h-[650px] space-y-3 overflow-y-auto pr-2 scroll-smooth"
              }
            >
              {results.map((a) => (
                <AlumniCard key={a.id} alumnus={a} signedIn={signedIn} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ViewButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`inline-flex size-8 items-center justify-center rounded-sm border transition-colors ${
        active
          ? "border-brand bg-brand text-brand-foreground"
          : "border-border text-muted-foreground hover:text-brand"
      }`}
    >
      {children}
    </button>
  );
}

function FilterSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-foreground">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-lg border bg-card px-3 py-2 text-sm outline-none focus:border-brand ${
          value ? "border-brand text-foreground" : "border-border text-muted-foreground"
        }`}
      >
        <option value="">All {label.toLowerCase()}s</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Unified card: same header → details → footer structure in grid and list
 * views (like the fully-shared Naimah Tomawis card), with rows hidden
 * dynamically by the server-side privacy gates. Employment and location rows
 * always render (with a private placeholder when hidden) so cards line up;
 * contact rows render only when the owner allows them.
 */
function AlumniCard({
  alumnus,
  signedIn,
}: {
  alumnus: PublicAlumnus;
  signedIn: boolean;
}) {
  const statusColor =
    alumnus.status === "Employed"
      ? "bg-success/12 text-success"
      : alumnus.status === "Unemployed"
        ? "bg-highlight/25 text-highlight-foreground"
        : "bg-muted text-muted-foreground";

  return (
    <article className="group rounded-sm border border-border bg-card p-4 transition-colors hover:border-brand">
      <div className="flex items-center gap-3">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-brand text-lg font-bold text-brand-foreground">
          {initials(alumnus.name)}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold leading-snug text-foreground group-hover:text-brand">
            {alumnus.name}
          </h2>
          <p className="text-xs text-muted-foreground">{alumnus.course}</p>
          <p className="mt-0.5 text-xs font-medium text-brand">Batch {alumnus.batch}</p>
        </div>
        <span
          className={`shrink-0 rounded-sm px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${statusColor}`}
        >
          {alumnus.status}
        </span>
      </div>

      <div className="mt-4 border-t border-border pt-3">
        <Details alumnus={alumnus} />
      </div>

      {!signedIn && (
        <p className="mt-3 flex items-center gap-1.5 border-t border-border pt-3 text-[10px] text-muted-foreground">
          <Lock className="size-3" /> Shared contact details — sign in as alumni to view more
        </p>
      )}
    </article>
  );
}

function Details({ alumnus }: { alumnus: PublicAlumnus }) {
  const locationText = alumnus.location ?? alumnus.region;
  return (
    <dl className="space-y-1.5 text-xs">
      <div className="flex gap-2">
        <Briefcase className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
        <dd className="text-foreground">
          {alumnus.job !== null ? (
            <>
              {alumnus.job} · <span className="text-muted-foreground">{alumnus.company}</span>
            </>
          ) : (
            <span className="text-muted-foreground">Employment details private</span>
          )}
        </dd>
      </div>
      <div className="flex gap-2">
        <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
        <dd className="text-muted-foreground">{locationText ?? "Location is private"}</dd>
      </div>
      {alumnus.mobile && (
        <div className="flex gap-2">
          <Phone className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
          <dd className="text-foreground">{alumnus.mobile}</dd>
        </div>
      )}
      {alumnus.emails.map((email) => (
        <div key={email} className="flex gap-2">
          <Mail className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
          <dd className="break-all text-foreground">{email}</dd>
        </div>
      ))}
      {alumnus.facebook && (
        <div className="flex gap-2">
          <Globe className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
          <dd className="break-all text-foreground">{alumnus.facebook}</dd>
        </div>
      )}
    </dl>
  );
}
