import type { RowDataPacket } from "mysql2/promise";

import { getSessionUser } from "./auth.server";
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
  mobile_number: string | null;
  contact_email: string | null;
  akan_email: string | null;
  facebook: string | null;
  public_show_contact: number | null;
  public_show_email: number | null;
  public_show_employment: number | null;
  directory_show_workplace: number | null;
  directory_show_region: number | null;
  directory_show_mobile: number | null;
  directory_show_facebook: number | null;
};

function statusLabel(status: ProfileEmploymentStatus): PublicAlumnus["status"] {
  if (status === "employed") return "Employed";
  if (status === "unemployed") return "Unemployed";
  return "Not provided";
}

/** Missing settings rows fall back to the defaults (`1` = shown). */
function enabled(value: number | null, fallback: boolean): boolean {
  return value === null ? fallback : value === 1;
}

/**
 * Public alumni directory. Only verified, active accounts are returned so
 * pending registrations never leak. Each field is filtered on the server
 * against the owner's privacy settings, so hidden values never reach the browser.
 *
 * Guests see what the "Public profile visibility" switches allow. Signed-in
 * alumni see the same fields and must also be allowed by the "Verified alumni
 * directory" switches.
 */
export async function listPublicAlumni(): Promise<PublicAlumniResult> {
  try {
    const signedIn = (await getSessionUser()) !== null;
    const [rows] = await getPool().query<PublicAlumniRow[]>(
      `SELECT p.id, p.first_name, p.middle_name, p.last_name, p.course, p.college,
              p.batch_year, p.employment_status, p.current_position, p.current_company,
              p.current_region, cur.city AS current_city, cur.province AS current_province,
              emp.position AS employment_position, emp.company AS employment_company,
              p.mobile_number, p.contact_email, p.akan_email, p.facebook,
              ps.public_show_contact, ps.public_show_email, ps.public_show_employment,
              ps.directory_show_workplace, ps.directory_show_region,
              ps.directory_show_mobile, ps.directory_show_facebook
         FROM alumni_profiles p
         JOIN users u ON u.id = p.user_id AND u.is_active = 1
    LEFT JOIN alumni_addresses cur ON cur.user_id = p.user_id AND cur.kind = 'current'
    LEFT JOIN alumni_employment emp ON emp.id = (
                SELECT e.id FROM alumni_employment e
                 WHERE e.user_id = p.user_id AND e.is_current = 1
              ORDER BY e.id DESC LIMIT 1)
    LEFT JOIN alumni_privacy_settings ps ON ps.user_id = p.user_id
        WHERE p.verification_status = 'verified'
     ORDER BY p.last_name ASC, p.first_name ASC`,
    );

    const alumni: PublicAlumnus[] = rows.map((row) => {
      const showJob =
        enabled(row.public_show_employment, true) &&
        (!signedIn || enabled(row.directory_show_workplace, true));
      const showRegion = !signedIn || enabled(row.directory_show_region, true);
      const showMobile =
        enabled(row.public_show_contact, false) &&
        (!signedIn || enabled(row.directory_show_mobile, false));
      const showEmail = enabled(row.public_show_email, false);
      const showFacebook = signedIn && enabled(row.directory_show_facebook, false);

      const region =
        row.current_region?.trim() ||
        formatAddress([row.current_city, row.current_province]) ||
        "Not provided";

      return {
        id: row.id,
        name: fullName(row.first_name, row.middle_name ?? "", row.last_name),
        course: row.course?.trim() || "Course not provided",
        college: row.college?.trim() || "College not provided",
        batch: row.batch_year ? String(row.batch_year) : "—",
        job: showJob
          ? row.current_position?.trim() || row.employment_position?.trim() || "Not provided"
          : null,
        company: showJob
          ? row.current_company?.trim() || row.employment_company?.trim() || "Not provided"
          : null,
        region: showRegion ? region : null,
        status: statusLabel(row.employment_status),
        mobile: showMobile ? row.mobile_number?.trim() || null : null,
        emails: showEmail
          ? [row.contact_email, row.akan_email]
              .map((value) => value?.trim() ?? "")
              .filter(Boolean)
          : [],
        facebook: showFacebook ? row.facebook?.trim() || null : null,
      };
    });

    return { ok: true, alumni, signedIn };
  } catch (error) {
    console.error("[search] Public alumni query failed:", error);
    return {
      ok: false,
      message: "The alumni directory could not be loaded right now. Please try again later.",
    };
  }
}
