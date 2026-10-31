import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";

import { getSessionUser, type AuthUser } from "./auth.server";
import { getPool } from "./db.server";
import { formatAddress, formatDate, fullName, relativeTime } from "./profile-format";
import type {
  AdminActionResult,
  AdminAlumniList,
  AdminAlumnus,
  AdminDashboardData,
  AdminEducationRecord,
  AdminEmploymentRecord,
  AdminOrganizationRecord,
  ProfileEmploymentStatus,
  VerificationStatus,
} from "./admin.types";

const UNAUTHORIZED = "Sign in with an administrator account to open the admin dashboard.";

type CountRow = RowDataPacket & {
  registered: number;
  pending: number;
  verified: number;
  employed: number;
  active_posts: number;
  admins: number;
};

type ActivityRow = RowDataPacket & {
  id: number;
  action: string;
  entity_type: string | null;
  created_at: Date | string;
};

type RecentAlumniRow = RowDataPacket & {
  id: number;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  course: string | null;
  batch_year: number | null;
  employment_status: ProfileEmploymentStatus;
  verification_status: VerificationStatus;
  created_at: Date | string;
};

type AlumniRow = RowDataPacket & {
  id: number;
  user_id: number;
  account_email: string;
  last_name: string;
  first_name: string;
  middle_name: string | null;
  gender: string;
  birth_date: Date | string;
  age: number | null;
  ethnicity: string;
  birth_place: string;
  religion: string;
  mobile_number: string;
  contact_email: string;
  akan_email: string | null;
  facebook: string | null;
  course: string | null;
  college: string | null;
  batch_year: number | null;
  employment_status: ProfileEmploymentStatus;
  current_position: string | null;
  current_company: string | null;
  current_region: string | null;
  verification_status: VerificationStatus;
  created_at: Date | string;
  current_building: string | null;
  current_house_no: string | null;
  current_block: string | null;
  current_street: string | null;
  current_subdivision: string | null;
  current_city: string | null;
  current_province: string | null;
  current_zip_code: string | null;
  home_building: string | null;
  home_house_no: string | null;
  home_block: string | null;
  home_street: string | null;
  home_subdivision: string | null;
  home_city: string | null;
  home_province: string | null;
  home_zip_code: string | null;
};

type EducationRow = RowDataPacket & {
  user_id: number;
  level: string;
  school_id_no: string | null;
  degree: string;
  major: string | null;
  college: string | null;
  school: string;
  school_address: string | null;
  graduated_on: Date | string | null;
};

type EmploymentRow = RowDataPacket & {
  user_id: number;
  is_current: number;
  position: string | null;
  company: string | null;
  company_address: string | null;
  length_of_employment: string | null;
  years_in_office: string | null;
  work_location: string | null;
  sector: string | null;
};

type OrganizationRow = RowDataPacket & {
  user_id: number;
  name: string;
  address: string | null;
  position: string | null;
  contact_no: string | null;
  email: string | null;
  member_since: Date | string | null;
};

type ProfileOwnerRow = RowDataPacket & {
  user_id: number;
  first_name: string;
  middle_name: string | null;
  last_name: string;
};

async function requireAdmin(): Promise<AuthUser | null> {
  const user = await getSessionUser();
  return user && user.role === "admin" ? user : null;
}

function employmentLabel(status: ProfileEmploymentStatus): string {
  if (status === "employed") return "Employed";
  if (status === "unemployed") return "Unemployed";
  return "Not provided";
}

function activityKind(
  entityType: string | null,
): "registration" | "verification" | "deletion" | "admin" {
  if (entityType === "registration") return "registration";
  if (entityType === "verification") return "verification";
  if (entityType === "deletion") return "deletion";
  return "admin";
}

function addressFromRow(row: AlumniRow, prefix: "current" | "home"): string {
  return formatAddress([
    row[`${prefix}_building`],
    row[`${prefix}_house_no`],
    row[`${prefix}_block`],
    row[`${prefix}_street`],
    row[`${prefix}_subdivision`],
    row[`${prefix}_city`],
    row[`${prefix}_province`],
    row[`${prefix}_zip_code`],
  ]);
}

export async function getAdminDashboard(): Promise<AdminDashboardData> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, message: UNAUTHORIZED };

  try {
    const pool = getPool();

    const [[counts], [activityRows], [recentRows]] = await Promise.all([
      pool.query<CountRow[]>(
        `SELECT
           (SELECT COUNT(*) FROM alumni_profiles) AS registered,
           (SELECT COUNT(*) FROM alumni_profiles WHERE verification_status = 'pending') AS pending,
           (SELECT COUNT(*) FROM alumni_profiles WHERE verification_status = 'verified') AS verified,
           (SELECT COUNT(*) FROM alumni_profiles WHERE employment_status = 'employed') AS employed,
           (SELECT COUNT(*) FROM posts WHERE status = 'Published') AS active_posts,
           (SELECT COUNT(*) FROM users WHERE role = 'admin' AND is_active = 1) AS admins`,
      ),
      pool.query<ActivityRow[]>(
        `SELECT id, action, entity_type, created_at
           FROM activity_log
          ORDER BY created_at DESC, id DESC
          LIMIT 6`,
      ),
      pool.query<RecentAlumniRow[]>(
        `SELECT id, first_name, middle_name, last_name, course, batch_year,
                employment_status, verification_status, created_at
           FROM alumni_profiles
          ORDER BY created_at DESC, id DESC
          LIMIT 5`,
      ),
    ]);

    const statRow = counts[0];

    return {
      ok: true,
      stats: {
        registeredAlumni: Number(statRow?.registered ?? 0),
        pendingVerification: Number(statRow?.pending ?? 0),
        verifiedAlumni: Number(statRow?.verified ?? 0),
        employedAlumni: Number(statRow?.employed ?? 0),
        activePosts: Number(statRow?.active_posts ?? 0),
        adminAccounts: Number(statRow?.admins ?? 0),
      },
      activity: activityRows.map((row) => ({
        id: String(row.id),
        text: row.action,
        time: relativeTime(row.created_at),
        kind: activityKind(row.entity_type),
      })),
      recentRegistrations: recentRows.map((row) => ({
        id: row.id,
        name: fullName(row.first_name, row.middle_name ?? "", row.last_name),
        course: row.course ?? "Course not provided",
        batch: row.batch_year ? String(row.batch_year) : "—",
        status: employmentLabel(row.employment_status),
        verificationStatus: row.verification_status,
        createdAt: formatDate(row.created_at),
      })),
    };
  } catch (error) {
    console.error("[admin] Dashboard query failed:", error);
    return {
      ok: false,
      message: "The dashboard could not be loaded right now. Please try again later.",
    };
  }
}

export async function listAdminAlumni(): Promise<AdminAlumniList> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, message: UNAUTHORIZED };

  try {
    const pool = getPool();

    const [rows] = await pool.query<AlumniRow[]>(
      `SELECT p.id, p.user_id, u.email AS account_email, p.last_name, p.first_name,
              p.middle_name, p.gender, p.birth_date, p.age, p.ethnicity, p.birth_place,
              p.religion, p.mobile_number, p.contact_email, p.akan_email, p.facebook,
              p.course, p.college, p.batch_year, p.employment_status, p.current_position,
              p.current_company, p.current_region, p.verification_status, p.created_at,
              cur.building AS current_building, cur.house_no AS current_house_no,
              cur.block AS current_block, cur.street AS current_street,
              cur.subdivision AS current_subdivision, cur.city AS current_city,
              cur.province AS current_province, cur.zip_code AS current_zip_code,
              home.building AS home_building, home.house_no AS home_house_no,
              home.block AS home_block, home.street AS home_street,
              home.subdivision AS home_subdivision, home.city AS home_city,
              home.province AS home_province, home.zip_code AS home_zip_code
         FROM alumni_profiles p
         JOIN users u ON u.id = p.user_id
    LEFT JOIN alumni_addresses cur ON cur.user_id = p.user_id AND cur.kind = 'current'
    LEFT JOIN alumni_addresses home ON home.user_id = p.user_id AND home.kind = 'home'
        ORDER BY p.created_at DESC, p.id DESC`,
    );

    if (rows.length === 0) return { ok: true, alumni: [] };

    const userIds = rows.map((row) => row.user_id);

    const [[educationRows], [employmentRows], [organizationRows]] = await Promise.all([
      pool.query<EducationRow[]>(
        `SELECT user_id, level, school_id_no, degree, major, college, school,
                school_address, graduated_on
           FROM alumni_education
          WHERE user_id IN (?)
          ORDER BY graduated_on DESC, id DESC`,
        [userIds],
      ),
      pool.query<EmploymentRow[]>(
        `SELECT user_id, is_current, position, company, company_address,
                length_of_employment, years_in_office, work_location, sector
           FROM alumni_employment
          WHERE user_id IN (?)
          ORDER BY is_current DESC, created_at DESC, id DESC`,
        [userIds],
      ),
      pool.query<OrganizationRow[]>(
        `SELECT user_id, name, address, position, contact_no, email, member_since
           FROM alumni_organizations
          WHERE user_id IN (?)
          ORDER BY member_since DESC, id DESC`,
        [userIds],
      ),
    ]);

    const educationByUser = new Map<number, AdminEducationRecord[]>();
    for (const row of educationRows) {
      const list = educationByUser.get(row.user_id) ?? [];
      list.push({
        level: row.level,
        schoolIdNo: row.school_id_no ?? "",
        degree: row.degree,
        major: row.major ?? "",
        college: row.college ?? "",
        school: row.school,
        schoolAddress: row.school_address ?? "",
        graduatedOn: formatDate(row.graduated_on),
      });
      educationByUser.set(row.user_id, list);
    }

    const employmentByUser = new Map<number, AdminEmploymentRecord[]>();
    for (const row of employmentRows) {
      const list = employmentByUser.get(row.user_id) ?? [];
      list.push({
        position: row.position ?? "",
        company: row.company ?? "",
        companyAddress: row.company_address ?? "",
        lengthOfEmployment: row.length_of_employment ?? "",
        yearsInOffice: row.years_in_office ?? "",
        workLocation: row.work_location ?? "",
        sector: row.sector ?? "",
        isCurrent: row.is_current === 1,
      });
      employmentByUser.set(row.user_id, list);
    }

    const organizationByUser = new Map<number, AdminOrganizationRecord[]>();
    for (const row of organizationRows) {
      const list = organizationByUser.get(row.user_id) ?? [];
      list.push({
        name: row.name,
        address: row.address ?? "",
        position: row.position ?? "",
        contactNo: row.contact_no ?? "",
        email: row.email ?? "",
        memberSince: formatDate(row.member_since),
      });
      organizationByUser.set(row.user_id, list);
    }

    const alumni: AdminAlumnus[] = rows.map((row) => {
      const education = educationByUser.get(row.user_id) ?? [];
      const employment = employmentByUser.get(row.user_id) ?? [];
      const organizations = organizationByUser.get(row.user_id) ?? [];
      const currentEmployment = employment.find((record) => record.isCurrent) ?? employment[0];

      return {
        id: row.id,
        userId: row.user_id,
        name: fullName(row.first_name, row.middle_name ?? "", row.last_name),
        firstName: row.first_name,
        middleName: row.middle_name ?? "",
        lastName: row.last_name,
        gender: row.gender,
        birthDate: formatDate(row.birth_date),
        age: row.age ? String(row.age) : "",
        ethnicity: row.ethnicity,
        birthPlace: row.birth_place,
        religion: row.religion,
        email: row.account_email,
        mobileNumber: row.mobile_number,
        contactEmail: row.contact_email,
        akanEmail: row.akan_email ?? "",
        facebook: row.facebook ?? "",
        course: row.course ?? "Course not provided",
        college: row.college ?? "College not provided",
        batch: row.batch_year ? String(row.batch_year) : "—",
        status: employmentLabel(row.employment_status),
        employmentStatus: row.employment_status,
        job: row.current_position ?? currentEmployment?.position ?? "Not provided",
        company: row.current_company ?? currentEmployment?.company ?? "Not provided",
        region:
          row.current_region ||
          formatAddress([row.current_city, row.current_province]) ||
          "Not provided",
        verificationStatus: row.verification_status,
        verified: row.verification_status === "verified",
        createdAt: formatDate(row.created_at),
        currentAddress: addressFromRow(row, "current"),
        homeAddress: addressFromRow(row, "home"),
        education,
        employment,
        organizations,
      };
    });

    return { ok: true, alumni };
  } catch (error) {
    console.error("[admin] Alumni directory query failed:", error);
    return {
      ok: false,
      message: "The alumni directory could not be loaded right now. Please try again later.",
    };
  }
}

async function findProfileOwner(profileId: number): Promise<ProfileOwnerRow | null> {
  const [rows] = await getPool().execute<ProfileOwnerRow[]>(
    `SELECT p.user_id, p.first_name, p.middle_name, p.last_name
       FROM alumni_profiles p
      WHERE p.id = ?
      LIMIT 1`,
    [profileId],
  );
  return rows[0] ?? null;
}

export async function verifyAlumniRecord(profileId: number): Promise<AdminActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, message: UNAUTHORIZED };

  if (!Number.isInteger(profileId) || profileId <= 0) {
    return { ok: false, message: "Invalid alumni record." };
  }

  try {
    const owner = await findProfileOwner(profileId);
    if (!owner) return { ok: false, message: "That alumni record no longer exists." };

    const name = fullName(owner.first_name, owner.middle_name ?? "", owner.last_name);
    const pool = getPool();

    await pool.execute(
      `UPDATE alumni_profiles
          SET verification_status = 'verified',
              verified_at = UTC_TIMESTAMP(),
              verified_by = ?
        WHERE id = ?`,
      [admin.id, profileId],
    );

    await pool.execute(
      `INSERT INTO activity_log (actor_user_id, actor_name, action, entity_type, entity_id)
       VALUES (?, ?, ?, 'verification', ?)`,
      [admin.id, admin.fullName ?? admin.email, `Verified alumni record — ${name}`, profileId],
    );

    return { ok: true, message: `${name} is now verified.` };
  } catch (error) {
    console.error("[admin] Verify alumnus failed:", error);
    return { ok: false, message: "We could not verify this record right now. Please try again." };
  }
}

export async function deleteAlumniRecord(profileId: number): Promise<AdminActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, message: UNAUTHORIZED };

  if (!Number.isInteger(profileId) || profileId <= 0) {
    return { ok: false, message: "Invalid alumni record." };
  }

  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    const [rows] = await connection.execute<ProfileOwnerRow[]>(
      `SELECT p.user_id, p.first_name, p.middle_name, p.last_name
         FROM alumni_profiles p
        WHERE p.id = ?
        LIMIT 1`,
      [profileId],
    );
    const owner = rows[0];
    if (!owner) return { ok: false, message: "That alumni record no longer exists." };

    const name = fullName(owner.first_name, owner.middle_name ?? "", owner.last_name);

    await connection.beginTransaction();

    const [result] = await connection.execute<ResultSetHeader>(
      "DELETE FROM users WHERE id = ? AND role = 'alumni'",
      [owner.user_id],
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return { ok: false, message: "That alumni account no longer exists." };
    }

    await connection.execute(
      `INSERT INTO activity_log (actor_user_id, actor_name, action, entity_type, entity_id)
       VALUES (?, ?, ?, 'deletion', ?)`,
      [admin.id, admin.fullName ?? admin.email, `Deleted alumni record — ${name}`, profileId],
    );

    await connection.commit();
    return { ok: true, message: `${name} was removed from the alumni directory.` };
  } catch (error) {
    await connection.rollback();
    console.error("[admin] Delete alumnus failed:", error);
    return { ok: false, message: "We could not delete this record right now. Please try again." };
  } finally {
    connection.release();
  }
}
