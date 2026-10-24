import { useState } from "react";

export type Cluster = {
  region: string;
  short: string;
  count: number;
  x: number;
  y: number;
};

function radius(count: number, max: number) {
  const ratio = Math.sqrt(count / max);
  return 26 + ratio * 42;
}

const TONE_RING: Record<string, string> = {
  brand: "bg-brand/20 text-brand ring-brand",
  highlight: "bg-highlight/40 text-highlight-foreground ring-highlight",
  success: "bg-success/25 text-success ring-success",
  ink: "bg-foreground/15 text-foreground ring-foreground",
};

const TONE_DOT: Record<string, string> = {
  brand: "bg-brand",
  highlight: "bg-highlight",
  success: "bg-success",
  ink: "bg-foreground",
};

export type Tone = "brand" | "highlight" | "success" | "ink";

export function ClusterMap({
  clusters,
  caption,
  tone = "brand",
  unit = "alumni",
  height = "h-[300px]",
  toneOf,
  legend,
}: {
  clusters: Cluster[];
  caption?: string;
  tone?: Tone;
  unit?: string;
  height?: string;
  toneOf?: (c: Cluster) => Tone;
  legend?: { label: string; tone: Tone; hint?: string }[];
}) {
  const [active, setActive] = useState<string | null>(null);
  const max = Math.max(...clusters.map((c) => c.count));

  return (
    <div>
      <div
        className={`relative w-full overflow-hidden rounded-xl border border-border bg-secondary/50 ${height}`}
        style={{
          backgroundImage:
            "linear-gradient(to right, color-mix(in oklab, var(--border) 60%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--border) 60%, transparent) 1px, transparent 1px)",
          backgroundSize: "34px 34px",
        }}
      >
        {clusters.map((c) => {
          const size = radius(c.count, max);
          const isActive = active === c.region;
          const ring = TONE_RING[toneOf ? toneOf(c) : tone];
          return (
            <button
              key={c.region}
              type="button"
              onMouseEnter={() => setActive(c.region)}
              onMouseLeave={() => setActive(null)}
              onClick={() => setActive(isActive ? null : c.region)}
              aria-label={`${c.region}: ${c.count} ${unit}`}
              className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 backdrop-blur-[1px] transition-transform hover:scale-110 ${ring} ${
                isActive ? "z-20 scale-110" : "z-10"
              }`}
              style={{ left: `${c.x}%`, top: `${c.y}%`, width: size, height: size }}
            >
              <span className="flex size-full flex-col items-center justify-center leading-none">
                <span className="text-[13px] font-bold">{c.count}</span>
                <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide opacity-80">
                  {c.short}
                </span>
              </span>
            </button>
          );
        })}

        {active && (
          <div className="absolute bottom-3 left-3 z-30 rounded-lg border border-border bg-card px-3 py-2 shadow-sm">
            <p className="text-xs font-bold text-foreground">{active}</p>
            <p className="text-[11px] text-muted-foreground">
              {clusters.find((c) => c.region === active)?.count} {unit} · aggregate count only
            </p>
          </div>
        )}

        <span className="absolute right-3 top-3 rounded-full border border-border bg-card px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Cluster view
        </span>
      </div>
      {caption && <p className="mt-2 text-[11px] text-muted-foreground">{caption}</p>}

      {legend && (
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 rounded-lg border border-border bg-card px-4 py-3">
          {legend.map((l) => (
            <li key={l.label} className="flex items-center gap-2">
              <span className={`size-3 rounded-full ${TONE_DOT[l.tone]}`} />
              <span className="text-xs font-semibold text-foreground">{l.label}</span>
              {l.hint && <span className="text-[11px] text-muted-foreground">{l.hint}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function PinMap({
  pins,
  height = "h-[300px]",
}: {
  pins: { name: string; role: string; place: string; x: number; y: number }[];
  height?: string;
}) {
  const [active, setActive] = useState<string | null>(null);

  return (
    <div
      className={`relative w-full overflow-hidden rounded-xl border border-border bg-secondary/50 ${height}`}
      style={{
        backgroundImage:
          "linear-gradient(to right, color-mix(in oklab, var(--border) 60%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--border) 60%, transparent) 1px, transparent 1px)",
        backgroundSize: "34px 34px",
      }}
    >
      {pins.map((p) => (
        <button
          key={p.name}
          type="button"
          onClick={() => setActive(active === p.name ? null : p.name)}
          aria-label={`${p.name}, ${p.place}`}
          className="absolute z-10 -translate-x-1/2 -translate-y-full transition-transform hover:scale-110"
          style={{ left: `${p.x}%`, top: `${p.y}%` }}
        >
          <span className="flex size-7 items-center justify-center rounded-full rounded-bl-none bg-brand text-[10px] font-bold text-brand-foreground shadow">
            {p.name.slice(0, 1)}
          </span>
        </button>
      ))}

      {active && (
        <div className="absolute bottom-3 left-3 z-30 rounded-lg border-l-4 border-brand bg-card px-3 py-2 shadow-sm">
          <p className="text-xs font-bold text-foreground">{active}</p>
          <p className="text-[11px] text-muted-foreground">
            {pins.find((p) => p.name === active)?.role} ·{" "}
            {pins.find((p) => p.name === active)?.place}
          </p>
        </div>
      )}

      <span className="absolute right-3 top-3 rounded-full border border-border bg-card px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Opt-in workplaces
      </span>
    </div>
  );
}

export function BarList({
  items,
  suffix = "%",
  tone = "brand",
}: {
  items: { label: string; value: number }[];
  suffix?: string;
  tone?: "brand" | "success" | "highlight";
}) {
  const max = Math.max(...items.map((i) => i.value));
  const bar =
    tone === "success" ? "bg-success" : tone === "highlight" ? "bg-highlight" : "bg-brand";

  return (
    <ul className="space-y-3">
      {items.map((i) => (
        <li key={i.label}>
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="text-foreground">{i.label}</span>
            <span className="shrink-0 font-semibold text-muted-foreground">
              {i.value}
              {suffix}
            </span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full ${bar}`}
              style={{ width: `${(i.value / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

const SERIES_COLORS = ["var(--brand)", "var(--success)", "var(--highlight)", "var(--foreground)"];

export function DonutChart({
  items,
  size = 180,
}: {
  items: { label: string; value: number }[];
  size?: number;
}) {
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  const stroke = 26;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="shrink-0 -rotate-90"
        role="img"
        aria-label="Donut chart"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={stroke}
        />
        {items.map((i, idx) => {
          const len = (i.value / total) * c;
          const seg = (
            <circle
              key={i.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={SERIES_COLORS[idx % SERIES_COLORS.length]}
              strokeWidth={stroke}
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
            />
          );
          offset += len;
          return seg;
        })}
      </svg>
      <ul className="min-w-[140px] space-y-2">
        {items.map((i, idx) => (
          <li key={i.label} className="flex items-center gap-2 text-xs">
            <span
              className="size-3 shrink-0 rounded-full"
              style={{ background: SERIES_COLORS[idx % SERIES_COLORS.length] }}
            />
            <span className="text-foreground">{i.label}</span>
            <span className="font-semibold text-muted-foreground">
              {i.value} · {Math.round((i.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ColumnChart({
  items,
  tone = "brand",
}: {
  items: { label: string; value: number }[];
  tone?: "brand" | "success" | "highlight";
}) {
  const max = Math.max(...items.map((i) => i.value));
  const bar =
    tone === "success" ? "bg-success" : tone === "highlight" ? "bg-highlight" : "bg-brand";

  return (
    <div className="flex items-end gap-3">
      {items.map((i) => (
        <div key={i.label} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
          <span className="text-[11px] font-bold text-foreground">{i.value}</span>
          <div
            className={`w-full max-w-[56px] rounded-t-md ${bar}`}
            style={{ height: `${Math.max(8, (i.value / max) * 140)}px` }}
          />
          <span className="w-full text-center text-[10px] leading-tight text-muted-foreground">
            {i.label}
          </span>
        </div>
      ))}
    </div>
  );
}
