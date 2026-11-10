import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import { Loader2, Maximize2, X } from "lucide-react";
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
  heightClassName = "h-[450px] sm:h-[500px] lg:h-[550px] w-full",
  compact = false,
  showLegend = true,
  className = "",
}: RealAlumniMapProps) {
  const [mounted, setMounted] = useState(false);
  const [viewKey, setViewKey] = useState<MapViewKey>(initialView);
  const mapRef = useRef<LeafletMap | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mapReady) return;
    const timer = window.setTimeout(() => {
      mapRef.current?.invalidateSize({ pan: false });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [fullscreen, mapReady, viewKey]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !mapReady || typeof ResizeObserver === "undefined") return;

    let timer = 0;
    const observer = new ResizeObserver(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        mapRef.current?.invalidateSize({ pan: false });
      }, 100);
    });
    observer.observe(viewport);

    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, [mapReady]);

  // The zoom buttons live below the canvas (outside the map), so they need
  // the live map instance handed over by the Leaflet child component.
  const handleMapReady = useCallback((map: LeafletMap | null) => {
    mapRef.current = map;
    setMapReady(Boolean(map));
  }, []);

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

  // Full display (fullscreen) fills the whole viewport overlay edge-to-edge.
  // Embedded mode: the bordered wrapper owns the height (heightClassName)
  // and the Leaflet canvas stretches to w-full h-[100%] inside it, so the
  // map colour reaches the bottom border with no white gap.
  const canvasHeight = "h-full w-full";

  // Lock page scroll while the map is in full display so the redundant
  // browser scrollbar on the right disappears behind the overlay.
  useEffect(() => {
    if (!fullscreen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [fullscreen]);

  return (
    <div
      className={
        fullscreen
          ? `${className} fixed inset-0 z-50 flex h-screen w-screen flex-col overflow-hidden bg-black/60 p-4 backdrop-blur-md`
          : `${className} w-full max-w-full overflow-hidden`
      }
    >
      <div
        ref={viewportRef}
        className={
          "relative z-10 w-full max-w-full overflow-hidden rounded-2xl border border-border bg-secondary/40" +
          (fullscreen ? " min-h-0 flex-1" : ` ${heightClassName}`)
        }
      >
        {mounted ? (
          <Suspense
            fallback={<MapSkeleton heightClassName={canvasHeight} />}
          >
            <LeafletAlumniMap
              pins={pins}
              viewKey={viewKey}
              initialView={initialView}
              heightClassName={canvasHeight}
              onMapReady={handleMapReady}
            />
          </Suspense>
        ) : (
          <MapSkeleton heightClassName={canvasHeight} />
        )}

        {/* Floating view presets — top-left of the map canvas */}
        <div
          role="group"
          aria-label="Map view"
          style={{ position: "absolute", top: 12, left: 12, zIndex: 20 }}
          className="map-view-controls flex flex-wrap items-center gap-1 rounded-lg border border-border bg-card/95 p-1 shadow-md backdrop-blur"
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

        {/* Floating map legend — fixed upper-right, clear of the bottom-left zoom */}
        {showLegend && (
          <div
            style={{ position: "absolute", top: 12, right: 12, zIndex: 20 }}
            className="map-legend pointer-events-none max-w-[148px] rounded-lg border border-border bg-card/95 px-2.5 py-2 shadow-md backdrop-blur sm:max-w-none sm:px-3"
          >
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
          <div className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center bg-card/60 p-6">
            <p className="rounded-lg border border-border bg-card px-3 py-2 text-center text-xs text-muted-foreground shadow-sm">
              No alumni pins match these filters.
            </p>
          </div>
        )}
      </div>

      {/* Footer bar below/outside the map canvas: plotted count on the left,
          zoom + fullscreen controls on the right. Nothing overlaps the map. */}
      <div className="mt-2 flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="min-w-0 w-full text-[11px] text-muted-foreground sm:w-auto">
          {pins.length} alumni plotted · Tap pin for details
        </p>

        <div role="group" aria-label="Map zoom" className="flex w-full shrink-0 items-center gap-1 sm:w-auto">
          <button
            type="button"
            onClick={() => mapRef.current?.zoomIn()}
            disabled={!mapReady}
            aria-label="Zoom in"
            title="Zoom in"
            className="inline-flex size-7 items-center justify-center rounded-md border border-border bg-background text-sm font-bold leading-none text-foreground shadow-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => mapRef.current?.zoomOut()}
            disabled={!mapReady}
            aria-label="Zoom out"
            title="Zoom out"
            className="inline-flex size-7 items-center justify-center rounded-md border border-border bg-background text-sm font-bold leading-none text-foreground shadow-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => setFullscreen((open) => !open)}
            aria-label={fullscreen ? "Close fullscreen map" : "Open fullscreen map"}
            title={fullscreen ? "Close fullscreen map" : "Full display (fullscreen)"}
            className="inline-flex size-7 items-center justify-center rounded-md border border-border bg-background text-foreground shadow-sm transition-colors hover:bg-muted"
          >
            {fullscreen ? <X className="size-4" /> : <Maximize2 className="size-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
