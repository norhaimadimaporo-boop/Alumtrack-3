import type { RowDataPacket } from "mysql2/promise";

import { getSessionUser } from "./auth.server";
import { getPool } from "./db.server";
import { formatAddress, formatDate, fullName } from "./profile-format";
import type {
  AdminEducationRecord,
  AdminEmploymentRecord,
  AdminOrganizationRecord,
  MyProfile,
  MyProfileResult,
  ProfileEmploymentStatus,
  VerificationStatus,
} from "./admin.types";

type ProfileRow = RowDataPacket & {
  user_id: number;
  first_name: string;
  middle_name: string | null;
  last_name: string;
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
  name: string;
  address: string | null;
  position: string | null;
  contact_no: string | null;
  email: string | null;
  member_since: Date | string | null;
};

function employmentLabel(status: ProfileEmploymentStatus): string {
  if (status === "employed") return "Employed";
  if (status === "unemployed") return "Unemployed";
  return "Not provided";
}

function addressFromRow(row: ProfileRow, prefix: "current" | "home"): string {
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

export async function getMyProfile(): Promise<MyProfileResult> {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, message: "Sign in with your alumni account to view your profile." };
  }

  if (user.role !== "alumni") {
    return {
      ok: false,
      message: "Only alumni accounts have an alumni profile. Open the admin dashboard instead.",
    };
  }

  try {
    const pool = getPool();

    const [rows] = await pool.execute<ProfileRow[]>(
      `SELECT p.user_id, p.first_name, p.middle_name, p.last_name, p.gender, p.birth_date,
              p.age, p.ethnicity, p.birth_place, p.religion, p.mobile_number, p.contact_email,
              p.akan_email, p.facebook, p.course, p.college, p.batch_year, p.employment_status,
              p.current_position, p.current_company, p.current_region, p.verification_status,
              cur.building AS current_building, cur.house_no AS current_house_no,
              cur.block AS current_block, cur.street AS current_street,
              cur.subdivision AS current_subdivision, cur.city AS current_city,
              cur.province AS current_province, cur.zip_code AS current_zip_code,
              home.building AS home_building, home.house_no AS home_house_no,
              home.block AS home_block, home.street AS home_street,
              home.subdivision AS home_subdivision, home.city AS home_city,
              home.province AS home_province, home.zip_code AS home_zip_code
         FROM alumni_profiles p
    LEFT JOIN alumni_addresses cur ON cur.user_id = p.user_id AND cur.kind = 'current'
    LEFT JOIN alumni_addresses home ON home.user_id = p.user_id AND home.kind = 'home'
        WHERE p.user_id = ?
        LIMIT 1`,
      [user.id],
    );

    const row = rows[0];
    if (!row) return { ok: true, profile: null };

    const [[educationRows], [employmentRows], [organizationRows]] = await Promise.all([
      pool.execute<EducationRow[]>(
        `SELECT level, school_id_no, degree, major, college, school, school_address, graduated_on
           FROM alumni_education
          WHERE user_id = ?
          ORDER BY graduated_on DESC, id DESC`,
        [user.id],
      ),
      pool.execute<EmploymentRow[]>(
        `SELECT is_current, position, company, company_address, length_of_employment,
                years_in_office, work_location, sector
           FROM alumni_employment
          WHERE user_id = ?
          ORDER BY is_current DESC, created_at DESC, id DESC`,
        [user.id],
      ),
      pool.execute<OrganizationRow[]>(
        `SELECT name, address, position, contact_no, email, member_since
           FROM alumni_organizations
          WHERE user_id = ?
          ORDER BY member_since DESC, id DESC`,
        [user.id],
      ),
    ]);

    const education: AdminEducationRecord[] = educationRows.map((record) => ({
      level: record.level,
      schoolIdNo: record.school_id_no ?? "",
      degree: record.degree,
      major: record.major ?? "",
      college: record.college ?? "",
      school: record.school,
      schoolAddress: record.school_address ?? "",
      graduatedOn: formatDate(record.graduated_on),
    }));

    const employment: AdminEmploymentRecord[] = employmentRows.map((record) => ({
      position: record.position ?? "",
      company: record.company ?? "",
      companyAddress: record.company_address ?? "",
      lengthOfEmployment: record.length_of_employment ?? "",
      yearsInOffice: record.years_in_office ?? "",
      workLocation: record.work_location ?? "",
      sector: record.sector ?? "",
      isCurrent: record.is_current === 1,
    }));

    const organizations: AdminOrganizationRecord[] = organizationRows.map((record) => ({
      name: record.name,
      address: record.address ?? "",
      position: record.position ?? "",
      contactNo: record.contact_no ?? "",
      email: record.email ?? "",
      memberSince: formatDate(record.member_since),
    }));

    const currentEmployment = employment.find((record) => record.isCurrent) ?? employment[0];

    const profile: MyProfile = {
      userId: row.user_id,
      firstName: row.first_name,
      middleName: row.middle_name ?? "",
      lastName: row.last_name,
      fullName: fullName(row.first_name, row.middle_name ?? "", row.last_name),
      gender: row.gender,
      birthDate: formatDate(row.birth_date),
      age: row.age ? String(row.age) : "",
      ethnicity: row.ethnicity,
      birthPlace: row.birth_place,
      religion: row.religion,
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
      currentAddress: addressFromRow(row, "current"),
      homeAddress: addressFromRow(row, "home"),
      education,
      employment,
      organizations,
    };

    return { ok: true, profile };
  } catch (error) {
    console.error("[profile] Query failed:", error);
    return {
      ok: false,
      message: "Your profile could not be loaded right now. Please try again later.",
    };
  }
}
