import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MapPinned, Filter } from "lucide-react";
import { AlumniShell } from "@/components/alumni-shell";
import { ClusterMap, PinMap } from "@/components/cluster-map";
import { REGION_CLUSTERS, WORKPLACE_PINS } from "@/data/gis";
import { BATCHES, COURSES, REGIONS } from "@/data/alumni";

export const Route = createFileRoute("/alumni-map")({
  head: () => ({
    meta: [
      { title: "Alumni Map — AlumTrack MSU Main Campus" },
      {
        name: "description",
        content:
          "Interactive GIS map of MSU Main Campus alumni workplaces. Find fellow graduates working near you based on opt-in privacy preferences.",
      },
      { property: "og:title", content: "Alumni Map — AlumTrack" },
      {
        property: "og:description",
        content: "View pinpointed alumni workplaces and connect with nearby graduates.",
      },
    ],
  }),
  component: AlumniMapPage,
});

function AlumniMapPage() {
  const [mode, setMode] = useState<"workplaces" | "clusters">("workplaces");
  const [course, setCourse] = useState("");
  const [batch, setBatch] = useState("");
  const [region, setRegion] = useState("");

  const pins = useMemo(() => WORKPLACE_PINS, []);

  return (
    <AlumniShell
      title="Alumni Map"
      subtitle="See where fellow graduates work and connect with alumni near you."
    >
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-2">
        {(
          [
            ["workplaces", "Workplace pins"],
            ["clusters", "Regional clusters"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setMode(key)}
            className={`rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
              mode === key
                ? "bg-brand text-brand-foreground"
                : "text-foreground/80 hover:bg-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-4">
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <MapPinned className="size-4 text-brand" />
            {mode === "workplaces" ? "Pinpointed workplaces" : "Alumni per region"}
          </h2>

          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <MapSelect label="Course" options={[...COURSES]} value={course} onChange={setCourse} />
            <MapSelect label="Batch year" options={[...BATCHES]} value={batch} onChange={setBatch} />
            <MapSelect label="Region" options={[...REGIONS]} value={region} onChange={setRegion} />
          </div>

          <div className="mt-4">
            {mode === "workplaces" ? (
              <PinMap pins={pins} height="h-[560px]" />
            ) : (
              <ClusterMap clusters={REGION_CLUSTERS} height="h-[560px]" />
            )}
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Filter className="size-3" /> Only alumni who opted in to workplace mapping appear
            as pins.
          </p>
        </div>
      </div>
    </AlumniShell>
  );
}

function MapSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full rounded-md border bg-background px-3 py-2 text-xs outline-none focus:border-brand ${
        value ? "border-brand text-foreground" : "border-border text-muted-foreground"
      }`}
    >
      <option value="">All {label.toLowerCase()}s</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}
