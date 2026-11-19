import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";

import {
  COLLEGE_OPTIONS,
  COURSE_OPTIONS,
  collegeForCourse,
  coursesForCollege,
  normalizeText,
  resolveCollege,
} from "@/lib/msu-colleges";

type SelectOption = { value: string; label: string; searchText: string };

function SearchableSelect({
  options,
  value,
  onChange,
  label,
  placeholder,
  allowEmpty = false,
  emptyLabel,
  disabled = false,
  hideLabel = false,
  compact = false,
  controlClassName,
}: {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
  disabled?: boolean;
  hideLabel?: boolean;
  compact?: boolean;
  controlClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(
    null,
  );
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const allOptions = useMemo(() => {
    const list = [...options];
    if (value && !list.some((option) => normalizeText(option.value) === normalizeText(value))) {
      list.unshift({ value, label: value, searchText: value });
    }
    if (allowEmpty && !list.some((option) => option.value === "")) {
      list.unshift({ value: "", label: emptyLabel ?? "All", searchText: emptyLabel ?? "all" });
    }
    return list;
  }, [options, value, allowEmpty, emptyLabel]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return allOptions;
    return allOptions.filter((option) => option.searchText.toLowerCase().includes(term));
  }, [allOptions, query]);

  const selectedLabel = allOptions.find(
    (option) => normalizeText(option.value) === normalizeText(value),
  )?.label;

  const close = () => {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  };

  const toggle = () => {
    if (disabled) return;
    if (open) {
      close();
      return;
    }
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    // Always open directly below the trigger - never flip above the input.
    const width = Math.max(rect.width, 220);
    const top = rect.bottom + 8;
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
    setPosition({ top, left, width });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => searchRef.current?.focus(), 0);
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
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

  const choose = (option: SelectOption) => {
    onChange(option.value);
    close();
  };

  return (
    <label className="block min-w-0">
      {!hideLabel && (
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      )}
      <button
        ref={buttonRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        disabled={disabled}
        onClick={toggle}
        className={
          compact
            ? (controlClassName ??
              "flex h-11 w-full items-center justify-between gap-2 rounded-full border border-[#E5DDD3] bg-white/75 px-4 text-sm text-[#3D2E2E] shadow-sm backdrop-blur-md transition-all hover:border-[#7A1315]/50 focus:border-[#7A1315] disabled:opacity-60")
            : "mt-1 flex w-full items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2 text-left text-sm text-foreground outline-none transition-colors hover:border-brand focus:border-brand disabled:opacity-60"
        }
      >
        <span
          className={`min-w-0 flex-1 truncate text-left ${selectedLabel ? "" : "text-[#6B5B5B]"}`}
        >
          {selectedLabel || placeholder}
        </span>
        <ChevronDown className="size-4 shrink-0 text-[#7A1315]" />
      </button>

      {open &&
        position &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={panelRef}
            role="listbox"
            aria-label={label}
            className="fixed z-[9999] overflow-hidden rounded-2xl border border-[#E5DDD3] bg-white/90 shadow-xl backdrop-blur-xl"
            style={{ top: position.top, left: position.left, width: position.width }}
          >
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              <Search className="size-4 shrink-0 text-[#7A1315]" />
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    setActiveIndex((index) => Math.min(index + 1, filtered.length - 1));
                  } else if (event.key === "ArrowUp") {
                    event.preventDefault();
                    setActiveIndex((index) => Math.max(index - 1, 0));
                  } else if (event.key === "Enter" && filtered[activeIndex]) {
                    event.preventDefault();
                    choose(filtered[activeIndex]);
                  }
                }}
                placeholder="Search..."
                aria-label={`Search ${label}`}
                className="w-full bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
            <div className="max-h-60 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <p className="px-3 py-3 text-center text-xs text-muted-foreground">
                  No matches found.
                </p>
              ) : (
                filtered.map((option, index) => {
                  const isSelected =
                    normalizeText(option.value) === normalizeText(value) && option.value !== "";
                  return (
                    <button
                      key={`${option.value || "all"}-${index}`}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => choose(option)}
                      className={`flex w-full items-center gap-2 px-4 py-2 text-left text-xs text-[#3D2E2E] transition-colors hover:bg-[#7A1315]/5 ${
                        index === activeIndex ? "bg-[#7A1315]/5" : ""
                      } ${isSelected ? "font-semibold text-[#7A1315]" : ""}`}
                    >
                      {isSelected && <Check className="size-3.5 shrink-0 text-[#7A1315]" />}
                      <span className="min-w-0 break-words">{option.label}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body,
        )}
    </label>
  );
}

/** Searchable filter control matching the uniform filter-grid styling. */
export function SearchableFilterSelect({
  options,
  value,
  onChange,
  placeholder,
}: {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <SearchableSelect
      label={placeholder}
      options={options.map((option) => ({ value: option, label: option, searchText: option }))}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      allowEmpty
      emptyLabel={placeholder}
      hideLabel
      compact
    />
  );
}

export type CollegeCourseValues = { college: string; course: string };

/** Paired, bidirectional cascading college + course selector. */
export function CollegeCourseSelect({
  college,
  course,
  onChange,
  collegeLabel = "Name of College",
  courseLabel = "Degree / Course",
  allowEmpty = false,
  filterStyle = false,
  collegePlaceholder,
  coursePlaceholder,
  controlClassName,
  stacked = false,
  className = "",
}: {
  college: string;
  course: string;
  onChange: (values: CollegeCourseValues) => void;
  collegeLabel?: string;
  courseLabel?: string;
  allowEmpty?: boolean;
  filterStyle?: boolean;
  collegePlaceholder?: string;
  coursePlaceholder?: string;
  controlClassName?: string;
  stacked?: boolean;
  className?: string;
}) {
  const collegeOptions = useMemo<SelectOption[]>(
    () =>
      COLLEGE_OPTIONS.map((name) => ({
        value: name,
        label: name,
        searchText: `${name} ${resolveCollege(name)?.code ?? ""} ${
          resolveCollege(name)?.courses.join(" ") ?? ""
        }`,
      })),
    [],
  );

  const courseOptions = useMemo<SelectOption[]>(() => {
    const base = college ? coursesForCollege(college) : COURSE_OPTIONS;
    return base.map((name) => ({
      value: name,
      label: name,
      searchText: `${name} ${normalizeText(name)} ${collegeForCourse(name) ?? ""}`,
    }));
  }, [college]);

  const handleCollege = (nextCollege: string) => {
    const courses = nextCollege ? coursesForCollege(nextCollege) : COURSE_OPTIONS;
    const courseStillValid = courses.some((item) => normalizeText(item) === normalizeText(course));
    onChange({
      college: nextCollege,
      course: courseStillValid ? course : allowEmpty ? "" : (courses[0] ?? ""),
    });
  };

  const handleCourse = (nextCourse: string) => {
    if (!nextCourse) {
      onChange({ college, course: "" });
      return;
    }
    onChange({ college: collegeForCourse(nextCourse) ?? college, course: nextCourse });
  };

  return (
    <div
      className={
        stacked
          ? "grid min-w-0 grid-cols-1 gap-3"
          : `grid min-w-0 gap-3 sm:grid-cols-2 ${className}`
      }
    >
      <SearchableSelect
        label={collegeLabel}
        options={collegeOptions}
        value={college}
        onChange={handleCollege}
        placeholder={allowEmpty ? "All colleges" : (collegePlaceholder ?? "Search college…")}
        allowEmpty={allowEmpty}
        emptyLabel="All colleges"
        hideLabel={filterStyle}
        compact={filterStyle}
        {...(controlClassName ? { controlClassName } : {})}
      />
      <SearchableSelect
        label={courseLabel}
        options={courseOptions}
        value={course}
        onChange={handleCourse}
        placeholder={allowEmpty ? "All courses" : (coursePlaceholder ?? "Search degree / course…")}
        allowEmpty={allowEmpty}
        emptyLabel="All courses"
        hideLabel={filterStyle}
        compact={filterStyle}
        {...(controlClassName ? { controlClassName } : {})}
      />
    </div>
  );
}
