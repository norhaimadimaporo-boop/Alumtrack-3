/**
 * Philippine Barangay lookup via the PSGC dataset (`@aivangogh/ph-address`).
 *
 * The Address form only has a City / Municipality name (free text or picked
 * from the `public/geo/` lists, e.g. "Marawi City" / "Taguig"). This module
 * maps that to a PSGC municipality and returns its barangays sorted A–Z so
 * the Subdivision / Barangay field can cascade from the city.
 */

import {
  getAllMunicipalities,
  getBarangaysByMunicipality,
  getProvinceByCode,
} from "@aivangogh/ph-address";

import { normalizeForSearch } from "./geo-data";

/** "City of Marawi" / "Marawi City" → "marawi"; "Taguig City" → "taguig". */
function stripCitySuffix(normalized: string): string {
  return normalized
    .replace(/^city of\s+/, "")
    .replace(/^city\s+/, "")
    .replace(/\s+city$/, "")
    .replace(/\s+municipality$/, "")
    .trim();
}

function normalizeCity(name: string): string {
  return stripCitySuffix(normalizeForSearch(name));
}

/** True when the selected country is the Philippines (any casing). */
export function isPhilippinesCountry(country: string): boolean {
  return normalizeForSearch(country) === "philippines";
}

/**
 * Barangay names (A–Z) for the given city, optionally disambiguated by
 * province. Returns an empty array when the city is unknown or ambiguous
 * (e.g. seven municipalities named "San Miguel" and no province to pick the
 * right one) — callers should then keep the field as free text.
 */
export function getBarangayNames(cityName: string, provinceName?: string): string[] {
  const city = (cityName ?? "").trim();
  if (!city) return [];

  const municipalities = getAllMunicipalities();
  const exact = municipalities.filter(
    (m) => normalizeForSearch(m.name) === normalizeForSearch(city),
  );
  let candidates =
    exact.length > 0
      ? exact
      : municipalities.filter((m) => normalizeCity(m.name) === normalizeCity(city));

  if (candidates.length === 0) return [];

  if (candidates.length > 1 && provinceName?.trim()) {
    const provinceTarget = normalizeForSearch(provinceName);
    const provinceMatched = candidates.filter((m) => {
      const province = getProvinceByCode(m.provinceCode);
      if (!province) return false; // NCR / HUC entries have no province record
      return normalizeForSearch(province.name) === provinceTarget;
    });
    if (provinceMatched.length > 0) candidates = provinceMatched;
  }

  // Ambiguous city with no province to disambiguate — don't show wrong data.
  if (candidates.length !== 1) return [];

  return getBarangaysByMunicipality(candidates[0].psgcCode)
    .map((b) => b.name)
    .sort((a, b) => a.localeCompare(b));
}
