import type { Connection, RowDataPacket, ResultSetHeader } from "mysql2/promise";

import { hashPassword } from "./auth.server";
import { getPool } from "./db.server";
import { savedLocation } from "./geo";
import { calculateAge, fullName } from "./profile-format";
import type {
  AddressInput,
  EducationInput,
  EmploymentInput,
  OrganizationInput,
  RegistrationInput,
  RegistrationResult,
} from "./registration.types";
import {
  priorityBatchYear,
  primaryEducationRecord,
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
       (user_id, kind, building, house_no, block, street, subdivision, city, province, country, zip_code)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

    // Batch Year / Course / College priority: Baccalaureate first, then
    // Graduate, then Post Graduate (see `priorityBatchYear` /
    // `primaryEducationRecord`). The stored `batch_year` therefore always
    // matches the Year component of the primary Date Graduated.
    const primary = primaryEducationRecord(input.education);
    const course = primary?.degree.trim() || null;
    const college = primary?.college.trim() || null;
    const batchYearText = priorityBatchYear(input.education);
    const batchYear = batchYearText ? Number(batchYearText) : null;

    const currentAddress = input.currentAddress;
    const homeAddress = input.sameAddress ? currentAddress : input.homeAddress;
    const region = currentAddress.province.trim() || currentAddress.city.trim() || null;
    const location = savedLocation(currentAddress);

    const employment = input.employmentStatus === "employed" ? input.employment : null;
    const organization =
      input.organization && input.organization.name.trim() ? input.organization : null;

    await connection.execute(
      `INSERT INTO alumni_profiles
         (user_id, last_name, first_name, middle_name, gender, birth_date, age, ethnicity,
          birth_place, religion, mobile_number, contact_email, akan_email, facebook, course,
          college, batch_year, employment_status, current_position, current_company, current_region,
          current_city, current_country, latitude, longitude, verification_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
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
        currentAddress.city.trim() || null,
        location.country,
        location.lat,
        location.lng,
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
      message:
        "Registration submitted! Your account is currently under review by the OARCC Admin team. Please wait for verification before logging in.",
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
