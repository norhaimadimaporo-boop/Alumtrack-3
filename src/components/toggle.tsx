import { useState } from "react";

/**
 * Switch row. Pass `on` + `onChange` to control it from outside, or `defaultOn`
 * to let it manage its own state (used by the profile preview toggles).
 */
export function Toggle({
  label,
  hint,
  defaultOn = false,
  on,
  onChange,
  disabled = false,
}: {
  label: string;
  hint?: string | undefined;
  defaultOn?: boolean;
  on?: boolean;
  onChange?: (next: boolean) => void;
  disabled?: boolean;
}) {
  const [internal, setInternal] = useState(defaultOn);
  const isOn = on ?? internal;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isOn}
      disabled={disabled}
      onClick={() => {
        const next = !isOn;
        if (on === undefined) setInternal(next);
        onChange?.(next);
      }}
      className="flex w-full items-center justify-between gap-4 py-3 text-left disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span className="min-w-0">
        <span className="block text-sm text-foreground">{label}</span>
        {hint && <span className="mt-0.5 block text-[11px] text-muted-foreground">{hint}</span>}
      </span>
      <span
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          isOn ? "bg-success" : "bg-muted"
        }`}
      >
        <span
          className={`inline-block size-5 rounded-full bg-background shadow transition-transform ${
            isOn ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
}
