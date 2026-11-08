import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";

import { getSessionUser, hashPassword, type AuthUser } from "./auth.server";
import { getPool } from "./db.server";
import { manilaClock, manilaDate } from "./manila-time";
import { formatAddress, formatDate, fullName, calculateAge, relativeTime } from "./profile-format";
import { savedLocation } from "./geo";
import { isAdminRole, type AdminRole } from "./session";
import type {
  AdminAccount,
  AdminAccountInput,
  AdminAccountList,
  AdminAccountUpdate,
  AdminActionResult,
  AdminAlumniSaveInput,
  AdminAlumniUpdateInput,
  AdminAlumniList,
  AdminAlumnus,
  AdminDashboardData,
  AdminEducationRecord,
  AdminEmploymentRecord,
  AdminOrganizationRecord,
  ProfileEmploymentStatus,
  VerificationStatus,
} from "./admin.types";
import {
  primaryEducationRecord,
  priorityBatchYear,
} from "./registration.types";

const UNAUTHORIZED = "Sign in with an administrator account to open the admin dashboard.";

/** Higher rank inherits everything the lower ranks can do. */
const ADMIN_RANK: Record<AdminRole, number> = { viewer: 0, standard: 1, head: 2 };

function forbiddenMessage(minimum: AdminRole): string {
  if (minimum === "head") return "Only the Head Admin can manage administrator accounts.";
  if (minimum === "standard") {
    return "Your admin account is read-only. Ask a Head Admin or Standard Admin to make this change.";
  }
  return UNAUTHORIZED;
}

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
  actor_name: string | null;
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
  bac_grad_year: number | string | null;
  grad_grad_year: number | string | null;
  postgrad_grad_year: number | string | null;
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
  /** Batch priority: Baccalaureate year, then Graduate, then Post Graduate. */
  bac_grad_year: number | string | null;
  grad_grad_year: number | string | null;
  postgrad_grad_year: number | string | null;
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
  current_country: string | null;
  current_zip_code: string | null;
  home_building: string | null;
  home_house_no: string | null;
  home_block: string | null;
  home_street: string | null;
  home_subdivision: string | null;
  home_city: string | null;
  home_province: string | null;
  home_country: string | null;
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

type AdminAccountRow = RowDataPacket & {
  id: number;
  email: string;
  full_name: string | null;
  admin_role: AdminRole | null;
  is_active: number;
  created_at: Date | string;
  last_login_at: Date | string | null;
};

type CountTotalRow = RowDataPacket & { total: number };

type AdminAccess = { ok: true; admin: AuthUser } | { ok: false; message: string };

export async function requireAdmin(minimum: AdminRole = "viewer"): Promise<AdminAccess> {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") return { ok: false, message: UNAUTHORIZED };

  // Rows created before RBAC existed default to the standard tier.
  const role = user.adminRole ?? "standard";
  if (ADMIN_RANK[role] < ADMIN_RANK[minimum]) {
    return { ok: false, message: forbiddenMessage(minimum) };
  }

  return { ok: true, admin: { ...user, adminRole: role } };
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

function addressPartsFromRow(
  row: AlumniRow,
  prefix: "current" | "home",
): import("./registration.types").AddressInput {
  return {
    building: row[`${prefix}_building`] ?? "",
    houseNo: row[`${prefix}_house_no`] ?? "",
    block: row[`${prefix}_block`] ?? "",
    street: row[`${prefix}_street`] ?? "",
    subdivision: row[`${prefix}_subdivision`] ?? "",
    city: row[`${prefix}_city`] ?? "",
    province: row[`${prefix}_province`] ?? "",
    country: row[`${prefix}_country`] ?? "",
    zipCode: row[`${prefix}_zip_code`] ?? "",
  };
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
  const access = await requireAdmin("viewer");
  if (!access.ok) return { ok: false, message: access.message };

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
        `SELECT id, actor_name, action, entity_type, created_at
           FROM activity_log
          ORDER BY created_at DESC, id DESC
          LIMIT 200`,
      ),
      pool.query<RecentAlumniRow[]>(
        `SELECT id, first_name, middle_name, last_name, course, batch_year,
                (SELECT YEAR(graduated_on) FROM alumni_education
                  WHERE user_id = alumni_profiles.user_id AND level = 'Baccalaureate Degree'
                    AND graduated_on IS NOT NULL
                  ORDER BY graduated_on DESC LIMIT 1) AS bac_grad_year,
                (SELECT YEAR(graduated_on) FROM alumni_education
                  WHERE user_id = alumni_profiles.user_id AND level = 'Graduate Degree'
                    AND graduated_on IS NOT NULL
                  ORDER BY graduated_on DESC LIMIT 1) AS grad_grad_year,
                (SELECT YEAR(graduated_on) FROM alumni_education
                  WHERE user_id = alumni_profiles.user_id AND level = 'Post Graduate Degree'
                    AND graduated_on IS NOT NULL
                  ORDER BY graduated_on DESC LIMIT 1) AS postgrad_grad_year,
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
      activity: activityRows.map((row) => {
        const stampDate =
          row.created_at instanceof Date ? row.created_at : new Date(row.created_at);
        const valid = !Number.isNaN(stampDate.getTime());
        const date = valid ? manilaDate(stampDate) : `—`;
        const clock = valid ? manilaClock(stampDate) : `—`;
        return {
          id: String(row.id),
          text: row.action,
          time: relativeTime(row.created_at),
          kind: activityKind(row.entity_type),
          actorName: row.actor_name?.trim() || "—",
          date,
          clock,
          stamp: valid ? stampDate.toISOString() : "",
        };
      }),
      recentRegistrations: recentRows.map((row) => {
        const toYear = (value: number | string | null): number | null => {
          if (value === null || value === undefined) return null;
          const year = Number(value);
          return Number.isFinite(year) && year > 0 ? Math.floor(year) : null;
        };
        const batchYear =
          toYear(row.bac_grad_year) ??
          toYear(row.grad_grad_year) ??
          toYear(row.postgrad_grad_year) ??
          toYear(row.batch_year);
        return {
          id: row.id,
          name: fullName(row.first_name, row.middle_name ?? "", row.last_name),
          course: row.course ?? "Course not provided",
          batch: batchYear ? String(batchYear) : "—",
          status: employmentLabel(row.employment_status),
          verificationStatus: row.verification_status,
          createdAt: formatDate(row.created_at),
        };
      }),
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
  const access = await requireAdmin("viewer");
  if (!access.ok) return { ok: false, message: access.message };

  try {
    const pool = getPool();

    const [rows] = await pool.query<AlumniRow[]>(
      `SELECT p.id, p.user_id, u.email AS account_email, p.last_name, p.first_name,
              p.middle_name, p.gender, p.birth_date, p.age, p.ethnicity, p.birth_place,
              p.religion, p.mobile_number, p.contact_email, p.akan_email, p.facebook,
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
              p.employment_status, p.current_position,
              p.current_company, p.current_region, p.verification_status, p.created_at,
              cur.building AS current_building, cur.house_no AS current_house_no,
              cur.block AS current_block, cur.street AS current_street,
              cur.subdivision AS current_subdivision, cur.city AS current_city,
              cur.province AS current_province, cur.country AS current_country,
              cur.zip_code AS current_zip_code,
              home.building AS home_building, home.house_no AS home_house_no,
              home.block AS home_block, home.street AS home_street,
              home.subdivision AS home_subdivision, home.city AS home_city,
              home.province AS home_province, home.country AS home_country,
              home.zip_code AS home_zip_code
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

    const toYear = (value: number | string | null): number | null => {
      if (value === null || value === undefined) return null;
      const year = Number(value);
      return Number.isFinite(year) && year > 0 ? Math.floor(year) : null;
    };

    const alumni: AdminAlumnus[] = rows.map((row) => {
      const education = educationByUser.get(row.user_id) ?? [];
      const employment = employmentByUser.get(row.user_id) ?? [];
      const organizations = organizationByUser.get(row.user_id) ?? [];
      const currentEmployment = employment.find((record) => record.isCurrent) ?? employment[0];
      const batchYear =
        toYear(row.bac_grad_year) ??
        toYear(row.grad_grad_year) ??
        toYear(row.postgrad_grad_year) ??
        toYear(row.batch_year);

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
        batch: batchYear ? String(batchYear) : "—",
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
        currentAddressParts: addressPartsFromRow(row, "current"),
        homeAddressParts: addressPartsFromRow(row, "home"),
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
  const access = await requireAdmin("standard");
  if (!access.ok) return { ok: false, message: access.message };
  const admin = access.admin;

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
  const access = await requireAdmin("standard");
  if (!access.ok) return { ok: false, message: access.message };
  const admin = access.admin;

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

function splitFullName(fullName: string): { first: string; middle: string; last: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "", middle: "", last: "" };
  if (parts.length === 1) return { first: parts[0], middle: "", last: "" };
  return {
    first: parts[0],
    middle: parts.slice(1, -1).join(" "),
    last: parts[parts.length - 1],
  };
}

function toBatchYear(batch: string): number | null {
  const year = Number(batch);
  return Number.isFinite(year) && year > 1900 && year < 2100 ? Math.floor(year) : null;
}

async function saveEducation(
  connection: import("mysql2/promise").Connection,
  userId: number,
  education: AdminAlumniSaveInput["education"],
) {
  await connection.execute("DELETE FROM alumni_education WHERE user_id = ?", [userId]);
  for (const entry of education) {
    if (!entry.degree.trim() || !entry.school.trim()) continue;
    await connection.execute(
      `INSERT INTO alumni_education
         (user_id, level, school_id_no, degree, major, college, school, school_address, graduated_on)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        entry.level,
        entry.schoolIdNo.trim() || null,
        entry.degree.trim(),
        entry.major.trim() || null,
        entry.college.trim() || null,
        entry.school.trim(),
        entry.schoolAddress.trim() || null,
        entry.graduatedOn || null,
      ],
    );
  }
}

async function saveEmployment(
  connection: import("mysql2/promise").Connection,
  userId: number,
  employment: AdminAlumniSaveInput["employment"],
) {
  await connection.execute("DELETE FROM alumni_employment WHERE user_id = ?", [userId]);
  if (!employment) return;
  await connection.execute(
    `INSERT INTO alumni_employment
       (user_id, is_current, position, company, company_address, length_of_employment,
        years_in_office, work_location, sector)
     VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      employment.position.trim() || null,
      employment.company.trim() || null,
      employment.companyAddress.trim() || null,
      employment.lengthOfEmployment.trim() || null,
      employment.yearsInOffice.trim() || null,
      employment.workLocation.trim() || null,
      employment.sector.trim() || null,
    ],
  );
}

async function saveOrganization(
  connection: import("mysql2/promise").Connection,
  userId: number,
  organization: AdminAlumniSaveInput["organization"],
) {
  await connection.execute("DELETE FROM alumni_organizations WHERE user_id = ?", [userId]);
  if (!organization || !organization.name.trim()) return;
  await connection.execute(
    `INSERT INTO alumni_organizations
       (user_id, name, address, position, contact_no, email, member_since)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      organization.name.trim(),
      organization.address.trim() || null,
      organization.position.trim() || null,
      organization.contactNo.trim() || null,
      organization.email.trim().toLowerCase() || null,
      organization.memberSince || null,
    ],
  );
}

async function upsertAddressRow(
  connection: import("mysql2/promise").Connection,
  userId: number,
  kind: "current" | "home",
  address: AdminAlumniSaveInput["currentAddress"],
) {
  const opt = (v: string) => v?.trim() || null;
  await connection.execute(
    `INSERT INTO alumni_addresses
       (user_id, kind, building, house_no, block, street, subdivision, city, province, country, zip_code)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       building = VALUES(building),
       house_no = VALUES(house_no),
       block = VALUES(block),
       street = VALUES(street),
       subdivision = VALUES(subdivision),
       city = VALUES(city),
       province = VALUES(province),
       country = VALUES(country),
       zip_code = VALUES(zip_code)`,
    [
      userId,
      kind,
      opt(address.building),
      opt(address.houseNo),
      opt(address.block),
      opt(address.street),
      opt(address.subdivision),
      opt(address.city),
      opt(address.province),
      opt(address.country),
      opt(address.zipCode),
    ],
  );
}

function profileFields(input: AdminAlumniSaveInput) {
  const { first, middle, last } = splitFullName(input.fullName);
  const location = savedLocation(input.currentAddress);
  const employment = input.employmentStatus === "employed" ? input.employment : null;
  // Server-side dedup + Batch auto-sync: Course/College/Batch always derive
  // from the primary education record (Baccalaureate → Graduate → Post
  // Graduate) when one is present, falling back to the modal dropdowns.
  // This guarantees the stored profile matches Phase 3 even if a stale
  // client payload sends a divergent course/college/batch.
  const educationForSync = (input.education ?? []).map((entry) => ({
    level: entry.level,
    degree: entry.degree ?? "",
    college: entry.college ?? "",
    graduatedOn: entry.graduatedOn ?? "",
  }));
  const primary = primaryEducationRecord(
    educationForSync.filter((entry) => entry.degree.trim() || entry.college.trim()),
  );
  const syncedBatch = priorityBatchYear(educationForSync);
  return {
    first,
    middle,
    last,
    displayName: fullName(first, middle, last) || input.fullName.trim(),
    batchYear: (syncedBatch ? Number(syncedBatch) : null) ?? toBatchYear(input.batch),
    course: primary?.degree.trim() || input.course.trim(),
    college: primary?.college.trim() || input.college.trim(),
    employment,
    region: input.region.trim() || input.currentAddress.province.trim() || input.currentAddress.city.trim() || null,
    location,
  };
}

export async function updateAlumniRecord(
  input: AdminAlumniUpdateInput,
): Promise<AdminActionResult> {
  const access = await requireAdmin("standard");
  if (!access.ok) return { ok: false, message: access.message };
  const admin = access.admin;

  if (!Number.isInteger(input.id) || input.id <= 0) {
    return { ok: false, message: "Invalid alumni record." };
  }
  if (!input.fullName.trim()) {
    return { ok: false, message: "Enter the alumni's full name." };
  }

  const pool = getPool();
  const connection = await pool.getConnection();
  try {
    const [owners] = await connection.execute<ProfileOwnerRow[]>(
      `SELECT p.user_id, p.first_name, p.middle_name, p.last_name
         FROM alumni_profiles p
        WHERE p.id = ?
        LIMIT 1`,
      [input.id],
    );
    const owner = owners[0];
    if (!owner) return { ok: false, message: "That alumni record no longer exists." };
    const userId = owner.user_id;
    const fields = profileFields(input);

    await connection.beginTransaction();

    await connection.execute("UPDATE users SET full_name = ? WHERE id = ?", [
      fields.displayName,
      userId,
    ]);

    await connection.execute(
      `UPDATE alumni_profiles
          SET last_name = ?, first_name = ?, middle_name = ?, gender = ?, birth_date = ?,
              age = ?, ethnicity = ?, birth_place = ?, religion = ?, mobile_number = ?,
              contact_email = ?, akan_email = ?, facebook = ?, course = ?, college = ?,
              batch_year = ?, employment_status = ?, current_position = ?, current_company = ?,
              current_region = ?, current_city = ?, current_country = ?, latitude = ?, longitude = ?
        WHERE id = ?`,
      [
        fields.last,
        fields.first,
        fields.middle || null,
        input.gender || "Prefer not to say",
        input.birthDate || null,
        calculateAge(input.birthDate) || null,
        input.ethnicity.trim(),
        input.birthPlace.trim(),
        input.religion.trim(),
        input.mobileNumber.trim(),
        (input.contactEmail.trim() || `${fields.displayName.toLowerCase().replace(/\s+/g, ".")}@alumtrack.local`),
        input.akanEmail.trim().toLowerCase() || null,
        input.facebook.trim() || null,
        fields.course || null,
        fields.college || null,
        fields.batchYear,
        input.employmentStatus,
        fields.employment?.position.trim() || null,
        fields.employment?.company.trim() || null,
        fields.region,
        input.currentAddress.city.trim() || null,
        fields.location.country,
        fields.location.lat,
        fields.location.lng,
        input.id,
      ],
    );

    await upsertAddressRow(connection, userId, "current", input.currentAddress);
    await upsertAddressRow(connection, userId, "home", input.homeAddress);
    await saveEducation(connection, userId, input.education);
    await saveEmployment(connection, userId, fields.employment);
    await saveOrganization(connection, userId, input.organization);

    await connection.execute(
      `INSERT INTO activity_log (actor_user_id, actor_name, action, entity_type, entity_id)
       VALUES (?, ?, ?, 'admin', ?)`,
      [
        admin.id,
        admin.fullName ?? admin.email,
        `Updated alumni record — ${fields.displayName}`,
        input.id,
      ],
    );

    await connection.commit();
    return { ok: true, message: "Alumni record updated successfully!" };
  } catch (error) {
    await connection.rollback();
    console.error("[admin] Update alumnus failed:", error);
    return { ok: false, message: "We could not update this record right now. Please try again." };
  } finally {
    connection.release();
  }
}

/** Admin direct-create: inserts a verified alumni record (import-style). */
export async function createAlumniRecord(
  input: AdminAlumniSaveInput,
): Promise<AdminActionResult> {
  const access = await requireAdmin("standard");
  if (!access.ok) return { ok: false, message: access.message };
  const admin = access.admin;

  if (!input.fullName.trim()) {
    return { ok: false, message: "Enter the alumni's full name." };
  }

  const fields = profileFields(input);
  const email = (input.contactEmail.trim() || `${fields.displayName.toLowerCase().replace(/[^a-z0-9]+/g, ".")}@alumtrack.local`).toLowerCase();
  const pool = getPool();
  const connection = await pool.getConnection();
  try {
    const [existing] = await connection.execute<ProfileOwnerRow[]>(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [email],
    );
    if (existing.length > 0) {
      return { ok: false, message: "An account with this email already exists. Use Edit instead." };
    }

    const passwordHash = await hashPassword("Alumtrack2026!");
    await connection.beginTransaction();

    const [userResult] = await connection.execute<ResultSetHeader>(
      "INSERT INTO users (email, password_hash, role, full_name) VALUES (?, ?, 'alumni', ?)",
      [email, passwordHash, fields.displayName],
    );
    const userId = userResult.insertId;

    const [profileResult] = await connection.execute<ResultSetHeader>(
      `INSERT INTO alumni_profiles
         (user_id, last_name, first_name, middle_name, gender, birth_date, age, ethnicity,
          birth_place, religion, mobile_number, contact_email, akan_email, facebook, course,
          college, batch_year, employment_status, current_position, current_company, current_region,
          current_city, current_country, latitude, longitude, verification_status, verified_at, verified_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'verified', UTC_TIMESTAMP(), ?)`,
      [
        userId,
        fields.last,
        fields.first,
        fields.middle || null,
        input.gender || "Prefer not to say",
        input.birthDate || null,
        calculateAge(input.birthDate) || null,
        input.ethnicity.trim(),
        input.birthPlace.trim(),
        input.religion.trim(),
        input.mobileNumber.trim(),
        email,
        input.akanEmail.trim().toLowerCase() || null,
        input.facebook.trim() || null,
        fields.course || null,
        fields.college || null,
        fields.batchYear,
        input.employmentStatus,
        fields.employment?.position.trim() || null,
        fields.employment?.company.trim() || null,
        fields.region,
        input.currentAddress.city.trim() || null,
        fields.location.country,
        fields.location.lat,
        fields.location.lng,
        admin.id,
      ],
    );
    const profileId = profileResult.insertId;

    await upsertAddressRow(connection, userId, "current", input.currentAddress);
    await upsertAddressRow(connection, userId, "home", input.homeAddress);
    await saveEducation(connection, userId, input.education);
    await saveEmployment(connection, userId, fields.employment);
    await saveOrganization(connection, userId, input.organization);

    await connection.execute(
      `INSERT INTO activity_log (actor_user_id, actor_name, action, entity_type, entity_id)
       VALUES (?, ?, ?, 'admin', ?)`,
      [
        admin.id,
        admin.fullName ?? admin.email,
        `Added alumni record — ${fields.displayName}`,
        profileId,
      ],
    );

    await connection.commit();
    return { ok: true, message: "Alumni record added successfully!" };
  } catch (error) {
    await connection.rollback();
    console.error("[admin] Create alumnus failed:", error);
    return { ok: false, message: "We could not add this record right now. Please try again." };
  } finally {
    connection.release();
  }
}

const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  head: "Head Admin",
  standard: "Standard Admin",
  viewer: "Viewer Admin",
};

function adminRoleLabel(role: AdminRole): string {
  return ADMIN_ROLE_LABELS[role];
}

function toAdminAccount(row: AdminAccountRow, currentUserId: number): AdminAccount {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name ?? "Administrator",
    role: row.admin_role ?? "standard",
    active: row.is_active === 1,
    createdAt: formatDate(row.created_at),
    lastLogin: row.last_login_at ? formatDate(row.last_login_at) : "Never",
    isSelf: row.id === currentUserId,
  };
}

async function countActiveHeads(excludeId: number): Promise<number> {
  const [rows] = await getPool().execute<CountTotalRow[]>(
    `SELECT COUNT(*) AS total
       FROM users
      WHERE role = 'admin'
        AND admin_role = 'head'
        AND is_active = 1
        AND id <> ?`,
    [excludeId],
  );
  return Number(rows[0]?.total ?? 0);
}

async function logAdminActivity(admin: AuthUser, action: string, entityId: number | null) {
  await getPool().execute(
    `INSERT INTO activity_log (actor_user_id, actor_name, action, entity_type, entity_id)
     VALUES (?, ?, ?, 'admin', ?)`,
    [admin.id, admin.fullName ?? admin.email, action, entityId],
  );
}

export async function listAdminAccounts(): Promise<AdminAccountList> {
  const access = await requireAdmin("head");
  if (!access.ok) return { ok: false, message: access.message };

  try {
    const [rows] = await getPool().query<AdminAccountRow[]>(
      `SELECT id, email, full_name, admin_role, is_active, created_at, last_login_at
         FROM users
        WHERE role = 'admin'
        ORDER BY FIELD(admin_role, 'head', 'standard', 'viewer'), created_at ASC, id ASC`,
    );

    return {
      ok: true,
      accounts: rows.map((row) => toAdminAccount(row, access.admin.id)),
      currentUserId: access.admin.id,
    };
  } catch (error) {
    console.error("[admin] Admin account list failed:", error);
    return {
      ok: false,
      message: "The admin account list could not be loaded right now. Please try again later.",
    };
  }
}

export async function createAdminAccount(input: AdminAccountInput): Promise<AdminActionResult> {
  const access = await requireAdmin("head");
  if (!access.ok) return { ok: false, message: access.message };

  const email = input.email.trim().toLowerCase();
  const fullName = input.fullName.trim();

  if (!fullName) return { ok: false, message: "Enter the administrator's full name." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: "Enter a valid email address." };
  }
  if (input.password.length < 8) {
    return { ok: false, message: "The password must be at least 8 characters long." };
  }
  if (!isAdminRole(input.role)) return { ok: false, message: "Choose a valid admin role." };

  try {
    const pool = getPool();
    const [existing] = await pool.execute<RowDataPacket[]>(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [email],
    );
    if (existing.length > 0) {
      return { ok: false, message: "An account with that email address already exists." };
    }

    const passwordHash = await hashPassword(input.password);
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO users (email, password_hash, role, admin_role, full_name, is_active)
       VALUES (?, ?, 'admin', ?, ?, 1)`,
      [email, passwordHash, input.role, fullName],
    );

    await logAdminActivity(
      access.admin,
      `Created ${adminRoleLabel(input.role)} account — ${fullName}`,
      result.insertId,
    );

    return {
      ok: true,
      message: `${fullName} was added as ${adminRoleLabel(input.role)}.`,
    };
  } catch (error) {
    console.error("[admin] Create admin account failed:", error);
    return { ok: false, message: "We could not create that admin account right now." };
  }
}

export async function updateAdminAccount(input: AdminAccountUpdate): Promise<AdminActionResult> {
  const access = await requireAdmin("head");
  if (!access.ok) return { ok: false, message: access.message };

  if (!Number.isInteger(input.id) || input.id <= 0) {
    return { ok: false, message: "Invalid admin account." };
  }

  const email = input.email.trim().toLowerCase();
  const fullName = input.fullName.trim();
  if (!fullName) return { ok: false, message: "Enter the administrator's full name." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: "Enter a valid email address." };
  }
  if (!isAdminRole(input.role)) return { ok: false, message: "Choose a valid admin role." };
  if (input.password !== undefined && input.password !== "" && input.password.length < 8) {
    return { ok: false, message: "The new password must be at least 8 characters long." };
  }

  try {
    const pool = getPool();
    const [rows] = await pool.execute<AdminAccountRow[]>(
      `SELECT id, email, full_name, admin_role, is_active, created_at, last_login_at
         FROM users
        WHERE id = ? AND role = 'admin'
        LIMIT 1`,
      [input.id],
    );
    const target = rows[0];
    if (!target) return { ok: false, message: "That admin account no longer exists." };

    const currentRole = target.admin_role ?? "standard";

    if (target.id === access.admin.id && !input.active) {
      return { ok: false, message: "You cannot deactivate your own admin account." };
    }

    const losesHead = currentRole === "head" && (input.role !== "head" || input.active === false);
    if (losesHead) {
      const otherHeads = await countActiveHeads(target.id);
      if (otherHeads === 0) {
        return { ok: false, message: "At least one active Head Admin must remain." };
      }
    }

    const [duplicate] = await pool.execute<RowDataPacket[]>(
      "SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1",
      [email, target.id],
    );
    if (duplicate.length > 0) {
      return { ok: false, message: "Another account already uses that email address." };
    }

    if (input.password) {
      const passwordHash = await hashPassword(input.password);
      await pool.execute(
        `UPDATE users
            SET email = ?, full_name = ?, admin_role = ?, is_active = ?, password_hash = ?
          WHERE id = ? AND role = 'admin'`,
        [email, fullName, input.role, input.active ? 1 : 0, passwordHash, target.id],
      );
    } else {
      await pool.execute(
        `UPDATE users
            SET email = ?, full_name = ?, admin_role = ?, is_active = ?
          WHERE id = ? AND role = 'admin'`,
        [email, fullName, input.role, input.active ? 1 : 0, target.id],
      );
    }

    await logAdminActivity(
      access.admin,
      `Updated ${adminRoleLabel(input.role)} account — ${fullName}`,
      target.id,
    );

    return { ok: true, message: `${fullName}'s admin account was updated.` };
  } catch (error) {
    console.error("[admin] Update admin account failed:", error);
    return { ok: false, message: "We could not update that admin account right now." };
  }
}

export async function deleteAdminAccount(id: number): Promise<AdminActionResult> {
  const access = await requireAdmin("head");
  if (!access.ok) return { ok: false, message: access.message };

  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, message: "Invalid admin account." };
  }
  if (id === access.admin.id) {
    return { ok: false, message: "You cannot delete your own admin account." };
  }

  try {
    const pool = getPool();
    const [rows] = await pool.execute<AdminAccountRow[]>(
      `SELECT id, email, full_name, admin_role, is_active, created_at, last_login_at
         FROM users
        WHERE id = ? AND role = 'admin'
        LIMIT 1`,
      [id],
    );
    const target = rows[0];
    if (!target) return { ok: false, message: "That admin account no longer exists." };

    const currentRole = target.admin_role ?? "standard";
    if (currentRole === "head" && target.is_active === 1) {
      const otherHeads = await countActiveHeads(target.id);
      if (otherHeads === 0) {
        return { ok: false, message: "At least one active Head Admin must remain." };
      }
    }

    await pool.execute("DELETE FROM users WHERE id = ? AND role = 'admin'", [id]);
    await logAdminActivity(
      access.admin,
      `Deleted admin account — ${target.full_name ?? target.email}`,
      null,
    );

    return { ok: true, message: "The admin account was deleted." };
  } catch (error) {
    console.error("[admin] Delete admin account failed:", error);
    return { ok: false, message: "We could not delete that admin account right now." };
  }
}
