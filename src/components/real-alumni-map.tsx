import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { MAP_LEGEND, MAP_VIEWS, type AlumniMapPin, type MapViewKey } from "@/data/gis";

/**
 * Leaflet touches `window` while it initialises, so the interactive map is
 * code-split and only imported once the component is mounted in the browser.
 */
const LeafletAlumniMap = lazy(() =>
  import("@/components/leaflet-alumni-map").then((mod) => ({ default: mod.LeafletAlumniMap })),
);

type RealAlumniMapProps = {
  pins: AlumniMapPin[];
  /** Preset shown on first render. Defaults to the Asia–Middle East view. */
  initialView?: MapViewKey;
  /** When this changes, the map jumps to that preset (used by the filters). */
  focusView?: MapViewKey;
  /** Tailwind height utilities for the map canvas. */
  heightClassName?: string;
  /** Trims the legend footnote for smaller dashboard cards. */
  compact?: boolean;
  showLegend?: boolean;
  className?: string;
};

const LEGEND_DOT: Record<"success" | "highlight", string> = {
  success: "bg-success",
  highlight: "bg-highlight",
};

function MapSkeleton({ heightClassName }: { heightClassName: string }) {
  return (
    <div
      className={`flex w-full items-center justify-center bg-secondary/50 ${heightClassName}`}
      aria-hidden
    >
      <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" />
        Loading interactive map…
      </span>
    </div>
  );
}

export function RealAlumniMap({
  pins,
  initialView = "region",
  focusView,
  heightClassName = "h-[320px] sm:h-[440px]",
  compact = false,
  showLegend = true,
  className = "",
}: RealAlumniMapProps) {
  const [mounted, setMounted] = useState(false);
  const [viewKey, setViewKey] = useState<MapViewKey>(initialView);

  useEffect(() => setMounted(true), []);

  // The country filter picks the preset that frames it; ignore the first run so
  // the map keeps whatever view the visitor already selected.
  const lastFocus = useRef<MapViewKey | null>(null);
  useEffect(() => {
    if (!focusView) return;
    if (lastFocus.current === null || lastFocus.current === focusView) {
      lastFocus.current = focusView;
      return;
    }
    lastFocus.current = focusView;
    setViewKey(focusView);
  }, [focusView]);

  const counts = {
    success: pins.filter((pin) => pin.status === "Employed").length,
    highlight: pins.filter((pin) => pin.status === "Unemployed").length,
  };

  return (
    <div className={className}>
      <div className="relative overflow-hidden rounded-xl border border-border bg-secondary/40">
        {mounted ? (
          <Suspense fallback={<MapSkeleton heightClassName={heightClassName} />}>
            <LeafletAlumniMap
              pins={pins}
              viewKey={viewKey}
              initialView={initialView}
              heightClassName={heightClassName}
            />
          </Suspense>
        ) : (
          <MapSkeleton heightClassName={heightClassName} />
        )}

        {/* Floating view presets — top-left */}
        <div
          role="group"
          aria-label="Map view"
          className="absolute left-3 top-3 z-[900] flex flex-wrap items-center gap-1 rounded-lg border border-border bg-card/95 p-1 shadow-md backdrop-blur"
        >
          {MAP_VIEWS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setViewKey(option.key)}
              aria-pressed={option.key === viewKey}
              title={option.hint}
              className={`rounded-md px-2 py-1 text-[10px] font-semibold transition-colors sm:px-2.5 sm:py-1.5 sm:text-[11px] ${
                option.key === viewKey
                  ? "bg-brand text-brand-foreground"
                  : "text-foreground/80 hover:bg-muted"
              }`}
            >
              <span className={compact ? "inline" : "sm:hidden"}>{option.short}</span>
              {!compact && <span className="hidden sm:inline">{option.label}</span>}
            </button>
          ))}
        </div>

        {/* Floating map legend — upper-right */}
        {showLegend && (
          <div className="pointer-events-none absolute right-3 top-3 z-[900] max-w-[148px] rounded-lg border border-border bg-card/95 px-2.5 py-2 shadow-md backdrop-blur sm:max-w-none sm:px-3">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Map legend
            </p>
            <ul className="mt-1.5 space-y-1">
              {MAP_LEGEND.map((item) => (
                <li key={item.status} className="flex items-center gap-1.5">
                  <span
                    className={`size-2.5 shrink-0 rounded-full ${LEGEND_DOT[item.color]}`}
                    aria-hidden
                  />
                  <span className="text-[10px] font-semibold leading-tight text-foreground sm:text-[11px]">
                    {item.label}
                  </span>
                  <span className="ml-auto pl-1 text-[10px] font-semibold text-muted-foreground">
                    {counts[item.color]}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {pins.length === 0 && (
          <div className="pointer-events-none absolute inset-0 z-[850] flex items-center justify-center bg-card/60 p-6">
            <p className="rounded-lg border border-border bg-card px-3 py-2 text-center text-xs text-muted-foreground shadow-sm">
              No alumni pins match these filters.
            </p>
          </div>
        )}
      </div>

      <p className="mt-2 text-[11px] text-muted-foreground">
        {pins.length} {pins.length === 1 ? "alumnus" : "alumni"} plotted · tap a pin for details
        {compact
          ? "."
          : " · Philippines at city / municipality level, overseas at state / province level."}
      </p>
    </div>
  );
}
