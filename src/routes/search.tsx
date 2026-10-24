import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, LayoutGrid, List, Briefcase, MapPin, X, ShieldCheck, Lock } from "lucide-react";
import {
  ALUMNI,
  BATCHES,
  COLLEGES,
  COURSES,
  REGIONS,
  initials,
  type Alumnus,
} from "@/data/alumni";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Search Alumni — AlumTrack MSU Main Campus" },
      {
        name: "description",
        content:
          "Search MSU Main Campus graduates by course, college, region, and batch year, and view their current job, company, and location.",
      },
      { property: "og:title", content: "Search Alumni — AlumTrack" },
      {
        property: "og:description",
        content: "Find MSU Main Campus alumni by course, college, region, and batch year.",
      },
    ],
  }),
  component: SearchPage,
});

type Filters = {
  course: string;
  college: string;
  region: string;
  batch: string;
};

const empty: Filters = { course: "", college: "", region: "", batch: "" };

function SearchPage() {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>(empty);
  const [view, setView] = useState<"grid" | "list">("grid");

  const set = (key: keyof Filters, value: string) =>
    setFilters((f) => ({ ...f, [key]: value }));

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ALUMNI.filter((a) => {
      if (q && !a.name.toLowerCase().includes(q) && !a.company.toLowerCase().includes(q))
        return false;
      if (filters.course && filters.course !== a.course) return false;
      if (filters.college && filters.college !== a.college) return false;
      if (filters.region && filters.region !== a.region) return false;
      if (filters.batch && filters.batch !== a.batch) return false;
      return true;
    });
  }, [query, filters]);

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
          <span className="font-semibold text-foreground">Privacy-protected results.</span>{" "}
          Public cards show only name, degree, batch year, employment status, company, and
          general region. Exact addresses, mobile numbers, and Akan email addresses stay
          private to verified alumni and OARCC administrators.
        </p>
      </div>

      <div className="mt-6 flex items-center gap-2 rounded-sm border border-border bg-card px-3 py-2 focus-within:border-brand">
        <Search className="size-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or company…"
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
            options={[...COURSES]}
            value={filters.course}
            onChange={(v) => set("course", v)}
          />
          <FilterSelect
            label="College"
            options={[...COLLEGES]}
            value={filters.college}
            onChange={(v) => set("college", v)}
          />
          <FilterSelect
            label="Region"
            options={[...REGIONS]}
            value={filters.region}
            onChange={(v) => set("region", v)}
          />
          <FilterSelect
            label="Batch Year"
            options={[...BATCHES]}
            value={filters.batch}
            onChange={(v) => set("batch", v)}
          />
        </aside>

        <section>
          <div className="flex items-center justify-between border-b border-border pb-3">
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{results.length}</span>{" "}
              of {ALUMNI.length} alumni
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
              No alumni match your search. Try adjusting the filters.
            </p>
          ) : (
            <div
              className={
                view === "grid"
                  ? "mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
                  : "mt-6 space-y-3"
              }
            >
              {results.map((a) => (
                <AlumniCard key={a.id} alumnus={a} view={view} />
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

function AlumniCard({ alumnus, view }: { alumnus: Alumnus; view: "grid" | "list" }) {
  const statusColor =
    alumnus.status === "Employed"
      ? "bg-success/12 text-success"
      : alumnus.status === "Self-employed"
        ? "bg-highlight/25 text-highlight-foreground"
        : "bg-muted text-muted-foreground";

  return (
    <article
      className={`group rounded-sm border border-border bg-card p-4 transition-colors hover:border-brand ${
        view === "list" ? "flex items-start gap-4" : ""
      }`}
    >
      <div className={view === "grid" ? "flex items-center gap-3" : "contents"}>
        <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-brand text-lg font-bold text-brand-foreground">
          {initials(alumnus.name)}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold leading-snug text-foreground group-hover:text-brand">
            {alumnus.name}
          </h2>
          <p className="text-xs text-muted-foreground">{alumnus.course}</p>
          <p className="mt-0.5 text-xs font-medium text-brand">Batch {alumnus.batch}</p>
          {view === "list" && <Details alumnus={alumnus} inline />}
        </div>
        {view === "list" && (
          <span
            className={`shrink-0 rounded-sm px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${statusColor}`}
          >
            {alumnus.status}
          </span>
        )}
      </div>

      {view === "grid" && (
        <>
          <div className="mt-4 border-t border-border pt-3">
            <Details alumnus={alumnus} />
          </div>
          <span
            className={`mt-3 inline-block rounded-sm px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${statusColor}`}
          >
            {alumnus.status}
          </span>
          <p className="mt-3 flex items-center gap-1.5 border-t border-border pt-3 text-[10px] text-muted-foreground">
            <Lock className="size-3" /> Contact details hidden — sign in as alumni to view
          </p>
        </>
      )}
    </article>
  );
}

function Details({ alumnus, inline }: { alumnus: Alumnus; inline?: boolean }) {
  return (
    <dl className={`space-y-1.5 text-xs ${inline ? "mt-2" : ""}`}>
      <div className="flex gap-2">
        <Briefcase className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
        <dd className="text-foreground">
          {alumnus.job} · <span className="text-muted-foreground">{alumnus.company}</span>
        </dd>
      </div>
      <div className="flex gap-2">
        <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
        <dd className="text-muted-foreground">{alumnus.region}</dd>
      </div>
    </dl>
  );
}