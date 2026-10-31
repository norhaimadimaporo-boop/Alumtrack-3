import { useEffect, useMemo, useRef } from "react";
import { divIcon, latLngBounds, type DivIcon } from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, ZoomControl, useMap } from "react-leaflet";
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

function presetFor(key: MapViewKey) {
  return MAP_VIEWS.find((view) => view.key === key) ?? MAP_VIEWS[0]!;
}

/**
 * Keeps the Leaflet camera in sync with the preset buttons / filters:
 * a preset change flies to that region, a filter change frames the pins.
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
      map.flyToBounds(
        [
          [bounds.minLat, bounds.minLng],
          [bounds.maxLat, bounds.maxLng],
        ],
        { padding: [18, 18], duration: 0.45 },
      );
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

type LeafletAlumniMapProps = {
  pins: AlumniMapPin[];
  /** Currently selected preset (controlled by the wrapper). */
  viewKey: MapViewKey;
  /** Preset that decides the very first camera position. */
  initialView: MapViewKey;
  /** Tailwind height utilities for the map canvas. */
  heightClassName: string;
};

export function LeafletAlumniMap({
  pins,
  viewKey,
  initialView,
  heightClassName,
}: LeafletAlumniMapProps) {
  const preset = presetFor(initialView);
  const markers = useMemo(() => pins.map((pin) => ({ pin, icon: pinIcon(pin) })), [pins]);

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
      <ZoomControl position="bottomleft" />
      <MapCamera viewKey={viewKey} pins={pins} />

      {markers.map(({ pin, icon }) => (
        <Marker
          key={pin.id}
          position={[pin.lat, pin.lng]}
          icon={icon}
          title={pin.name}
          alt={`${pin.name} — ${pin.city}, ${pin.country}`}
          keyboard
        >
          <Popup maxWidth={260} minWidth={210} autoPan>
            <div className="w-[218px] font-sans">
              <p className="text-sm font-bold leading-snug text-foreground">{pin.name}</p>

              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    STATUS_BADGE[pin.status].badge
                  }`}
                >
                  <span className={`size-1.5 rounded-full ${STATUS_BADGE[pin.status].dot}`} />
                  {pin.status}
                </span>
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
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
