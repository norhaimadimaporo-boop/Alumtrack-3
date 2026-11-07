import { useId, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";

import { normalizeForSearch } from "@/lib/geo-data";

export type ComboOption = { label: string; lat?: number; lng?: number };

/**
 * Text box with a filtered suggestion list. Picking a suggestion sets the value
 * and its coordinates; typing any other text is accepted as a manual entry.
 */
export function LocationCombobox({
  label,
  value,
  onChange,
  options,
  placeholder,
  required = false,
  hint,
  sortOptions = true,
}: {
  label: string;
  value: string;
  onChange: (value: string, option?: ComboOption) => void;
  options: ComboOption[];
  placeholder?: string;
  required?: boolean;
  hint?: string;
  /** Set false to keep caller order (e.g. Month Jan-Dec, Year descending). */
  sortOptions?: boolean;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  /** Null until the user types, so the full list shows when the box is focused. */
  const [search, setSearch] = useState<string | null>(null);

  const visible = useMemo(() => {
    const query = search === null ? "" : normalizeForSearch(search);
    const matches = query
      ? options.filter((option) => normalizeForSearch(option.label).includes(query))
      : options;
    // Full A-Z list — no item cap. The dropdown scrolls (max-h-56) so every
    // country / province / city / barangay stays reachable. Callers that need
    // chronological or descending order pass sortOptions={false}.
    return sortOptions ? [...matches].sort((a, b) => a.label.localeCompare(b.label)) : matches;
  }, [options, search, sortOptions]);

  const typing = search !== null && search.trim() !== "";

  return (
    <div className="relative">
      <label
        htmlFor={id}
        className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {label}
        {required && <span className="text-destructive"> *</span>}
      </label>
      <div className="relative mt-1">
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          autoComplete="off"
          value={value}
          placeholder={placeholder}
          required={required}
          onFocus={() => {
            setSearch(null);
            setOpen(true);
          }}
          onChange={(event) => {
            setSearch(event.target.value);
            setOpen(true);
            onChange(event.target.value);
          }}
          onBlur={() => {
            setOpen(false);
            setSearch(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
          }}
          className="w-full rounded-md border border-border bg-background py-2 pl-3 pr-8 text-sm text-foreground outline-none focus:border-brand"
        />
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      </div>

      {open && (visible.length > 0 || typing) && (
        <ul
          role="listbox"
          className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-border bg-card py-1 shadow-lg"
        >
          {visible.map((option) => (
            <li key={option.label}>
              <button
                type="button"
                role="option"
                aria-selected={option.label === value}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(option.label, option);
                  setSearch(null);
                  setOpen(false);
                }}
                className={`block w-full px-3 py-2 text-left text-sm hover:bg-muted ${
                  option.label === value ? "font-semibold text-brand" : "text-foreground"
                }`}
              >
                {option.label}
              </button>
            </li>
          ))}
          {typing && visible.length === 0 && (
            <li className="px-3 py-2 text-xs text-muted-foreground">
              No match. “{search}” will be saved as typed.
            </li>
          )}
        </ul>
      )}

      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
