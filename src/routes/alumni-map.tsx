import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Filter, Globe2, MapPinned, RotateCcw } from "lucide-react";
import { AlumniShell } from "@/components/alumni-shell";
import { RealAlumniMap } from "@/components/real-alumni-map";
import { getAlumniMapPinsData } from "@/lib/gis.functions";
import { getMyWorkspaceData } from "@/lib/profile.functions";

export const Route = createFileRoute("/alumni-map")({
  head: () => ({
    meta: [
      { title: "Alumni Map — AlumTrack MSU Main Campus" },
      {
        name: "description",
        content:
          "Interactive GIS map of MSU Main Campus alumni in the Philippines and abroad. Find fellow graduates by city or host country based on opt-in privacy preferences.",
      },
      { property: "og:title", content: "Alumni Map — AlumTrack" },
      {
        property: "og:description",
        content: "View pinpointed alumni workplaces at home and overseas.",
      },
    ],
  }),
  loader: async () => {
    const [workspace, map] = await Promise.all([getMyWorkspaceData(), getAlumniMapPinsData()]);
    return {
      workspace,
      pins: map.ok ? map.pins : [],
      mapError: map.ok ? null : map.message,
    };
  },
  component: AlumniMapPage,
});

const GULF_COUNTRIES = ["United Arab Emirates", "Saudi Arabia", "Qatar"];

/** Pick the preset that best frames the selected host country. */
function focusForCountry(country: string): "region" | "philippines" | "middle-east" {
  if (country === "Philippines") return "philippines";
  if (GULF_COUNTRIES.includes(country)) return "middle-east";
  return "region";
}

function AlumniMapPage() {
  const { workspace: data, pins: allPins, mapError } = Route.useLoaderData();
  const user = data.ok ? data.user : null;
  const [course, setCourse] = useState("");
  const [batch, setBatch] = useState("");
  const [country, setCountry] = useState("");

  const courseOptions = useMemo(
    () => Array.from(new Set(allPins.map((pin) => pin.course))).sort((a, b) => a.localeCompare(b)),
    [allPins],
  );

  const batchOptions = useMemo(
    () =>
      Array.from(new Set(allPins.map((pin) => pin.batch)))
        .filter((value) => value !== "—")
        .sort((a, b) => b.localeCompare(a)),
    [allPins],
  );

  const countries = useMemo(
    () =>
      Array.from(new Set(allPins.map((pin) => pin.country))).sort((a, b) =>
        a === "Philippines" ? -1 : b === "Philippines" ? 1 : a.localeCompare(b),
      ),
    [allPins],
  );

  const overseasCountries = countries.filter((value) => value !== "Philippines").length;

  const pins = useMemo(
    () =>
      allPins.filter(
        (pin) =>
          (!course || pin.course === course) &&
          (!batch || pin.batch === batch) &&
          (!country || pin.country === country),
      ),
    [allPins, course, batch, country],
  );

  const employed = pins.filter((p) => p.status === "Employed").length;
  const hasFilters = Boolean(course || batch || country);

  return (
    <AlumniShell
      title="Alumni Map"
      subtitle="See where fellow graduates work — from Marawi and Metro Manila to Dubai, Riyadh, and Doha."
      user={user ? { name: user.fullName, batch: user.batch, initials: user.initials } : undefined}
    >
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-2">
        <span className="px-2 text-xs font-semibold text-foreground">Workplace pins</span>
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
          <Globe2 className="size-3.5 text-brand" />
          {countries.length} countries · {overseasCountries} overseas
        </span>
      </div>

      <div className="mt-4 grid gap-4">
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <MapPinned className="size-4 text-brand" />
                Pinpointed workplaces
              </h2>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Green pins are employed alumni, yellow pins are unemployed. Select a pin for
                details.
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-semibold text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-success" />
                {employed} employed
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-highlight" />
                {pins.length - employed} unemployed
              </span>
            </div>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <MapSelect label="Course" options={courseOptions} value={course} onChange={setCourse} />
            <MapSelect
              label="Batch year"
              options={batchOptions}
              value={batch}
              onChange={setBatch}
            />
            <MapSelect
              label="Country"
              options={countries}
              value={country}
              onChange={setCountry}
              allLabel="All countries"
            />
          </div>

          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setCourse("");
                setBatch("");
                setCountry("");
              }}
              className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground hover:bg-muted"
            >
              <RotateCcw className="size-3" />
              Clear filters
            </button>
          )}

          <div className="mt-4 w-full">
            <RealAlumniMap
              pins={pins}
              focusView={focusForCountry(country)}
              heightClassName="w-full h-[300px] sm:h-[450px] lg:h-[560px]"
            />
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Filter className="size-3" />
            Only alumni who opted in to workplace mapping appear as pins. Overseas locations are
            shown at state or province level.
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
  allLabel,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  allLabel?: string;
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
      <option value="">{allLabel ?? `All ${label.toLowerCase()}s`}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}
