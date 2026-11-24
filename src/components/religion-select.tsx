import { SearchableFilterSelect } from "@/components/college-course-select";
import { LocationCombobox } from "@/components/location-combobox";
import { PHILIPPINE_RELIGIONS, toReligionTitleCase } from "@/lib/religions";

const OPTIONS = PHILIPPINE_RELIGIONS.map((name) => ({ label: name as string }));

/**
 * Shared searchable Philippine religions input. Mirrors the Countries
 * combobox UX: type-to-filter, full scrollable list, and custom denominations
 * are accepted and saved in clean Title Case.
 */
export function ReligionCombobox({
  label,
  value,
  onChange,
  required = false,
  placeholder = "e.g. Roman Catholic",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <LocationCombobox
      label={label}
      value={value}
      onChange={(next) => onChange(toReligionTitleCase(next))}
      options={OPTIONS}
      placeholder={placeholder}
      required={required}
      sortOptions={false}
    />
  );
}

/** Glassmorphic searchable filter variant used by Reports & Statistics. */
export function ReligionFilterSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <SearchableFilterSelect
      placeholder="All religions"
      options={[...PHILIPPINE_RELIGIONS]}
      value={value}
      onChange={(next) => onChange(toReligionTitleCase(next))}
    />
  );
}
