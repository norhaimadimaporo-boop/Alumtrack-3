import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

const FULLSCREEN_VIEWS: { key: MapViewKey; label: string }[] = [
  { key: "region", label: "Asia" },
  { key: "philippines", label: "PH" },
  { key: "middle-east", label: "Gulf" },
];

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
  heightClassName = "h-[400px] md:h-[480px] w-full",
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

  useEffect(() => {
    if (!fullscreen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [fullscreen]);

  return (
    <>
      <div className={`${className} w-full max-w-full overflow-hidden`}>
        <div
          ref={!fullscreen ? viewportRef : undefined}
          className={`relative z-10 w-full overflow-hidden rounded-2xl border border-white/30 bg-secondary/40 shadow-md ${heightClassName}`}
        >
          {mounted && !fullscreen ? (
            <Suspense fallback={<MapSkeleton heightClassName={canvasHeight} />}>
              <LeafletAlumniMap
                pins={pins}
                viewKey={viewKey}
                initialView={viewKey}
                heightClassName={canvasHeight}
                onMapReady={handleMapReady}
              />
            </Suspense>
          ) : fullscreen ? (
            <div className="flex h-full w-full items-center justify-center" aria-hidden />
          ) : (
            <MapSkeleton heightClassName={canvasHeight} />
          )}

          {/* Floating view presets — top-left of the embedded map */}
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

          {showLegend && (
            <MapLegend counts={counts} />
          )}

          {pins.length === 0 && (
            <div className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center bg-card/60 p-6">
              <p className="rounded-lg border border-border bg-card px-3 py-2 text-center text-xs text-muted-foreground shadow-sm">
                No alumni pins match these filters.
              </p>
            </div>
          )}
        </div>

        <div className="mt-2 flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="min-w-0 w-full text-[11px] text-muted-foreground sm:w-auto">
            {pins.length} alumni plotted · Tap pin for details
          </p>
          <div role="group" aria-label="Map zoom" className="flex w-full shrink-0 items-center gap-1 sm:w-auto">
            <ZoomButton label="Zoom in" onClick={() => mapRef.current?.zoomIn()} disabled={!mapReady}>
              +
            </ZoomButton>
            <ZoomButton label="Zoom out" onClick={() => mapRef.current?.zoomOut()} disabled={!mapReady}>
              −
            </ZoomButton>
            <button
              type="button"
              onClick={() => setFullscreen(true)}
              aria-label="Open fullscreen map"
              title="Full display (fullscreen)"
              className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-background text-foreground shadow-sm transition-colors hover:bg-muted"
            >
              <Maximize2 className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {fullscreen &&
        mounted &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md md:p-8"
            onMouseDown={(event) => {
              if (event.currentTarget === event.target) setFullscreen(false);
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="gis-map-dialog-title"
              className="relative flex h-[85vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-white/50 bg-white/90 shadow-2xl backdrop-blur-xl"
            >
              <header className="flex shrink-0 flex-col gap-3 border-b border-border/70 bg-white/70 px-4 py-3 sm:px-6 sm:py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 id="gis-map-dialog-title" className="text-base font-bold text-foreground sm:text-lg">
                      GIS Alumni Map Overview
                    </h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {pins.length} alumni plotted · Select a pin for details
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFullscreen(false)}
                    aria-label="Close map view"
                    title="Close map view"
                    className="inline-flex h-9 shrink-0 items-center gap-2 rounded-xl border border-border bg-white/80 px-3 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-muted"
                  >
                    <span className="hidden sm:inline">Close</span>
                    <X className="size-4" />
                  </button>
                </div>
                <div role="group" aria-label="Quick map filters" className="flex flex-wrap items-center gap-2">
                  {FULLSCREEN_VIEWS.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setViewKey(option.key)}
                      aria-pressed={viewKey === option.key}
                      className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        viewKey === option.key
                          ? "border-brand bg-brand text-brand-foreground"
                          : "border-highlight text-brand hover:bg-accent"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </header>

              <div className="relative flex min-h-0 flex-1 flex-col p-2 sm:p-4">
                <div
                  ref={viewportRef}
                  className="relative z-10 min-h-0 w-full flex-1 overflow-hidden rounded-2xl border border-white/40 bg-secondary/40 shadow-md"
                >
                  <Suspense fallback={<MapSkeleton heightClassName="h-full w-full" />}>
                    <LeafletAlumniMap
                      pins={pins}
                      viewKey={viewKey}
                      initialView={viewKey}
                      heightClassName="h-full w-full"
                      onMapReady={handleMapReady}
                    />
                  </Suspense>
                  {showLegend && <MapLegend counts={counts} />}
                  {pins.length === 0 && (
                    <div className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center bg-card/60 p-6">
                      <p className="rounded-lg border border-border bg-card px-3 py-2 text-center text-xs text-muted-foreground shadow-sm">
                        No alumni pins match these filters.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-border/70 bg-white/70 px-4 py-3 sm:px-6">
                <p className="text-xs text-muted-foreground">Use the map controls to zoom and explore.</p>
                <div role="group" aria-label="Map zoom" className="flex shrink-0 items-center gap-2">
                  <ZoomButton label="Zoom in" onClick={() => mapRef.current?.zoomIn()} disabled={!mapReady}>
                    +
                  </ZoomButton>
                  <ZoomButton label="Zoom out" onClick={() => mapRef.current?.zoomOut()} disabled={!mapReady}>
                    −
                  </ZoomButton>
                </div>
              </footer>
            </section>
          </div>,
          document.body,
        )}
    </>
  );
}

function MapLegend({ counts }: { counts: Record<"success" | "highlight", number> }) {
  return (
    <div
      style={{ position: "absolute", top: 12, right: 12, zIndex: 20 }}
      className="map-legend pointer-events-none max-w-[148px] rounded-lg border border-border bg-card/95 px-2.5 py-2 shadow-md backdrop-blur sm:max-w-none sm:px-3"
    >
      <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Map legend</p>
      <ul className="mt-1.5 space-y-1">
        {MAP_LEGEND.map((item) => (
          <li key={item.status} className="flex items-center gap-1.5">
            <span className={`size-2.5 shrink-0 rounded-full ${LEGEND_DOT[item.color]}`} aria-hidden />
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
  );
}

function ZoomButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-white/80 text-sm font-bold leading-none text-foreground shadow-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}
