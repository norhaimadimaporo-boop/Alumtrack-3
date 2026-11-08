import type { RowDataPacket } from "mysql2/promise";

import type { AlumniMapPin } from "../data/gis";
import { getPool } from "./db.server";
import { resolveLocation } from "./geo";
import type { ProfileEmploymentStatus } from "./admin.types";

type MapRow = RowDataPacket & {
  id: number;
  user_id: number;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  course: string | null;
  batch_year: number | null;
  /** Batch priority: Baccalaureate year, then Graduate, then Post Graduate. */
  bac_grad_year: number | string | null;
  grad_grad_year: number | string | null;
  postgrad_grad_year: number | string | null;
  employment_status: ProfileEmploymentStatus;
  current_position: string | null;
  current_company: string | null;
  current_region: string | null;
  current_city: string | null;
  current_country: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  address_city: string | null;
  address_province: string | null;
  gis_show_workplace: number | null;
  gis_city_only: number | null;
};

export type AlumniMapPinsResult =
  { ok: true; pins: AlumniMapPin[] } | { ok: false; message: string };

function abbreviate(firstName: string, middleName: string | null, lastName: string): string {
  const first = firstName.trim();
  const middle = middleName?.trim();
  const middleInitial = middle ? `${middle.charAt(0).toUpperCase()}.` : "";
  const trimmedLast = lastName.trim();
  const lastInitial = trimmedLast ? `${trimmedLast.charAt(0).toUpperCase()}.` : "";
  return [first, middleInitial, lastInitial].filter(Boolean).join(" ");
}

/** About 11 km at one decimal place: enough to show a city, not a workplace. */
function coarsen(value: number): number {
  return Math.round(value * 10) / 10;
}

function toNumber(value: number | string | null): number | null {
  if (value === null) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toBatchYear(value: number | string | null): string {
  if (value === null || value === undefined) return "—";
  const year = Number(value);
  return Number.isFinite(year) && year > 0 ? String(Math.floor(year)) : "—";
}

/**
 * Verified, active alumni plotted on the GIS map. The query reads the synced
 * profile columns (course, batch, current job, region, city, country, and
 * coordinates) so an edit made in the alumni workspace appears on the map
 * immediately. Existing records without stored coordinates fall back to the
 * offline gazetteer using their current address.
 */
export async function listAlumniMapPins(): Promise<AlumniMapPinsResult> {
  try {
    const [rows] = await getPool().query<MapRow[]>(
      `SELECT p.id, p.user_id, p.first_name, p.middle_name, p.last_name,
              p.course, p.batch_year,
              (SELECT YEAR(graduated_on) FROM alumni_education
                WHERE user_id = p.user_id AND level = 'Baccalaureate Degree'
                  AND graduated_on IS NOT NULL
                ORDER BY graduated_on DESC LIMIT 1) AS bac_grad_year,
              (SELECT YEAR(graduated_on) FROM alumni_education
                WHERE user_id = p.user_id AND level = 'Graduate Degree'
                  AND graduated_on IS NOT NULL
                ORDER BY graduated_on DESC LIMIT 1) AS grad_grad_year,
              (SELECT YEAR(graduated_on) FROM alumni_education
                WHERE user_id = p.user_id AND level = 'Post Graduate Degree'
                  AND graduated_on IS NOT NULL
                ORDER BY graduated_on DESC LIMIT 1) AS postgrad_grad_year,
              p.employment_status, p.current_position,
              p.current_company, p.current_region, p.current_city, p.current_country,
              p.latitude, p.longitude,
              cur.city AS address_city, cur.province AS address_province,
              ps.gis_show_workplace, ps.gis_city_only
         FROM alumni_profiles p
         JOIN users u ON u.id = p.user_id AND u.is_active = 1
    LEFT JOIN alumni_addresses cur ON cur.user_id = p.user_id AND cur.kind = 'current'
    LEFT JOIN alumni_privacy_settings ps ON ps.user_id = p.user_id
        WHERE p.verification_status = 'verified'
     ORDER BY p.last_name ASC, p.first_name ASC`,
    );

    const pins: AlumniMapPin[] = [];

    for (const row of rows) {
      // Owners who switch off the GIS workplace pin are left off the map entirely.
      if (row.gis_show_workplace === 0) continue;
      const cityOnly = row.gis_city_only === 1;

      const storedLat = toNumber(row.latitude);
      const storedLng = toNumber(row.longitude);
      const hasStored = storedLat !== null && storedLng !== null;
      const declaredCountry = row.current_country?.trim() ?? "";

      // Include the country so an overseas city without its country in the
      // address ("Shanghai") still resolves to the right coordinates. Stored
      // coordinates (from the Country → Province → City dropdowns) take priority.
      const location = hasStored
        ? null
        : resolveLocation(
            row.current_city?.trim() || row.address_city || declaredCountry,
            [declaredCountry, row.address_province || row.current_region].filter(Boolean).join(", ") ||
              null,
          );

      // A Philippine centroid is only a guess. Skip it when the profile is
      // clearly overseas or when no coordinates were ever stored.
      const guessedPhilippines = location !== null && !location.matched;
      const philippineCountry = !declaredCountry || /^philippines?$/i.test(declaredCountry);
      if (guessedPhilippines && !philippineCountry) continue;

      let lat = storedLat;
      let lng = storedLng;
      if (lat === null || lng === null) {
        if (!location) continue;
        lat = location.lat;
        lng = location.lng;
      }

      const employed = row.employment_status === "employed";
      const position = row.current_position?.trim();
      // Batch priority: Baccalaureate → Graduate → Post Graduate → stored
      // `batch_year` (only when no education year exists).
      const batch =
        toBatchYear(row.bac_grad_year) !== "—"
          ? toBatchYear(row.bac_grad_year)
          : toBatchYear(row.grad_grad_year) !== "—"
            ? toBatchYear(row.grad_grad_year)
            : toBatchYear(row.postgrad_grad_year) !== "—"
              ? toBatchYear(row.postgrad_grad_year)
              : toBatchYear(row.batch_year);

      pins.push({
        id: `pin-${row.user_id}`,
        name: abbreviate(row.first_name, row.middle_name, row.last_name),
        role: employed ? position || "Employed" : "Seeking employment",
        status: employed ? "Employed" : "Unemployed",
        company: employed && !cityOnly ? row.current_company?.trim() || null : null,
        city:
          row.current_city?.trim() ||
          location?.city?.trim() ||
          row.address_city?.trim() ||
          declaredCountry ||
          "Unknown",
        region:
          row.current_region?.trim() ||
          location?.region?.trim() ||
          row.address_province?.trim() ||
          "",
        country: declaredCountry || location?.country?.trim() || "Philippines",
        precision: row.current_city?.trim()
          ? "city"
          : (location?.precision ?? (row.address_city?.trim() ? "city" : "state")),
        lat: cityOnly ? coarsen(lat) : lat,
        lng: cityOnly ? coarsen(lng) : lng,
        course: row.course?.trim() || "Course not provided",
        batch,
      });
    }

    return { ok: true, pins };
  } catch (error) {
    console.error("[gis] Alumni map pin query failed:", error);
    return {
      ok: false,
      message: "The alumni map could not be loaded right now. Please try again later.",
    };
  }
}
