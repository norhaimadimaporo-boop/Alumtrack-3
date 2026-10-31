import type { Connection, RowDataPacket, ResultSetHeader } from "mysql2/promise";

import { hashPassword } from "./auth.server";
import { getPool } from "./db.server";
import { calculateAge, fullName } from "./profile-format";
import type {
  AddressInput,
  EducationInput,
  EmploymentInput,
  OrganizationInput,
  RegistrationInput,
  RegistrationResult,
} from "./registration.types";

function optional(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed === "" ? null : trimmed;
}

function isoDate(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
}

function isDuplicateEntry(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "ER_DUP_ENTRY"
  );
}

async function insertAddress(
  connection: Connection,
  userId: number,
  kind: "current" | "home",
  address: AddressInput,
): Promise<void> {
  await connection.execute(
    `INSERT INTO alumni_addresses
       (user_id, kind, building, house_no, block, street, subdivision, city, province, zip_code)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      optional(address.zipCode),
    ],
  );
}

async function insertEducation(
  connection: Connection,
  userId: number,
  education: EducationInput,
): Promise<void> {
  await connection.execute(
    `INSERT INTO alumni_education
       (user_id, level, school_id_no, degree, major, college, school, school_address, graduated_on)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      education.level,
      optional(education.schoolIdNo),
      education.degree.trim(),
      optional(education.major),
      optional(education.college),
      education.school.trim(),
      optional(education.schoolAddress),
      isoDate(education.graduatedOn),
    ],
  );
}

async function insertEmployment(
  connection: Connection,
  userId: number,
  employment: EmploymentInput,
): Promise<void> {
  await connection.execute(
    `INSERT INTO alumni_employment
       (user_id, is_current, position, company, company_address, length_of_employment,
        years_in_office, work_location, sector)
     VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      optional(employment.position),
      optional(employment.company),
      optional(employment.companyAddress),
      optional(employment.lengthOfEmployment),
      optional(employment.yearsInOffice),
      optional(employment.workLocation),
      optional(employment.sector),
    ],
  );
}

async function insertOrganization(
  connection: Connection,
  userId: number,
  organization: OrganizationInput,
): Promise<void> {
  await connection.execute(
    `INSERT INTO alumni_organizations
       (user_id, name, address, position, contact_no, email, member_since)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      organization.name.trim(),
      optional(organization.address),
      optional(organization.position),
      optional(organization.contactNo),
      optional(organization.email),
      isoDate(organization.memberSince),
    ],
  );
}

export async function registerAlumniAccount(input: RegistrationInput): Promise<RegistrationResult> {
  const email = input.accountEmail.trim().toLowerCase();
  const displayName = fullName(input.firstName, input.middleName, input.lastName);

  let passwordHash: string;
  try {
    passwordHash = await hashPassword(input.password);
  } catch (error) {
    console.error("[registration] Password hashing failed:", error);
    return {
      ok: false,
      message: "We could not process your registration right now. Please try again.",
    };
  }

  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [existing] = await connection.execute<RowDataPacket[]>(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [email],
    );

    if (existing.length > 0) {
      await connection.rollback();
      return {
        ok: false,
        field: "accountEmail",
        message: "An account with this email address already exists. Sign in instead.",
      };
    }

    const [userResult] = await connection.execute<ResultSetHeader>(
      "INSERT INTO users (email, password_hash, role, full_name) VALUES (?, ?, 'alumni', ?)",
      [email, passwordHash, displayName],
    );
    const userId = userResult.insertId;

    const baccalaureate = input.education.find((record) => record.level === "Baccalaureate Degree");
    const highest =
      input.education.find((record) => record.level === "Post Graduate Degree") ??
      input.education.find((record) => record.level === "Graduate Degree") ??
      baccalaureate ??
      input.education[0];

    const course = baccalaureate?.degree.trim() || highest?.degree.trim() || null;
    const college = baccalaureate?.college.trim() || highest?.college.trim() || null;
    const batchYear = baccalaureate?.graduatedOn
      ? Number(baccalaureate.graduatedOn.slice(0, 4))
      : null;

    const currentAddress = input.currentAddress;
    const homeAddress = input.sameAddress ? currentAddress : input.homeAddress;
    const region = currentAddress.province.trim() || currentAddress.city.trim() || null;

    const employment = input.employmentStatus === "employed" ? input.employment : null;
    const organization =
      input.organization && input.organization.name.trim() ? input.organization : null;

    await connection.execute(
      `INSERT INTO alumni_profiles
         (user_id, last_name, first_name, middle_name, gender, birth_date, age, ethnicity,
          birth_place, religion, mobile_number, contact_email, akan_email, facebook, course,
          college, batch_year, employment_status, current_position, current_company, current_region)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        input.lastName.trim(),
        input.firstName.trim(),
        optional(input.middleName),
        input.gender,
        input.birthDate,
        calculateAge(input.birthDate) || null,
        input.ethnicity.trim(),
        input.birthPlace.trim(),
        input.religion.trim(),
        input.mobileNumber.trim(),
        (input.contactEmail.trim() || email).toLowerCase(),
        optional(input.akanEmail.toLowerCase()),
        optional(input.facebook),
        course,
        college,
        batchYear,
        input.employmentStatus,
        employment?.position.trim() || null,
        employment?.company.trim() || null,
        region,
      ],
    );

    await insertAddress(connection, userId, "current", currentAddress);
    await insertAddress(connection, userId, "home", homeAddress);

    for (const education of input.education) {
      await insertEducation(connection, userId, education);
    }

    if (employment) {
      await insertEmployment(connection, userId, employment);
    }

    if (organization) {
      await insertOrganization(connection, userId, organization);
    }

    await connection.execute(
      `INSERT INTO activity_log (actor_user_id, actor_name, action, entity_type, entity_id)
       VALUES (?, ?, ?, 'registration', ?)`,
      [userId, displayName, `New alumni registration — ${displayName}`, userId],
    );

    await connection.commit();

    return {
      ok: true,
      message: "Your alumni profile has been submitted to the OARCC for verification.",
    };
  } catch (error) {
    await connection.rollback();

    if (isDuplicateEntry(error)) {
      return {
        ok: false,
        field: "accountEmail",
        message: "An account with this email address already exists. Sign in instead.",
      };
    }

    console.error("[registration] Alumni registration failed:", error);
    return {
      ok: false,
      message: "Registration is temporarily unavailable. Please try again in a moment.",
    };
  } finally {
    connection.release();
  }
}
