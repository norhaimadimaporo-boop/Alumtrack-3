import type { RowDataPacket } from "mysql2/promise";

import { getPool } from "./db.server";
import { formatAddress, fullName } from "./profile-format";
import type { ProfileEmploymentStatus } from "./admin.types";
import type { PublicAlumniResult, PublicAlumnus } from "./search.types";

type PublicAlumniRow = RowDataPacket & {
  id: number;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  course: string | null;
  college: string | null;
  batch_year: number | null;
  employment_status: ProfileEmploymentStatus;
  current_position: string | null;
  current_company: string | null;
  current_region: string | null;
  current_city: string | null;
  current_province: string | null;
  employment_position: string | null;
  employment_company: string | null;
};

function statusLabel(status: ProfileEmploymentStatus): PublicAlumnus["status"] {
  if (status === "employed") return "Employed";
  if (status === "unemployed") return "Unemployed";
  return "Not provided";
}

/**
 * Public alumni directory. Only verified, active accounts are returned so
 * pending registrations never leak into the public search page.
 */
export async function listPublicAlumni(): Promise<PublicAlumniResult> {
  try {
    const [rows] = await getPool().query<PublicAlumniRow[]>(
      `SELECT p.id, p.first_name, p.middle_name, p.last_name, p.course, p.college,
              p.batch_year, p.employment_status, p.current_position, p.current_company,
              p.current_region, cur.city AS current_city, cur.province AS current_province,
              emp.position AS employment_position, emp.company AS employment_company
         FROM alumni_profiles p
         JOIN users u ON u.id = p.user_id AND u.is_active = 1
    LEFT JOIN alumni_addresses cur ON cur.user_id = p.user_id AND cur.kind = 'current'
    LEFT JOIN alumni_employment emp ON emp.id = (
                SELECT e.id FROM alumni_employment e
                 WHERE e.user_id = p.user_id AND e.is_current = 1
              ORDER BY e.id DESC LIMIT 1)
        WHERE p.verification_status = 'verified'
     ORDER BY p.last_name ASC, p.first_name ASC`,
    );

    const alumni: PublicAlumnus[] = rows.map((row) => ({
      id: row.id,
      name: fullName(row.first_name, row.middle_name ?? "", row.last_name),
      course: row.course?.trim() || "Course not provided",
      college: row.college?.trim() || "College not provided",
      batch: row.batch_year ? String(row.batch_year) : "—",
      job: row.current_position?.trim() || row.employment_position?.trim() || "Not provided",
      company: row.current_company?.trim() || row.employment_company?.trim() || "Not provided",
      region:
        row.current_region?.trim() ||
        formatAddress([row.current_city, row.current_province]) ||
        "Not provided",
      status: statusLabel(row.employment_status),
    }));

    return { ok: true, alumni };
  } catch (error) {
    console.error("[search] Public alumni query failed:", error);
    return {
      ok: false,
      message: "The alumni directory could not be loaded right now. Please try again later.",
    };
  }
}
