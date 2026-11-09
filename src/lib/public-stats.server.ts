import type { RowDataPacket } from "mysql2/promise";

import { getPool } from "./db.server";
import { manilaDate } from "./manila-time";
import { ensureSoftDeleteColumns } from "./soft-delete.server";
import type { PublicStats, PublicStatsResult } from "./public-stats.types";

type EmploymentCountsRow = RowDataPacket & {
  total: number;
  employed: number | null;
  unemployed: number | null;
  unknown: number | null;
};

type CollegeRow = RowDataPacket & {
  college: string;
  n: number;
};

type CountRow = RowDataPacket & {
  n: number;
};

type OverseasRow = RowDataPacket & {
  overseas: number | null;
  hostCountries: number | null;
  locally: number | null;
};

type SectorRow = RowDataPacket & {
  sector: string | null;
  n: number;
};

const VERIFIED_ACTIVE =
  "p.verification_status = 'verified' AND u.is_active = 1 AND COALESCE(p.is_deleted, 0) = 0 AND COALESCE(u.is_deleted, 0) = 0";

/** Friendly labels for the `alumni_employment.sector` enum. */
function industryLabel(sector: string): string {
  if (sector === "Government") return "Government";
  if (sector === "Non-Government / Private Institution") return "Private Institution";
  if (sector === "Freelance / Entrepreneurial") return "Freelance / Entrepreneurial";
  return sector;
}

/**
 * Totally live public numbers — no hardcoded snapshot.
 *
 * Population is verified, active alumni (`alumni_profiles` joined to active
 * users), the same population used by Search, the GIS map, and Reports.
 * Using one helper is what keeps Home, the Alumni Dashboard, and Admin
 * figures identical for every role.
 *
 * Tables read:
 *  - `alumni_profiles` (+ active `users`): total traced, colleges,
 *    effective batch years, employment breakdown, overseas/local split
 *    (current country with the current-address country as fallback).
 *  - `alumni_education`: graduation-year priority (Baccalaureate → Graduate →
 *    Post Graduate) for batch years.
 *  - `alumni_employment`: current sector rows for Top industries.
 *  - `posts`: Published `News / Event` rows in the current (Manila) year.
 */
export async function getPublicStats(): Promise<PublicStatsResult> {
  const currentYear = Number(manilaDate(new Date()).slice(0, 4)) || new Date().getFullYear();
  await ensureSoftDeleteColumns();
  const pool = getPool();

  try {
    // Each `pool.query()` resolves to `[rows, fields]`. Single-row
    // aggregates are unwrapped to their first row; multi-row queries keep
    // the full `rows` array.
    const [
      [employmentCountsRows],
      [collegeRows],
      [batchRows],
      [eventsRows],
      [overseasRows],
      [sectorRows],
    ] = await Promise.all([
      // Total traced + employment breakdown in one pass.
      pool.query<EmploymentCountsRow[]>(
        `SELECT
            COUNT(*) AS total,
            SUM(p.employment_status = 'employed') AS employed,
            SUM(p.employment_status = 'unemployed') AS unemployed,
            SUM(p.employment_status = 'unknown') AS unknown
           FROM alumni_profiles p
           JOIN users u ON u.id = p.user_id
          WHERE ${VERIFIED_ACTIVE}`,
      ),
      // Distinct colleges actually present in the data (not a static list).
      pool.query<CollegeRow[]>(
        `SELECT TRIM(p.college) AS college, COUNT(*) AS n
           FROM alumni_profiles p
           JOIN users u ON u.id = p.user_id
          WHERE ${VERIFIED_ACTIVE}
            AND p.college IS NOT NULL
            AND TRIM(p.college) <> ''
            AND LOWER(TRIM(p.college)) <> 'not provided'
          GROUP BY TRIM(p.college)
          ORDER BY n DESC, college ASC`,
      ),
      // Distinct effective batch years (Baccalaureate → Graduate → Post Graduate → stored batch_year).
      pool.query<CountRow[]>(
        `SELECT COUNT(DISTINCT COALESCE(
                 (SELECT YEAR(graduated_on) FROM alumni_education
                   WHERE user_id = p.user_id AND level = 'Baccalaureate Degree'
                     AND graduated_on IS NOT NULL
                   ORDER BY graduated_on DESC LIMIT 1),
                 (SELECT YEAR(graduated_on) FROM alumni_education
                   WHERE user_id = p.user_id AND level = 'Graduate Degree'
                     AND graduated_on IS NOT NULL
                   ORDER BY graduated_on DESC LIMIT 1),
                 (SELECT YEAR(graduated_on) FROM alumni_education
                   WHERE user_id = p.user_id AND level = 'Post Graduate Degree'
                     AND graduated_on IS NOT NULL
                   ORDER BY graduated_on DESC LIMIT 1),
                 p.batch_year
               )) AS n
           FROM alumni_profiles p
           JOIN users u ON u.id = p.user_id
          WHERE ${VERIFIED_ACTIVE}`,
      ),
      pool.query<CountRow[]>(
        `SELECT COUNT(*) AS n
           FROM posts
          WHERE status = 'Published'
            AND COALESCE(is_deleted, 0) = 0
            AND type = 'News / Event'
            AND YEAR(COALESCE(posted_at, CONVERT_TZ(created_at, @@session.time_zone, '+08:00'))) = ?`,
        [currentYear],
      ),
      // Employed abroad vs locally: current country, falling back to the
      // current-address country, exactly like the GIS pin country does.
      pool.query<OverseasRow[]>(
        `SELECT
            SUM(CASE WHEN country <> '' AND LOWER(country) NOT LIKE 'philippine%' THEN 1 ELSE 0 END) AS overseas,
            COUNT(DISTINCT CASE WHEN country <> '' AND LOWER(country) NOT LIKE 'philippine%' THEN country END) AS hostCountries,
            SUM(CASE WHEN LOWER(country) LIKE 'philippine%' THEN 1 ELSE 0 END) AS locally
           FROM (
             SELECT COALESCE(NULLIF(TRIM(p.current_country), ''), TRIM(COALESCE(a.country, ''))) AS country
               FROM alumni_profiles p
               JOIN users u ON u.id = p.user_id
               LEFT JOIN alumni_addresses a ON a.user_id = p.user_id AND a.kind = 'current'
              WHERE ${VERIFIED_ACTIVE}
                AND p.employment_status = 'employed'
           ) t`,
      ),
      // Current sector mix among employed alumni.
      pool.query<SectorRow[]>(
        `SELECT emp.sector, COUNT(*) AS n
           FROM alumni_employment emp
           JOIN alumni_profiles p ON p.user_id = emp.user_id
           JOIN users u ON u.id = p.user_id
          WHERE ${VERIFIED_ACTIVE}
            AND emp.is_current = 1
          GROUP BY emp.sector`,
      ),
    ]);

    const employmentCounts = employmentCountsRows[0];
    const batchRow = batchRows[0];
    const eventsRow = eventsRows[0];
    const overseasRow = overseasRows[0];

    const employed = Number(employmentCounts?.employed ?? 0);
    const unemployed = Number(employmentCounts?.unemployed ?? 0);
    const unknown = Number(employmentCounts?.unknown ?? 0);
    const denominator = employed + unemployed;
    const employmentRate =
      denominator > 0 ? Math.round((employed / denominator) * 1000) / 10 : 0;

    const sectorKnown = sectorRows.filter((row) => row.sector && row.sector.trim() !== "");
    const employedWithSector = sectorKnown.reduce((sum, row) => sum + Number(row.n ?? 0), 0);
    const employedWithCurrentJob = sectorRows.reduce((sum, row) => sum + Number(row.n ?? 0), 0);

    const industries = sectorKnown
      .map((row) => {
        const count = Number(row.n ?? 0);
        return {
          label: industryLabel(row.sector!.trim()),
          value: employedWithSector > 0 ? Math.round((count / employedWithSector) * 100) : 0,
          count,
        };
      })
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

    const stats: PublicStats = {
      totalTraced: Number(employmentCounts?.total ?? 0),
      colleges: collegeRows.length,
      batchYears: Number(batchRow?.n ?? 0),
      eventsThisYear: Number(eventsRow?.n ?? 0),
      currentYear,
      employed,
      unemployed,
      unknown,
      employmentRate,
      workingOverseas: Number(overseasRow?.overseas ?? 0),
      hostCountries: Number(overseasRow?.hostCountries ?? 0),
      employedLocally: Number(overseasRow?.locally ?? 0),
      employedWithSector,
      employedWithCurrentJob,
      industries,
    };

    return { ok: true, stats };
  } catch (error) {
    console.error("[public-stats] Query failed:", error);
    return {
      ok: false,
      message: "Live statistics could not be loaded right now. Please try again later.",
    };
  }
}
