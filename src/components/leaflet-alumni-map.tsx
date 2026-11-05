import { useEffect, useMemo, useRef } from "react";
import { divIcon, latLngBounds, type DivIcon, type Map as LeafletMap } from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { MAP_VIEWS, type AlumniMapPin, type EmploymentStatus, type MapViewKey } from "@/data/gis";

const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors';

const STATUS_BADGE: Record<EmploymentStatus, { badge: string; dot: string }> = {
  Employed: {
    badge: "bg-success/15 text-success ring-1 ring-inset ring-success/30",
    dot: "bg-success",
  },
  Unemployed: {
    badge: "bg-highlight/30 text-highlight-foreground ring-1 ring-inset ring-highlight/50",
    dot: "bg-highlight",
  },
};

type PinGroup = {
  key: string;
  lat: number;
  lng: number;
  pins: AlumniMapPin[];
};

/**
 * Pins that share a workplace (Taguig, Marawi, Dubai, …) are stacked into one
 * marker. Coordinates are rounded to ~11 m so tiny geocoder differences do not
 * split the same city into separate pins.
 */
function groupKey(pin: AlumniMapPin): string {
  return `${pin.lat.toFixed(4)}:${pin.lng.toFixed(4)}`;
}

function groupPins(pins: AlumniMapPin[]): PinGroup[] {
  const groups = new Map<string, PinGroup>();

  for (const pin of pins) {
    const key = groupKey(pin);
    const existing = groups.get(key);
    if (existing) existing.pins.push(pin);
    else groups.set(key, { key, lat: pin.lat, lng: pin.lng, pins: [pin] });
  }

  return Array.from(groups.values());
}

/** Teardrop marker: green for employed alumni, yellow for unemployed. */
function pinIcon(pin: AlumniMapPin): DivIcon {
  const variant = pin.status === "Employed" ? "employed" : "unemployed";
  return divIcon({
    className: "alumni-marker",
    html: `<span class="alumni-pin alumni-pin--${variant}"><span>${pin.name.charAt(
      0,
    )}</span></span>`,
    iconSize: [26, 32],
    iconAnchor: [13, 31],
    popupAnchor: [0, -28],
  });
}

/** Round cluster bubble showing how many alumni share the same location. */
function clusterIcon(group: PinGroup): DivIcon {
  const employed = group.pins.filter((pin) => pin.status === "Employed").length;
  const variant =
    employed === 0 ? "unemployed" : employed === group.pins.length ? "employed" : "mixed";

  return divIcon({
    className: "alumni-marker alumni-marker--cluster",
    html: `<span class="alumni-pin alumni-pin--cluster alumni-pin--${variant}"><span>${group.pins.length}</span></span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18],
  });
}

function presetFor(key: MapViewKey) {
  return MAP_VIEWS.find((view) => view.key === key) ?? MAP_VIEWS[0]!;
}

type Envelope = { minLng: number; maxLng: number; minLat: number; maxLat: number };

/** Pins that belong to a preset's theme, used to guarantee nothing is cropped. */
const VIEW_ENVELOPES: Record<MapViewKey, Envelope> = {
  region: { minLng: 24, maxLng: 150, minLat: -10, maxLat: 50 },
  philippines: { minLng: 106, maxLng: 138, minLat: -4, maxLat: 28 },
  "middle-east": { minLng: 18, maxLng: 68, minLat: 2, maxLat: 48 },
};

function pinsForView(viewKey: MapViewKey, pins: AlumniMapPin[]): AlumniMapPin[] {
  const envelope = VIEW_ENVELOPES[viewKey];
  return pins.filter(
    (pin) =>
      pin.lng >= envelope.minLng &&
      pin.lng <= envelope.maxLng &&
      pin.lat >= envelope.minLat &&
      pin.lat <= envelope.maxLat,
  );
}

/**
 * Keeps the Leaflet camera in sync with the preset buttons / filters:
 * a preset change frames that region (plus every pin inside it), a filter
 * change frames the visible pins.
 */
function MapCamera({ viewKey, pins }: { viewKey: MapViewKey; pins: AlumniMapPin[] }) {
  const map = useMap();
  const pinKey = pins.map((pin) => pin.id).join("|");
  const lastView = useRef<MapViewKey | null>(null);
  const lastPins = useRef<string | null>(null);

  useEffect(() => {
    map.invalidateSize();

    if (lastView.current !== viewKey) {
      lastView.current = viewKey;
      lastPins.current = pinKey;

      const { bounds } = presetFor(viewKey);
      const target = latLngBounds([
        [bounds.minLat, bounds.minLng],
        [bounds.maxLat, bounds.maxLng],
      ]);

      // Expand the preset so every pin in that region stays on screen — e.g.
      // the Middle East view must show West KSA and the East UAE coast at once.
      const visible = pinsForView(viewKey, pins);
      if (visible.length > 0) {
        target.extend(latLngBounds(visible.map((pin) => [pin.lat, pin.lng] as [number, number])));
      }

      map.flyToBounds(target, { padding: [18, 18], duration: 0.45 });
      return;
    }

    if (lastPins.current !== pinKey) {
      lastPins.current = pinKey;
      if (pins.length > 0) {
        map.fitBounds(latLngBounds(pins.map((pin) => [pin.lat, pin.lng] as [number, number])), {
          padding: [48, 48],
          maxZoom: 8,
        });
      }
    }
  }, [map, viewKey, pinKey, pins]);

  return null;
}

/**
 * Hands the live Leaflet map instance to the wrapper so the zoom buttons that
 * live *outside* the map canvas (bottom-right of the footnote bar) can call
 * `map.zoomIn()` / `map.zoomOut()`.
 */
function MapBridge({
  onMapReady,
}: {
  onMapReady?: ((map: LeafletMap | null) => void) | undefined;
}) {
  const map = useMap();

  useEffect(() => {
    onMapReady?.(map);
    return () => onMapReady?.(null);
  }, [map, onMapReady]);

  return null;
}

function StatusPill({ status }: { status: EmploymentStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
        STATUS_BADGE[status].badge
      }`}
    >
      <span className={`size-1.5 rounded-full ${STATUS_BADGE[status].dot}`} />
      {status}
    </span>
  );
}

function SinglePinPopup({ pin }: { pin: AlumniMapPin }) {
  return (
    <div className="w-[218px] font-sans">
      <p className="text-sm font-bold leading-snug text-foreground">{pin.name}</p>

      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <StatusPill status={pin.status} />
        <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
          {pin.precision === "city" ? "City level" : "State level"}
        </span>
      </div>

      <dl className="mt-2.5 space-y-2 text-[11px] leading-snug">
        <div className="flex gap-2">
          <dt className="w-14 shrink-0 pt-px text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
            Location
          </dt>
          <dd className="min-w-0 font-semibold text-foreground">
            {pin.city}, {pin.region}
            <span className="block font-normal text-muted-foreground">{pin.country}</span>
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-14 shrink-0 pt-px text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
            Company
          </dt>
          <dd className="min-w-0 font-semibold text-foreground">
            {pin.company ?? "Not employed — open to opportunities"}
            <span className="block font-normal text-muted-foreground">
              {pin.role} · {pin.course}, Batch {pin.batch}
            </span>
          </dd>
        </div>
      </dl>
    </div>
  );
}

function GroupedPinPopup({ group }: { group: PinGroup }) {
  const first = group.pins[0]!;
  const employed = group.pins.filter((pin) => pin.status === "Employed").length;

  return (
    <div className="w-[238px] font-sans">
      <p className="text-sm font-bold leading-snug text-foreground">
        {group.pins.length} alumni in {first.city}
      </p>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {first.region ? `${first.region} · ` : ""}
        {first.country}
      </p>
      <p className="mt-1 text-[10px] font-semibold">
        <span className="text-success">{employed} employed</span>
        <span className="text-muted-foreground"> · </span>
        <span className="text-highlight-foreground">{group.pins.length - employed} unemployed</span>
      </p>

      <ul className="mt-2 max-h-52 space-y-2 overflow-y-auto pr-1">
        {group.pins.map((pin) => (
          <li key={pin.id} className="rounded-md border border-border bg-muted/40 px-2 py-1.5">
            <div className="flex items-start justify-between gap-2">
              <span className="text-[11px] font-semibold leading-tight text-foreground">
                {pin.name}
              </span>
              <StatusPill status={pin.status} />
            </div>
            <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">
              {pin.company ?? "Not employed — open to opportunities"}
            </p>
            <p className="text-[10px] leading-tight text-muted-foreground">
              {pin.role} · {pin.course}, Batch {pin.batch}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

type LeafletAlumniMapProps = {
  pins: AlumniMapPin[];
  /** Currently selected preset (controlled by the wrapper). */
  viewKey: MapViewKey;
  /** Preset that decides the very first camera position. */
  initialView: MapViewKey;
  /** Tailwind height utilities for the map canvas. */
  heightClassName: string;
  /** Receives the live Leaflet map instance (or null on unmount). */
  onMapReady?: ((map: LeafletMap | null) => void) | undefined;
};

export function LeafletAlumniMap({
  pins,
  viewKey,
  initialView,
  heightClassName,
  onMapReady,
}: LeafletAlumniMapProps) {
  const preset = presetFor(initialView);
  const groups = useMemo(() => groupPins(pins), [pins]);
  const markers = useMemo(
    () =>
      groups.map((group) => ({
        group,
        icon: group.pins.length > 1 ? clusterIcon(group) : pinIcon(group.pins[0]!),
      })),
    [groups],
  );

  return (
    <MapContainer
      center={preset.center}
      zoom={preset.zoom}
      minZoom={2}
      maxZoom={17}
      scrollWheelZoom={false}
      zoomControl={false}
      worldCopyJump
      className={`relative z-0 w-full ${heightClassName}`}
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} maxZoom={19} />
      <MapCamera viewKey={viewKey} pins={pins} />
      <MapBridge onMapReady={onMapReady} />

      {markers.map(({ group, icon }) => {
        const first = group.pins[0]!;
        const label =
          group.pins.length > 1
            ? `${group.pins.length} alumni — ${first.city}, ${first.country}`
            : `${first.name} — ${first.city}, ${first.country}`;

        return (
          <Marker
            key={group.key}
            position={[group.lat, group.lng]}
            icon={icon}
            title={label}
            alt={label}
            keyboard
          >
            <Popup
              maxWidth={group.pins.length > 1 ? 280 : 260}
              minWidth={group.pins.length > 1 ? 240 : 210}
              autoPan
            >
              {group.pins.length > 1 ? (
                <GroupedPinPopup group={group} />
              ) : (
                <SinglePinPopup pin={first} />
              )}
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
