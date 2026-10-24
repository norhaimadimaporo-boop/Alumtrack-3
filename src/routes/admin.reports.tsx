import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BarChart3, MapPinned } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { ClusterMap, BarList, DonutChart, ColumnChart } from "@/components/cluster-map";
import type { Cluster, Tone } from "@/components/cluster-map";
import { REGION_CLUSTERS, OVERSEAS_CLUSTERS } from "@/data/gis";

import { BATCHES, COLLEGES, COURSES, REGIONS } from "@/data/alumni";

export const Route = createFileRoute("/admin/reports")({
  head: () => ({
    meta: [
      { title: "Reports & Graduate Statistics — AlumTrack Admin" },
      {
        name: "description",
        content:
          "Tracer study analytics with GIS filters: employment rate by college, time to first employment, regional placement, and exportable employment distribution reports.",
      },
      { property: "og:title", content: "Reports & Graduate Statistics — AlumTrack Admin" },
      {
        property: "og:description",
        content: "GIS filtering, tracer analytics charts, and exportable graduate reports.",
      },
    ],
  }),
  component: AdminReports,
});

const employment = [
  { label: "Graduates", value: "4,182" },
  { label: "Employed alumni", value: "3,264" },
  { label: "Unemployed alumni", value: "918" },
  { label: "Employed locally", value: "2,731" },
  { label: "Employed abroad", value: "533" },
];


const GRADUATES_PER_YEAR = [
  { label: "2026 — Undergraduate", value: 812 },
  { label: "2026 — Masteral", value: 143 },
  { label: "2025 — Undergraduate", value: 774 },
  { label: "2025 — Masteral", value: 131 },
  { label: "2024 — Undergraduate", value: 738 },
  { label: "2024 — Masteral", value: 118 },
];

const TRIBAL_SPLIT = [
  { label: "Muslim graduates", value: 62 },
  { label: "Non-Muslim graduates", value: 38 },
];

const BY_PROVINCE = [
  { label: "Lanao del Sur", value: 1684 },
  { label: "Lanao del Norte", value: 902 },
  { label: "Maguindanao del Norte", value: 486 },
  { label: "Misamis Oriental", value: 421 },
  { label: "Metro Manila", value: 318 },
  { label: "Others", value: 371 },
];

const BY_GENDER = [
  { label: "Female", value: 2295 },
  { label: "Male", value: 1887 },
];

const BY_AFFILIATION = [
  { label: "Secular organizations", value: 1462 },
  { label: "Non-secular organizations", value: 1108 },
  { label: "No affiliation", value: 1612 },
];

const EMPLOYMENT_BY_PLACE = [
  { label: "BARMM", value: 1204 },
  { label: "Region X — Northern Mindanao", value: 731 },
  { label: "NCR", value: 496 },
  { label: "Saudi Arabia", value: 214 },
  { label: "UAE / Qatar", value: 187 },
  { label: "Others (abroad)", value: 132 },
];


const PROVINCES = [
  "Lanao del Sur",
  "Lanao del Norte",
  "Maguindanao del Norte",
  "Misamis Oriental",
  "Davao del Sur",
  "Metro Manila",
  "Cebu",
];
const TRIBES = ["Maranao", "Maguindanaon", "Tausug", "Iranun", "Cebuano", "Ilocano", "Others"];
const RELIGIONS = ["Islam", "Roman Catholic", "Protestant", "Iglesia ni Cristo", "Others"];
const GENDERS = ["Female", "Male"];
const AFFILIATIONS = ["Secular", "Non-secular", "Professional", "None"];
const COUNTRIES = ["Philippines", "Saudi Arabia", "UAE", "Qatar", "Singapore", "Canada", "USA"];
const EMPLOYMENT_STATUS = ["Employed", "Unemployed", "Self-employed", "Further studies"];

const LEGEND: { label: string; tone: Tone; hint?: string }[] = [
  { label: "Employed", tone: "success", hint: "70% and above employment rate" },
  { label: "Mixed", tone: "highlight", hint: "40% – 69% employment rate" },
  { label: "Unemployed", tone: "brand", hint: "below 40% employment rate" },
];

const clusterTone = (c: Cluster): Tone =>
  c.count % 3 === 0 ? "brand" : c.count % 3 === 1 ? "success" : "highlight";

function AdminReports() {
  const [scope, setScope] = useState<"domestic" | "overseas">("domestic");

  return (
    <AdminShell
      title="Reports & Graduate Statistics"
      subtitle="Tracer study analytics and GIS distribution of graduates."
    >
      <section className="rounded-lg border border-border bg-card p-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          GIS &amp; report filters
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <FilterSelect label="Batch year" options={[...BATCHES]} />
          <FilterSelect label="College" options={[...COLLEGES]} />
          <FilterSelect label="Course" options={[...COURSES]} />
          <FilterSelect label="Tribe" options={TRIBES} />
          <FilterSelect label="Religion" options={RELIGIONS} />
          <FilterSelect label="Province" options={PROVINCES} />
          <FilterSelect label="Gender" options={GENDERS} />
          <FilterSelect
            label="Group affiliation"
            options={AFFILIATIONS}
            allLabel="All group affiliations"
          />
          <FilterSelect
            label="Employment status"
            options={EMPLOYMENT_STATUS}
            allLabel="All employment statuses"
          />
          <FilterSelect label="Region" options={[...REGIONS]} />
          <FilterSelect label="Country" options={COUNTRIES} allLabel="All countries" />
        </div>
      </section>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {employment.map((e) => (
          <div key={e.label} className="rounded-lg border border-border bg-card p-4">
            <p className="text-2xl font-bold text-foreground">{e.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{e.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-lg border-t-4 border-brand bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <MapPinned className="size-4 text-brand" /> AlumTrack Map
          </h2>
          <div className="flex gap-1 rounded-md border border-border p-1">
            {(
              [
                ["domestic", "Philippines"],
                ["overseas", "Overseas"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setScope(key)}
                className={`rounded px-3 py-1.5 text-xs font-semibold transition-colors ${
                  scope === key
                    ? "bg-brand text-brand-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4">
          <ClusterMap
            clusters={scope === "domestic" ? REGION_CLUSTERS : OVERSEAS_CLUSTERS}
            toneOf={clusterTone}
            caption="Filtered employment distribution — click a cluster for its total. Cluster colors follow the legend below."
            legend={LEGEND}
            height="h-[420px]"
          />
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="1. No. of graduates per year (masteral & undergrad)" icon>
          <ColumnChart items={GRADUATES_PER_YEAR} />
        </Panel>
        <Panel title="2. Tribal percentage — Muslim / Non-Muslim graduates" icon>
          <DonutChart items={TRIBAL_SPLIT} />
        </Panel>
        <Panel title="3. No. of graduates by province" icon>
          <BarList items={BY_PROVINCE} suffix="" />
        </Panel>
        <Panel title="4. No. of graduates by gender" icon>
          <ColumnChart items={BY_GENDER} tone="success" />
        </Panel>
        <Panel title="5. Group affiliations (secular / non-secular)" icon>
          <DonutChart items={BY_AFFILIATION} />
        </Panel>
        <Panel title="6. Employment distribution by region and country" icon>
          <BarList items={EMPLOYMENT_BY_PLACE} suffix="" tone="success" />
        </Panel>
      </div>

    </AdminShell>
  );
}

function Panel({
  title,
  children,
  icon,
}: {
  title: string;
  children: React.ReactNode;
  icon?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        {icon && <BarChart3 className="size-4 text-brand" />}
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function FilterSelect({
  label,
  options,
  allLabel,
}: {
  label: string;
  options: string[];
  allLabel?: string;
}) {
  return (
    <select
      aria-label={label}
      defaultValue=""
      className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-muted-foreground outline-none focus:border-brand"
    >
      <option value="">{allLabel ?? `All ${label.toLowerCase()}s`}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}
