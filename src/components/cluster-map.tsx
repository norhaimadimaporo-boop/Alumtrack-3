export function BarList({
  items,
  suffix = "%",
  tone = "brand",
  rowClassName = "",
}: {
  items: { label: string; value: number }[];
  suffix?: string;
  tone?: "brand" | "success" | "highlight";
  rowClassName?: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  const bar =
    tone === "success" ? "bg-success" : tone === "highlight" ? "bg-highlight" : "bg-brand";

  return (
    <ul className="w-full max-w-full min-w-0 space-y-3">
      {items.map((i) => (
        <li key={i.label} className={`w-full max-w-full min-w-0 ${rowClassName}`}>
          <div className="flex min-w-0 flex-col gap-1 text-xs sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <span className="min-w-0 break-words text-foreground">{i.label}</span>
            <span className="shrink-0 font-semibold text-muted-foreground">
              {i.value}
              {suffix}
            </span>
          </div>
          <div className="mt-1.5 h-2 w-full max-w-full overflow-hidden rounded-full bg-muted">
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
    <div className="flex w-full max-w-full min-w-0 flex-col items-center gap-4 sm:flex-row sm:gap-6">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="h-auto w-full max-w-[180px] shrink-0 -rotate-90"
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
      <ul className="w-full min-w-0 space-y-2 sm:flex-1">
        {items.map((i, idx) => (
          <li key={i.label} className="flex min-w-0 flex-wrap items-center gap-2 text-xs">
            <span
              className="size-3 shrink-0 rounded-full"
              style={{ background: SERIES_COLORS[idx % SERIES_COLORS.length] }}
            />
            <span className="min-w-0 flex-1 break-words text-foreground">{i.label}</span>
            <span className="shrink-0 font-semibold text-muted-foreground">
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
  const max = Math.max(1, ...items.map((i) => i.value));
  const bar =
    tone === "success" ? "bg-success" : tone === "highlight" ? "bg-highlight" : "bg-brand";

  return (
    <div className="flex w-full min-w-0 max-w-full items-end gap-3">
      {items.map((i) => (
        <div key={i.label} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
          <span className="text-[11px] font-bold text-foreground">{i.value}</span>
          <div
            className={`w-full max-w-[56px] rounded-t-md ${bar}`}
            style={{ height: `${Math.max(8, (i.value / max) * 140)}px` }}
          />
          <span className="w-full break-words text-center text-[10px] leading-tight text-muted-foreground">
            {i.label}
          </span>
        </div>
      ))}
    </div>
  );
}
