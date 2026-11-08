import type { Connection, ResultSetHeader, RowDataPacket } from "mysql2/promise";

import { getSessionUser } from "./auth.server";
import { getPool } from "./db.server";
import { savedLocation } from "./geo";
import {
  calculateAge,
  formatAddress,
  formatDate,
  fullName,
  initials,
  toIsoDate,
} from "./profile-format";
import type {
  AdminEducationRecord,
  AdminEmploymentRecord,
  AdminOrganizationRecord,
  MyProfile,
  MyProfileResult,
  ProfileEmploymentStatus,
  VerificationStatus,
} from "./admin.types";
import type {
  AlumniSessionResult,
  AlumniSessionUser,
  EducationRecordInput,
  EmploymentRecordInput,
  MyWorkspace,
  OrganizationRecordInput,
  ProfileEditInput,
  SaveResult,
  WorkspaceEducation,
  WorkspaceEmployment,
  WorkspaceOrganization,
} from "./profile.types";
import { priorityBatchYear } from "./registration.types";

type ProfileRow = RowDataPacket & {
  id: number;
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
  latitude: number | string | null;
  longitude: number | string | null;
};

type EducationRow = RowDataPacket & {
  id: number;
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
  id: number;
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
  id: number;
  name: string;
  address: string | null;
  position: string | null;
  contact_no: string | null;
  email: string | null;
  member_since: Date | string | null;
};

type EditorRow = RowDataPacket & {
  profile_id: number;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  verification_status: VerificationStatus;
};

type ProfileBundle = {
  row: ProfileRow;
  education: EducationRow[];
  employment: EmploymentRow[];
  organizations: OrganizationRow[];
};

const NOT_SIGNED_IN = "Sign in with your alumni account to view your profile.";
const NOT_VERIFIED =
  "Only verified alumni can edit their profile. Your record is still with the OARCC for verification.";

function optional(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed === "" ? null : trimmed;
}

function isoOrNull(value: string | null | undefined): string | null {
  const trimmed = toIsoDate(value ?? "");
  return trimmed === "" ? null : trimmed;
}

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

/** Batch Year priority from education rows: Baccalaureate → Graduate → Post Graduate. */
function batchFromEducation(
  row: ProfileRow,
  education: EducationRow[],
): string {
  const synced = priorityBatchYear(
    education.map((record) => ({
      level: record.level,
      graduatedOn: toIsoDate(formatDate(record.graduated_on)),
    })),
  );
  return synced || (row.batch_year ? String(row.batch_year) : "—");
}

function buildSessionUser(row: ProfileRow, education: EducationRow[] = []): AlumniSessionUser {
  const name = fullName(row.first_name, row.middle_name ?? "", row.last_name);
  return {
    userId: row.user_id,
    fullName: name,
    firstName: row.first_name,
    batch: batchFromEducation(row, education),
    initials: initials(name),
    verificationStatus: row.verification_status,
  };
}

async function loadProfileBundle(userId: number): Promise<ProfileBundle | null> {
  const pool = getPool();

  const [rows] = await pool.execute<ProfileRow[]>(
    `SELECT p.id, p.user_id, p.first_name, p.middle_name, p.last_name, p.gender, p.birth_date,
            p.age, p.ethnicity, p.birth_place, p.religion, p.mobile_number, p.contact_email,
            p.akan_email, p.facebook, p.course, p.college, p.batch_year, p.employment_status,
            p.current_position, p.current_company, p.current_region, p.verification_status,
            cur.building AS current_building, cur.house_no AS current_house_no,
            cur.block AS current_block, cur.street AS current_street,
            cur.subdivision AS current_subdivision, cur.city AS current_city,
            cur.province AS current_province, cur.country AS current_country,
            cur.zip_code AS current_zip_code,
            home.building AS home_building, home.house_no AS home_house_no,
            home.block AS home_block, home.street AS home_street,
            home.subdivision AS home_subdivision, home.city AS home_city,
            home.province AS home_province, home.country AS home_country,
            home.zip_code AS home_zip_code,
            p.latitude, p.longitude
       FROM alumni_profiles p
  LEFT JOIN alumni_addresses cur ON cur.user_id = p.user_id AND cur.kind = 'current'
  LEFT JOIN alumni_addresses home ON home.user_id = p.user_id AND home.kind = 'home'
      WHERE p.user_id = ?
      LIMIT 1`,
    [userId],
  );

  const row = rows[0];
  if (!row) return null;

  const [[education], [employment], [organizations]] = await Promise.all([
    pool.execute<EducationRow[]>(
      `SELECT id, level, school_id_no, degree, major, college, school, school_address, graduated_on
         FROM alumni_education
        WHERE user_id = ?
        ORDER BY graduated_on DESC, id DESC`,
      [userId],
    ),
    pool.execute<EmploymentRow[]>(
      `SELECT id, is_current, position, company, company_address, length_of_employment,
              years_in_office, work_location, sector
         FROM alumni_employment
        WHERE user_id = ?
        ORDER BY is_current DESC, created_at DESC, id DESC`,
      [userId],
    ),
    pool.execute<OrganizationRow[]>(
      `SELECT id, name, address, position, contact_no, email, member_since
         FROM alumni_organizations
        WHERE user_id = ?
        ORDER BY member_since DESC, id DESC`,
      [userId],
    ),
  ]);

  return { row, education, employment, organizations };
}

function mapEducation(records: EducationRow[]): AdminEducationRecord[] {
  return records.map((record) => ({
    id: record.id,
    level: record.level,
    schoolIdNo: record.school_id_no ?? "",
    degree: record.degree,
    major: record.major ?? "",
    college: record.college ?? "",
    school: record.school,
    schoolAddress: record.school_address ?? "",
    graduatedOn: formatDate(record.graduated_on),
  }));
}

function mapEmployment(records: EmploymentRow[]): AdminEmploymentRecord[] {
  return records.map((record) => ({
    id: record.id,
    position: record.position ?? "",
    company: record.company ?? "",
    companyAddress: record.company_address ?? "",
    lengthOfEmployment: record.length_of_employment ?? "",
    yearsInOffice: record.years_in_office ?? "",
    workLocation: record.work_location ?? "",
    sector: record.sector ?? "",
    isCurrent: record.is_current === 1,
  }));
}

function mapOrganizations(records: OrganizationRow[]): AdminOrganizationRecord[] {
  return records.map((record) => ({
    id: record.id,
    name: record.name,
    address: record.address ?? "",
    position: record.position ?? "",
    contactNo: record.contact_no ?? "",
    email: record.email ?? "",
    memberSince: formatDate(record.member_since),
  }));
}

function addressInputFromRow(
  row: ProfileRow,
  prefix: "current" | "home",
): ProfileEditInput["currentAddress"] {
  const address: ProfileEditInput["currentAddress"] = {
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
  if (prefix === "current") {
    address.latitude = toCoordinate(row.latitude);
    address.longitude = toCoordinate(row.longitude);
  }
  return address;
}

function toCoordinate(value: number | string | null): number | null {
  if (value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildMyProfile(bundle: ProfileBundle): MyProfile {
  const { row } = bundle;
  const education = mapEducation(bundle.education);
  const employment = mapEmployment(bundle.employment);
  const organizations = mapOrganizations(bundle.organizations);
  const currentEmployment = employment.find((record) => record.isCurrent) ?? employment[0];

  return {
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
    batch: batchFromEducation(row, bundle.education),
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
    currentAddressParts: addressInputFromRow(row, "current"),
    homeAddressParts: addressInputFromRow(row, "home"),
    education,
    employment,
    organizations,
  };
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
    const bundle = await loadProfileBundle(user.id);
    if (!bundle) return { ok: true, profile: null };
    return { ok: true, profile: buildMyProfile(bundle) };
  } catch (error) {
    console.error("[profile] Query failed:", error);
    return {
      ok: false,
      message: "Your profile could not be loaded right now. Please try again later.",
    };
  }
}

export async function getMyWorkspace(): Promise<MyWorkspace> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: NOT_SIGNED_IN };
  if (user.role !== "alumni") {
    return { ok: false, message: "Only alumni accounts have an alumni workspace." };
  }

  try {
    const bundle = await loadProfileBundle(user.id);
    if (!bundle) {
      return {
        ok: true,
        user: {
          userId: user.id,
          fullName: user.fullName ?? "Alumni",
          firstName: (user.fullName ?? "Alumni").split(" ")[0] || "Alumni",
          batch: "—",
          initials: initials(user.fullName ?? "Alumni"),
          verificationStatus: null,
        },
        canEdit: false,
        profile: null,
        editable: null,
        education: [],
        employment: [],
        organizations: [],
      };
    }

    const education: WorkspaceEducation[] = bundle.education.map((record) => ({
      id: record.id,
      level: record.level as WorkspaceEducation["level"],
      schoolIdNo: record.school_id_no ?? "",
      degree: record.degree,
      major: record.major ?? "",
      college: record.college ?? "",
      school: record.school,
      schoolAddress: record.school_address ?? "",
      graduatedOn: toIsoDate(formatDate(record.graduated_on)),
    }));

    const employment: WorkspaceEmployment[] = bundle.employment.map((record) => ({
      id: record.id,
      isCurrent: record.is_current === 1,
      position: record.position ?? "",
      company: record.company ?? "",
      companyAddress: record.company_address ?? "",
      lengthOfEmployment: record.length_of_employment ?? "",
      yearsInOffice: record.years_in_office ?? "",
      workLocation:
        record.work_location === "Local" || record.work_location === "Abroad"
          ? record.work_location
          : "",
      sector:
        record.sector === "Government" ||
        record.sector === "Non-Government / Private Institution" ||
        record.sector === "Freelance / Entrepreneurial"
          ? record.sector
          : "",
    }));

    const organizations: WorkspaceOrganization[] = bundle.organizations.map((record) => ({
      id: record.id,
      name: record.name,
      address: record.address ?? "",
      position: record.position ?? "",
      contactNo: record.contact_no ?? "",
      email: record.email ?? "",
      memberSince: toIsoDate(formatDate(record.member_since)),
    }));

    const profile = buildMyProfile(bundle);
    const editable: ProfileEditInput = {
      firstName: bundle.row.first_name,
      middleName: bundle.row.middle_name ?? "",
      lastName: bundle.row.last_name,
      gender: bundle.row.gender as ProfileEditInput["gender"],
      birthDate: toIsoDate(formatDate(bundle.row.birth_date)),
      ethnicity: bundle.row.ethnicity,
      birthPlace: bundle.row.birth_place,
      religion: bundle.row.religion,
      mobileNumber: bundle.row.mobile_number,
      contactEmail: bundle.row.contact_email,
      akanEmail: bundle.row.akan_email ?? "",
      facebook: bundle.row.facebook ?? "",
      currentAddress: addressInputFromRow(bundle.row, "current"),
      homeAddress: addressInputFromRow(bundle.row, "home"),
    };

    return {
      ok: true,
      user: buildSessionUser(bundle.row, bundle.education),
      canEdit: bundle.row.verification_status === "verified",
      profile,
      editable,
      education,
      employment,
      organizations,
    };
  } catch (error) {
    console.error("[profile] Workspace query failed:", error);
    return {
      ok: false,
      message: "Your alumni workspace could not be loaded right now. Please try again later.",
    };
  }
}

export async function getAlumniSession(): Promise<AlumniSessionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: true, user: null };

  if (user.role !== "alumni") {
    return {
      ok: true,
      user: {
        userId: user.id,
        fullName: user.fullName ?? "Administrator",
        firstName: (user.fullName ?? "Administrator").split(" ")[0] || "Administrator",
        batch: "—",
        initials: initials(user.fullName ?? "Administrator"),
        verificationStatus: null,
      },
    };
  }

  try {
    const bundle = await loadProfileBundle(user.id);
    if (bundle) return { ok: true, user: buildSessionUser(bundle.row, bundle.education) };

    const name = user.fullName ?? "Alumni";
    return {
      ok: true,
      user: {
        userId: user.id,
        fullName: name,
        firstName: name.split(" ")[0] || name,
        batch: "—",
        initials: initials(name),
        verificationStatus: null,
      },
    };
  } catch (error) {
    console.error("[profile] Session summary query failed:", error);
    return { ok: false, message: "Your session details could not be loaded." };
  }
}

type Editor = { userId: number; name: string; profileId: number };

async function resolveEditor(): Promise<
  { ok: true; editor: Editor } | { ok: false; message: string }
> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: NOT_SIGNED_IN };
  if (user.role !== "alumni") {
    return { ok: false, message: "Only alumni accounts can edit an alumni profile." };
  }

  try {
    const [rows] = await getPool().execute<EditorRow[]>(
      `SELECT id AS profile_id, first_name, middle_name, last_name, verification_status
         FROM alumni_profiles
        WHERE user_id = ?
        LIMIT 1`,
      [user.id],
    );
    const row = rows[0];
    if (!row) {
      return {
        ok: false,
        message: "Your alumni profile is not on record yet. Contact the OARCC for assistance.",
      };
    }
    if (row.verification_status !== "verified") {
      return { ok: false, message: NOT_VERIFIED };
    }

    return {
      ok: true,
      editor: {
        userId: user.id,
        name: fullName(row.first_name, row.middle_name ?? "", row.last_name),
        profileId: row.profile_id,
      },
    };
  } catch (error) {
    console.error("[profile] Editor lookup failed:", error);
    return { ok: false, message: "Your session could not be checked. Please try again." };
  }
}

async function upsertAddress(
  connection: Connection,
  userId: number,
  kind: "current" | "home",
  address: ProfileEditInput["currentAddress"],
): Promise<void> {
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
      optional(address.building),
      optional(address.houseNo),
      optional(address.block),
      optional(address.street),
      optional(address.subdivision),
      optional(address.city),
      optional(address.province),
      optional(address.country),
      optional(address.zipCode),
    ],
  );
}

async function logActivity(
  connection: Connection,
  userId: number,
  name: string,
  action: string,
): Promise<void> {
  await connection.execute(
    `INSERT INTO activity_log (actor_user_id, actor_name, action, entity_type, entity_id)
     VALUES (?, ?, ?, 'profile', ?)`,
    [userId, name, action, userId],
  );
}

type PrimaryEducationRow = RowDataPacket & {
  degree: string;
  college: string | null;
  graduated_on: Date | string | null;
};

type PrimaryEmploymentRow = RowDataPacket & {
  position: string | null;
  company: string | null;
};

/**
 * Copy the primary degree into `alumni_profiles` so the sidebar, public search,
 * admin directory, and GIS map all read the same synced values. The
 * baccalaureate is the primary degree; graduate degrees are only a fallback.
 */
export async function syncPrimaryEducation(connection: Connection, userId: number): Promise<void> {
  const [rows] = await connection.execute<PrimaryEducationRow[]>(
    `SELECT degree, college, graduated_on
       FROM alumni_education
      WHERE user_id = ?
      ORDER BY FIELD(level, 'Baccalaureate Degree', 'Graduate Degree', 'Post Graduate Degree'),
               graduated_on IS NULL, graduated_on DESC, id DESC
      LIMIT 1`,
    [userId],
  );

  const primary = rows[0];
  const iso = primary ? toIsoDate(formatDate(primary.graduated_on)) : "";
  const batchYear = iso ? Number(iso.slice(0, 4)) : NaN;

  await connection.execute(
    `UPDATE alumni_profiles
        SET course = ?, college = ?, batch_year = ?
      WHERE user_id = ?`,
    [
      primary?.degree.trim() || null,
      primary?.college?.trim() || null,
      Number.isFinite(batchYear) && batchYear > 0 ? batchYear : null,
      userId,
    ],
  );
}

/**
 * Copy the current job into `alumni_profiles`. When no record is marked current
 * the alumnus is treated as unemployed, which keeps the map, public directory,
 * and admin dashboard consistent after an edit or deletion.
 */
export async function syncPrimaryEmployment(connection: Connection, userId: number): Promise<void> {
  const [currentRows] = await connection.execute<PrimaryEmploymentRow[]>(
    `SELECT position, company
       FROM alumni_employment
      WHERE user_id = ? AND is_current = 1
      ORDER BY id DESC
      LIMIT 1`,
    [userId],
  );

  const current = currentRows[0];

  if (current) {
    await connection.execute(
      `UPDATE alumni_profiles
          SET employment_status = 'employed', current_position = ?, current_company = ?
        WHERE user_id = ?`,
      [optional(current.position), optional(current.company), userId],
    );
    return;
  }

  await connection.execute(
    `UPDATE alumni_profiles
        SET employment_status = 'unemployed', current_position = NULL, current_company = NULL
      WHERE user_id = ?`,
    [userId],
  );
}

export async function updateMyProfile(input: ProfileEditInput): Promise<SaveResult> {
  const resolved = await resolveEditor();
  if (!resolved.ok) return resolved;

  const { editor } = resolved;
  const displayName = fullName(input.firstName, input.middleName, input.lastName);
  const region = input.currentAddress.province.trim() || input.currentAddress.city.trim() || null;
  const location = savedLocation(input.currentAddress);

  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.execute<ResultSetHeader>(
      `UPDATE alumni_profiles
          SET first_name = ?,
              middle_name = ?,
              last_name = ?,
              gender = ?,
              birth_date = ?,
              age = ?,
              ethnicity = ?,
              birth_place = ?,
              religion = ?,
              mobile_number = ?,
              contact_email = ?,
              akan_email = ?,
              facebook = ?,
              current_region = ?,
              current_city = ?,
              current_country = ?,
              latitude = ?,
              longitude = ?
        WHERE user_id = ?`,
      [
        input.firstName.trim(),
        optional(input.middleName),
        input.lastName.trim(),
        input.gender,
        input.birthDate,
        calculateAge(input.birthDate) || null,
        input.ethnicity.trim(),
        input.birthPlace.trim(),
        input.religion.trim(),
        input.mobileNumber.trim(),
        input.contactEmail.trim().toLowerCase(),
        optional(input.akanEmail.trim().toLowerCase()),
        optional(input.facebook),
        region,
        input.currentAddress.city.trim() || null,
        location.country,
        location.lat,
        location.lng,
        editor.userId,
      ],
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return { ok: false, message: "Your alumni profile could not be found. Contact the OARCC." };
    }

    await connection.execute("UPDATE users SET full_name = ? WHERE id = ?", [
      displayName,
      editor.userId,
    ]);

    await upsertAddress(connection, editor.userId, "current", input.currentAddress);
    await upsertAddress(connection, editor.userId, "home", input.homeAddress);

    await logActivity(
      connection,
      editor.userId,
      displayName,
      `Updated personal profile — ${displayName}`,
    );

    await connection.commit();
    return { ok: true, message: "Profile updated successfully!" };
  } catch (error) {
    await connection.rollback();
    console.error("[profile] Profile update failed:", error);
    return { ok: false, message: "Your profile could not be saved right now. Please try again." };
  } finally {
    connection.release();
  }
}

export async function saveMyEducation(input: EducationRecordInput): Promise<SaveResult> {
  const resolved = await resolveEditor();
  if (!resolved.ok) return resolved;

  const { editor } = resolved;
  const values = [
    input.level,
    optional(input.schoolIdNo),
    input.degree.trim(),
    optional(input.major),
    optional(input.college),
    input.school.trim(),
    optional(input.schoolAddress),
    isoOrNull(input.graduatedOn),
  ];

  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    if (input.id) {
      const [result] = await connection.execute<ResultSetHeader>(
        `UPDATE alumni_education
            SET level = ?, school_id_no = ?, degree = ?, major = ?, college = ?, school = ?,
                school_address = ?, graduated_on = ?
          WHERE id = ? AND user_id = ?`,
        [...values, input.id, editor.userId],
      );
      if (result.affectedRows === 0) {
        await connection.rollback();
        return { ok: false, message: "That education record could not be found." };
      }
    } else {
      await connection.execute(
        `INSERT INTO alumni_education
           (user_id, level, school_id_no, degree, major, college, school, school_address, graduated_on)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [editor.userId, ...values],
      );
    }

    await syncPrimaryEducation(connection, editor.userId);

    await connection.commit();
    return {
      ok: true,
      message: input.id ? "Degree updated successfully!" : "Degree added successfully!",
    };
  } catch (error) {
    await connection.rollback();
    console.error("[profile] Save education failed:", error);
    return { ok: false, message: "That degree could not be saved right now. Please try again." };
  } finally {
    connection.release();
  }
}

export async function deleteMyEducation(id: number): Promise<SaveResult> {
  const resolved = await resolveEditor();
  if (!resolved.ok) return resolved;

  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.execute<ResultSetHeader>(
      "DELETE FROM alumni_education WHERE id = ? AND user_id = ?",
      [id, resolved.editor.userId],
    );
    if (result.affectedRows === 0) {
      await connection.rollback();
      return { ok: false, message: "That education record could not be found." };
    }

    await syncPrimaryEducation(connection, resolved.editor.userId);

    await connection.commit();
    return { ok: true, message: "Degree removed." };
  } catch (error) {
    await connection.rollback();
    console.error("[profile] Delete education failed:", error);
    return { ok: false, message: "That degree could not be removed right now. Please try again." };
  } finally {
    connection.release();
  }
}

export async function saveMyEmployment(input: EmploymentRecordInput): Promise<SaveResult> {
  const resolved = await resolveEditor();
  if (!resolved.ok) return resolved;

  const { editor } = resolved;
  const values = [
    input.isCurrent ? 1 : 0,
    optional(input.position),
    optional(input.company),
    optional(input.companyAddress),
    optional(input.lengthOfEmployment),
    optional(input.yearsInOffice),
    input.workLocation === "Local" || input.workLocation === "Abroad" ? input.workLocation : null,
    input.sector === "Government" ||
    input.sector === "Non-Government / Private Institution" ||
    input.sector === "Freelance / Entrepreneurial"
      ? input.sector
      : null,
  ];

  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    if (input.isCurrent) {
      await connection.execute(
        "UPDATE alumni_employment SET is_current = 0 WHERE user_id = ? AND is_current = 1",
        [editor.userId],
      );
    }

    if (input.id) {
      const [result] = await connection.execute<ResultSetHeader>(
        `UPDATE alumni_employment
            SET is_current = ?, position = ?, company = ?, company_address = ?,
                length_of_employment = ?, years_in_office = ?, work_location = ?, sector = ?
          WHERE id = ? AND user_id = ?`,
        [...values, input.id, editor.userId],
      );
      if (result.affectedRows === 0) {
        await connection.rollback();
        return { ok: false, message: "That employment record could not be found." };
      }
    } else {
      await connection.execute(
        `INSERT INTO alumni_employment
           (user_id, is_current, position, company, company_address, length_of_employment,
            years_in_office, work_location, sector)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [editor.userId, ...values],
      );
    }

    await syncPrimaryEmployment(connection, editor.userId);

    await connection.commit();
    return {
      ok: true,
      message: input.id ? "Employment updated successfully!" : "Employment added successfully!",
    };
  } catch (error) {
    await connection.rollback();
    console.error("[profile] Save employment failed:", error);
    return { ok: false, message: "That employment record could not be saved. Please try again." };
  } finally {
    connection.release();
  }
}

export async function deleteMyEmployment(id: number): Promise<SaveResult> {
  const resolved = await resolveEditor();
  if (!resolved.ok) return resolved;

  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.execute<ResultSetHeader>(
      "DELETE FROM alumni_employment WHERE id = ? AND user_id = ?",
      [id, resolved.editor.userId],
    );
    if (result.affectedRows === 0) {
      await connection.rollback();
      return { ok: false, message: "That employment record could not be found." };
    }

    await syncPrimaryEmployment(connection, resolved.editor.userId);

    await connection.commit();
    return { ok: true, message: "Employment record removed." };
  } catch (error) {
    await connection.rollback();
    console.error("[profile] Delete employment failed:", error);
    return { ok: false, message: "That record could not be removed right now. Please try again." };
  } finally {
    connection.release();
  }
}

export async function saveMyOrganization(input: OrganizationRecordInput): Promise<SaveResult> {
  const resolved = await resolveEditor();
  if (!resolved.ok) return resolved;

  const { editor } = resolved;
  const values = [
    input.name.trim(),
    optional(input.address),
    optional(input.position),
    optional(input.contactNo),
    optional(input.email.trim().toLowerCase()),
    isoOrNull(input.memberSince),
  ];

  try {
    const pool = getPool();

    if (input.id) {
      const [result] = await pool.execute<ResultSetHeader>(
        `UPDATE alumni_organizations
            SET name = ?, address = ?, position = ?, contact_no = ?, email = ?, member_since = ?
          WHERE id = ? AND user_id = ?`,
        [...values, input.id, editor.userId],
      );
      if (result.affectedRows === 0) {
        return { ok: false, message: "That organization could not be found." };
      }
    } else {
      await pool.execute(
        `INSERT INTO alumni_organizations
           (user_id, name, address, position, contact_no, email, member_since)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [editor.userId, ...values],
      );
    }

    return {
      ok: true,
      message: input.id ? "Organization updated successfully!" : "Organization added successfully!",
    };
  } catch (error) {
    console.error("[profile] Save organization failed:", error);
    return { ok: false, message: "That organization could not be saved. Please try again." };
  }
}

export async function deleteMyOrganization(id: number): Promise<SaveResult> {
  const resolved = await resolveEditor();
  if (!resolved.ok) return resolved;

  try {
    const [result] = await getPool().execute<ResultSetHeader>(
      "DELETE FROM alumni_organizations WHERE id = ? AND user_id = ?",
      [id, resolved.editor.userId],
    );
    if (result.affectedRows === 0) {
      return { ok: false, message: "That organization could not be found." };
    }
    return { ok: true, message: "Organization removed." };
  } catch (error) {
    console.error("[profile] Delete organization failed:", error);
    return { ok: false, message: "That organization could not be removed right now." };
  }
}
