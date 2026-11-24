import { sameCollege, sameCourse } from "./msu-colleges";
import { sameReligion } from "./religions";
import { normalizeText } from "./msu-colleges";

/** Exact, case-insensitive match used for batches/countries/genders/statuses. */
export function matchesAny(value: string, selected: string[]): boolean {
  if (selected.length === 0) return true;
  const key = normalizeText(value);
  return selected.some((item) => normalizeText(item) === key);
}

export function matchesAnyCollege(value: string, selected: string[]): boolean {
  if (selected.length === 0) return true;
  return selected.some((item) => sameCollege(value, item));
}

export function matchesAnyCourse(value: string, selected: string[]): boolean {
  if (selected.length === 0) return true;
  return selected.some((item) => sameCourse(value, item));
}

export function matchesAnyReligion(value: string, selected: string[]): boolean {
  if (selected.length === 0) return true;
  return selected.some((item) => sameReligion(value, item));
}
