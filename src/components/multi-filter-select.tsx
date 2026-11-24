import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search, X } from "lucide-react";

import { normalizeText } from "@/lib/msu-colleges";

/**
 * Searchable multi-select filter. Users can type to narrow the list and toggle
 * any number of options; the panel stays open while selecting. Values within
 * one filter are combined with OR by the caller, while different filters are
 * combined with AND.
 */
export function MultiFilterSelect({
  options,
  value,
  onChange,
  placeholder,
  allLabel,
}: {
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  allLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(
    null,
  );
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const normalizedValue = useMemo(() => new Set(value.map((item) => normalizeText(item))), [value]);

  const available = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const raw of [...value, ...options]) {
      const key = normalizeText(raw);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      list.push(raw);
    }
    return list;
  }, [options, value]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return term ? available.filter((option) => option.toLowerCase().includes(term)) : available;
  }, [available, query]);

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => searchRef.current?.focus(), 0);
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    // Only close on scrolls outside the panel (the list itself scrolls).
    const onScroll = (event: Event) => {
      if (event.target instanceof Node && panelRef.current?.contains(event.target)) return;
      close();
    };
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  const toggleOption = (option: string) => {
    const key = normalizeText(option);
    const next = normalizedValue.has(key)
      ? value.filter((item) => normalizeText(item) !== key)
      : [...value, option];
    onChange(next);
  };

  const toggleOpen = () => {
    if (open) {
      close();
      return;
    }
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.max(rect.width, 240);
    setPosition({
      top: rect.bottom + 8,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
      width,
    });
    setOpen(true);
  };

  const triggerLabel =
    value.length === 0 ? placeholder : value.length === 1 ? value[0] : `${value.length} selected`;

  const trigger = (
    <button
      ref={triggerRef}
      type="button"
      role="combobox"
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-label={placeholder}
      onClick={toggleOpen}
      className={`flex h-11 w-full items-center justify-between gap-2 rounded-full border border-[#E5DDD3] bg-white/75 px-4 text-sm shadow-sm backdrop-blur-md transition-all hover:border-[#7A1315]/50 focus:border-[#7A1315] ${
        value.length > 0 ? "text-[#3D2E2E]" : "text-[#6B5B5B]"
      }`}
    >
      <span className="min-w-0 flex-1 truncate text-left">{triggerLabel}</span>
      <span className="flex shrink-0 items-center gap-1">
        {value.length > 0 && (
          <span
            role="button"
            tabIndex={0}
            aria-label={`Clear ${placeholder}`}
            onClick={(event) => {
              event.stopPropagation();
              onChange([]);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                event.stopPropagation();
                onChange([]);
              }
            }}
            className="flex size-5 items-center justify-center rounded-full text-[#7A1315] hover:bg-[#7A1315]/10"
          >
            <X className="size-3" />
          </span>
        )}
        <ChevronDown className="size-4 text-[#7A1315]" />
      </span>
    </button>
  );

  return (
    <div className="min-w-0 w-full">
      {trigger}
      {value.length > 1 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {value.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => toggleOption(item)}
              className="inline-flex max-w-full items-center gap-1 rounded-full bg-[#7A1315]/10 px-2 py-0.5 text-[10px] font-medium text-[#7A1315]"
            >
              <span className="truncate">{item}</span>
              <X className="size-2.5 shrink-0" />
            </button>
          ))}
        </div>
      )}
      {open &&
        position &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={panelRef}
            role="listbox"
            aria-label={placeholder}
            aria-multiselectable="true"
            className="fixed z-[9999] overflow-hidden rounded-2xl border border-[#E5DDD3] bg-white/95 shadow-xl backdrop-blur-xl"
            style={{ top: position.top, left: position.left, width: position.width }}
          >
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              <Search className="size-4 shrink-0 text-[#7A1315]" />
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search..."
                aria-label={`Search ${placeholder}`}
                className="w-full bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
            <button
              type="button"
              onClick={() => onChange([])}
              className="flex w-full items-center gap-2 border-b border-border px-4 py-2 text-left text-xs font-semibold text-[#7A1315] hover:bg-[#7A1315]/5"
            >
              {allLabel ?? `All ${placeholder.replace(/^All\s+/i, "").toLowerCase()}`}
            </button>
            <div className="max-h-60 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <p className="px-3 py-3 text-center text-xs text-muted-foreground">
                  No matches found.
                </p>
              ) : (
                filtered.map((option) => {
                  const selected = normalizedValue.has(normalizeText(option));
                  return (
                    <button
                      key={option}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => toggleOption(option)}
                      className={`flex w-full items-center gap-2 px-4 py-2 text-left text-xs transition-colors hover:bg-[#7A1315]/5 ${
                        selected ? "font-semibold text-[#7A1315]" : "text-[#3D2E2E]"
                      }`}
                    >
                      <span
                        className={`flex size-4 shrink-0 items-center justify-center rounded border ${
                          selected ? "border-[#7A1315] bg-[#7A1315] text-white" : "border-[#C9BEB2]"
                        }`}
                      >
                        {selected && <Check className="size-3" />}
                      </span>
                      <span className="min-w-0 break-words">{option}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
