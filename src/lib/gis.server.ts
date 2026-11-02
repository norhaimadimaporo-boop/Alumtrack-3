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
};

export type AlumniMapPinsResult =
  | { ok: true; pins: AlumniMapPin[] }
  | { ok: false; message: string };

function abbreviate(firstName: string, middleName: string | null, lastName: string): string {
  const first = firstName.trim();
  const middle = middleName?.trim();
  const middleInitial = middle ? `${middle.charAt(0).toUpperCase()}.` : "";
  const trimmedLast = lastName.trim();
  const lastInitial = trimmedLast ? `${trimmedLast.charAt(0).toUpperCase()}.` : "";
  return [first, middleInitial, lastInitial].filter(Boolean).join(" ");
}

function toNumber(value: number | string | null): number | null {
  if (value === null) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
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
              p.course, p.batch_year, p.employment_status, p.current_position,
              p.current_company, p.current_region, p.current_city, p.current_country,
              p.latitude, p.longitude,
              cur.city AS address_city, cur.province AS address_province
         FROM alumni_profiles p
         JOIN users u ON u.id = p.user_id AND u.is_active = 1
    LEFT JOIN alumni_addresses cur ON cur.user_id = p.user_id AND cur.kind = 'current'
        WHERE p.verification_status = 'verified'
     ORDER BY p.last_name ASC, p.first_name ASC`,
    );

    const pins: AlumniMapPin[] = [];

    for (const row of rows) {
      const location = resolveLocation(
        row.current_city?.trim() || row.address_city,
        row.address_province || row.current_region,
      );
      if (!location) continue;

      const lat = toNumber(row.latitude) ?? location.lat;
      const lng = toNumber(row.longitude) ?? location.lng;
      const employed = row.employment_status === "employed";
      const position = row.current_position?.trim();

      pins.push({
        id: `pin-${row.user_id}`,
        name: abbreviate(row.first_name, row.middle_name, row.last_name),
        role: employed ? position || "Employed" : "Seeking employment",
        status: employed ? "Employed" : "Unemployed",
        company: employed ? row.current_company?.trim() || null : null,
        city: location.city,
        region: location.region,
        country: location.country,
        precision: location.precision,
        lat,
        lng,
        course: row.course?.trim() || "Course not provided",
        batch: row.batch_year ? String(row.batch_year) : "—",
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
