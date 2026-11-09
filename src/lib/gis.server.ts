import type { RowDataPacket } from "mysql2/promise";

import type { AlumniMapPin } from "../data/gis";
import { getSessionUser } from "./auth.server";
import { getPool } from "./db.server";
import { ensureSoftDeleteColumns } from "./soft-delete.server";
import { formatLocationLabel, resolveLocation, resolvePresentAddress } from "./geo";
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
  birth_place: string | null;
  workplace_address: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  address_city: string | null;
  address_province: string | null;
  address_country: string | null;
  address_subdivision: string | null;
  address_street: string | null;
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
export async function listAlumniMapPins(options: {
  includeOptOut?: boolean;
} = {}): Promise<AlumniMapPinsResult> {
  const includeOptOut = options.includeOptOut === true;
  const viewer = await getSessionUser();
  const isAdmin = viewer?.role === "admin";
  // Role-based privacy visibility: an admin viewer (or explicit admin
  // request) sees every pin; everyone else (guest / other alumni) only
  // sees pins whose owner allows workplace mapping. Viewers always see
  // their own pin (is_map_visible = gis_show_workplace).
  const isAdminSurface = includeOptOut || isAdmin;
  try {
    await ensureSoftDeleteColumns();
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
              p.current_company, p.current_region, p.current_city, p.current_country, p.birth_place,
              emp.company_address AS workplace_address,
              p.latitude, p.longitude,
              cur.city AS address_city, cur.province AS address_province,
              cur.country AS address_country, cur.subdivision AS address_subdivision,
              cur.street AS address_street,
              ps.gis_show_workplace, ps.gis_city_only
         FROM alumni_profiles p
         JOIN users u ON u.id = p.user_id AND u.is_active = 1 AND COALESCE(u.is_deleted, 0) = 0
    LEFT JOIN alumni_addresses cur ON cur.user_id = p.user_id AND cur.kind = 'current'
    LEFT JOIN alumni_employment emp ON emp.user_id = p.user_id AND emp.is_current = 1
    LEFT JOIN alumni_privacy_settings ps ON ps.user_id = p.user_id
        WHERE p.verification_status = 'verified' AND COALESCE(p.is_deleted, 0) = 0
     ORDER BY p.last_name ASC, p.first_name ASC`,
    );

    const pins: AlumniMapPin[] = [];

    for (const row of rows) {
      // Public / guest / other-alumni view: hide the pin when the owner
      // turned off "Map my workplace" (gis_show_workplace = 0). Admins and
      // the owner themself always see the pin (role-based visibility).
      const isSelf = viewer !== null && row.user_id === viewer.id;
      if (!isAdminSurface && !isSelf && row.gis_show_workplace === 0) continue;
      // Admins get full details: never hide the company or coarsen
      // coordinates (gis_city_only only constrains non-admin viewers).
      const cityOnly = !isAdminSurface && row.gis_city_only === 1;

      const storedLat = toNumber(row.latitude);
      const storedLng = toNumber(row.longitude);
      const declaredCountry = row.current_country?.trim() || row.address_country?.trim() || "";

      // STRICT present-address geocoding only: Country + Province/State + City
      // (+ Subdivision only for the Philippines). The educational Region
      // (current_region / BARMM) and Home Address never enter the query.
      // Legacy CSV rows store street=city and city=country, so detect that
      // layout before resolving.
      const rawPresentCity = row.address_city?.trim() || row.current_city?.trim() || "";
      const rawPresentProvince = row.address_province?.trim() || "";
      const rawPresentSubdivision = row.address_subdivision?.trim() || "";
      const streetText = row.address_street?.trim() || "";
      let presentCity = rawPresentCity;
      let presentCountry = row.address_country?.trim() || declaredCountry;
      const looksLikeCountry =
        presentCity !== "" &&
        (presentCountry === "" || presentCity.toLowerCase() === presentCountry.toLowerCase());
      if (streetText && looksLikeCountry && streetText.toLowerCase() !== presentCity.toLowerCase()) {
        presentCountry = presentCity;
        presentCity = streetText;
      }
      const present = {
        country: presentCountry,
        city: presentCity,
        province: rawPresentProvince,
        subdivision: rawPresentSubdivision,
      };
      const displayLabel = formatLocationLabel(present);

      // Stored dropdown coordinates are used only when they cannot be a
      // Philippine fallback for an overseas present address.
      const storedIsPhFallback =
        storedLat !== null &&
        storedLng !== null &&
        ((Math.abs(storedLat - 12.8797) < 0.5 && Math.abs(storedLng - 121.774) < 0.5) ||
          (storedLat >= 4 && storedLat <= 22 && storedLng >= 116 && storedLng <= 127.5)) &&
        presentCountry !== "" &&
        presentCountry.trim().toLowerCase() !== "philippines";
      const presentLocation =
        storedLat === null || storedLng === null || storedIsPhFallback
          ? resolvePresentAddress(present)
          : null;

      let lat = storedLat;
      let lng = storedLng;
      let pinCity = present.city || row.current_city?.trim() || "";
      let pinProvince = present.province || "";
      if (presentLocation) {
        lat = presentLocation.lat;
        lng = presentLocation.lng;
        pinCity = present.city || presentLocation.city;
        pinProvince = present.province || presentLocation.region;
      }
      // Runtime safety net for rows the batch has not reached: Workplace
      // Address first, then Birth Place, so every verified record stays
      // plotted and the admin tally matches the total.
      if (lat === null || lng === null) {
        const workplaceText = row.workplace_address?.trim() ?? "";
        const birthText = row.birth_place?.trim() ?? "";
        const fallback =
          workplaceText && !/^not provided$/i.test(workplaceText)
            ? resolveLocation(workplaceText, null)
            : null;
        const birthFallback =
          !fallback && birthText && !/^not provided$/i.test(birthText)
            ? resolveLocation(birthText, null)
            : null;
        const resolved = fallback ?? birthFallback;
        if (resolved) {
          lat = resolved.lat;
          lng = resolved.lng;
          pinCity = pinCity || resolved.city;
          pinProvince = pinProvince || resolved.region;
        }
      }
      if (lat === null || lng === null) continue;

      const pinCountry = present.country || presentLocation?.country || "Philippines";
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
        city: pinCity || displayLabel || pinCountry || "Unknown",
        // Province/State for PH labels; overseas popups hide this and show City, Country.
        region: pinProvince,
        country: pinCountry,
        precision: pinCity ? "city" : "state",
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

/**
 * Admin-only pin list for System Usage: includes opted-out workplace rows so
 * green + yellow tallies match the full verified total. Public callers must
 * keep using `listAlumniMapPins()` which respects opt-outs.
 */
export async function listAdminMapPins(): Promise<AlumniMapPinsResult> {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return { ok: false, message: "The alumni map could not be loaded right now. Please try again later." };
  }
  return listAlumniMapPins({ includeOptOut: true });
}
