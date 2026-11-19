import type { RowDataPacket } from "mysql2/promise";

import { getPool } from "./db.server";
import { ensureSoftDeleteColumns } from "./soft-delete.server";
import { listAlumniMapPins } from "./gis.server";
import { fullName } from "./profile-format";
import type { ReportRecord, ReportRecordsResult } from "./reports.types";
import type { ProfileEmploymentStatus } from "./admin.types";

type ReportRow = RowDataPacket & {
  id: number;
  user_id: number;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  course: string | null;
  college: string | null;
  batch_year: number | null;
  /** Batch priority: Baccalaureate year, then Graduate, then Post Graduate. */
  bac_grad_year: number | string | null;
  grad_grad_year: number | string | null;
  postgrad_grad_year: number | string | null;
  gender: string | null;
  ethnicity: string | null;
  religion: string | null;
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
  org_names: string | null;
  gis_show_workplace: number | null;
  gis_city_only: number | null;
};

function toYear(value: number | string | null): number | null {
  if (value === null || value === undefined) return null;
  const year = Number(value);
  return Number.isFinite(year) && year > 0 ? Math.floor(year) : null;
}

const RELIGIOUS_KEYWORDS = [
  "islam",
  "muslim",
  "church",
  "chapel",
  "ministry",
  "faith",
  "religious",
  "christian",
  "catholic",
  "inc",
  "jehovah",
  "mosque",
  "quran",
  "madrasa",
];

function affiliationFromOrgs(orgNames: string | null): ReportRecord["affiliation"] {
  const names = (orgNames ?? "")
    .split("|")
    .map((n) => n.trim())
    .filter(Boolean);
  if (names.length === 0) return "No affiliation";
  const hitsReligion = names.some((name) =>
    RELIGIOUS_KEYWORDS.some((keyword) => name.toLowerCase().includes(keyword)),
  );
  return hitsReligion ? "Non-secular" : "Secular";
}

/**
 * Verified, active alumni rows for Reports & Graduate Statistics. Batch
 * year follows the priority Baccalaureate → Graduate → Post Graduate
 * graduation year in `alumni_education` (stored `batch_year` only as a
 * last resort), so no card shows "Batch -" when an education year exists.
 * Pins mirror the GIS map logic (strict present-address geocoding) but
 * Reports is an admin surface: every verified record stays plotted with
 * full details even when the owner opted out of public map visibility.
 */
export async function listReportRecords(): Promise<ReportRecordsResult> {
  try {
    await ensureSoftDeleteColumns();
    const [rows] = await getPool().query<ReportRow[]>(
      `SELECT p.id, p.user_id, p.first_name, p.middle_name, p.last_name,
              p.course, p.college, p.batch_year,
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
              p.gender, p.ethnicity, p.religion, p.employment_status,
              p.current_position, p.current_company, p.current_region,
              p.current_city, p.current_country, p.birth_place, emp.company_address AS workplace_address,
              p.latitude, p.longitude,
              cur.city AS address_city, cur.province AS address_province,
              cur.country AS address_country, cur.subdivision AS address_subdivision,
              cur.street AS address_street,
              (SELECT GROUP_CONCAT(name SEPARATOR '|') FROM alumni_organizations
                WHERE user_id = p.user_id) AS org_names,
              ps.gis_show_workplace, ps.gis_city_only
         FROM alumni_profiles p
         JOIN users u ON u.id = p.user_id AND u.is_active = 1 AND COALESCE(u.is_deleted, 0) = 0
    LEFT JOIN alumni_addresses cur ON cur.user_id = p.user_id AND cur.kind = 'current'
    LEFT JOIN alumni_employment emp ON emp.user_id = p.user_id AND emp.is_current = 1
    LEFT JOIN alumni_privacy_settings ps ON ps.user_id = p.user_id
        WHERE p.verification_status = 'verified' AND COALESCE(p.is_deleted, 0) = 0
     ORDER BY p.last_name ASC, p.first_name ASC`,
    );

    const records: ReportRecord[] = [];

    for (const row of rows) {
      const batchYear =
        toYear(row.bac_grad_year) ??
        toYear(row.grad_grad_year) ??
        toYear(row.postgrad_grad_year) ??
        toYear(row.batch_year);
      const batch = batchYear ? String(batchYear) : "-";
      const country = row.current_country?.trim() || row.address_country?.trim() || "Philippines";
      const province = row.address_province?.trim() || row.current_region?.trim() || "Not provided";
      const employed = row.employment_status === "employed";
      const abroad = employed && !/^philippines?$/i.test(country);

      // Pins are attached below from the shared GIS pin source so the Reports
      // map and the System Usage map always show the exact same plotted alumni.
      records.push({
        id: row.id,
        userId: row.user_id,
        name: fullName(row.first_name, row.middle_name ?? "", row.last_name),
        course: row.course?.trim() || "Course not provided",
        college: row.college?.trim() || "College not provided",
        batch,
        gender: row.gender?.trim() || "Not provided",
        ethnicity: row.ethnicity?.trim() || "Not provided",
        religion: row.religion?.trim() || "Not provided",
        employmentStatus: row.employment_status,
        region: row.current_region?.trim() || province,
        province,
        city: row.current_city?.trim() || row.address_city?.trim() || "-",
        country,
        abroad,
        affiliation: affiliationFromOrgs(row.org_names),
        pin: null,
      });
    }

    // One shared, uncapped pin query for every admin map. This removes the
    // old per-surface coordinate logic that made Reports and System Usage
    // disagree on the plotted total (e.g. 987 vs 1023).
    const pinsResult = await listAlumniMapPins({ includeOptOut: true });
    if (pinsResult.ok) {
      const pinByUser = new Map<number, ReportRecord["pin"]>();
      for (const pin of pinsResult.pins) {
        const userId = Number(pin.id.replace(/^pin-/, ""));
        if (Number.isFinite(userId)) pinByUser.set(userId, pin);
      }
      for (const record of records) {
        record.pin = pinByUser.get(record.userId) ?? null;
      }
    }

    return { ok: true, records };
  } catch (error) {
    console.error("[reports] Records query failed:", error);
    return {
      ok: false,
      message: "The reports could not be loaded right now. Please try again later.",
    };
  }
}
