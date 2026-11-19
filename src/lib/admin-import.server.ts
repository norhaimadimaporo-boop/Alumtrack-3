import type { Connection, ResultSetHeader, RowDataPacket } from "mysql2/promise";

import type { AdminImportHistoryResult, AdminImportResult } from "./admin.types";
import { getSessionUser, hashPassword, type AuthUser } from "./auth.server";
import { getPool } from "./db.server";
import { manilaClock, manilaDate } from "./manila-time";
import { resolveLocation, type ResolvedLocation } from "./geo";
import { calculateAge, fullName } from "./profile-format";
import { syncPrimaryEducation, syncPrimaryEmployment } from "./profile.server";
import type { EducationLevel, EmploymentInput } from "./registration.types";

/**
 * Bulk CSV import for the admin alumni directory. Every row is written through
 * the same tables as the five-phase registration wizard, so imported alumni are
 * complete: account + profile + addresses + education + employment +
 * organizations. Each row runs in its own transaction, which keeps one bad row
 * from aborting the rest of the file.
 */

const DEFAULT_PASSWORD = "Alumtrack2026!";
const MAX_ROWS = 1000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Metadata supplied by the client when a file is uploaded in chunks. */
export type ImportChunkMeta = {
  isFirstChunk?: boolean | undefined;
  isLastChunk?: boolean | undefined;
  totalFileRows?: number | undefined;
  totalCreated?: number | undefined;
  totalUpdated?: number | undefined;
};

let importHistoryPromise: Promise<void> | null = null;

/** Idempotently creates the alumni_imports history table. */
export function ensureImportHistoryTable(): Promise<void> {
  if (!importHistoryPromise) {
    importHistoryPromise = (async () => {
      await getPool().query(`
        CREATE TABLE IF NOT EXISTS alumni_imports (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          filename VARCHAR(255) NULL,
          total_rows INT UNSIGNED NOT NULL DEFAULT 0,
          created_rows INT UNSIGNED NOT NULL DEFAULT 0,
          updated_rows INT UNSIGNED NOT NULL DEFAULT 0,
          created_by BIGINT UNSIGNED NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_imports_created (created_at),
          CONSTRAINT fk_imports_actor FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
        ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
      `);
    })().catch((error) => {
      importHistoryPromise = null;
      throw error;
    });
  }
  return importHistoryPromise;
}

type ImportHistoryRow = RowDataPacket & {
  id: number;
  filename: string | null;
  total_rows: number;
  created_rows: number;
  updated_rows: number;
  created_at: Date | string;
};

/** Recent imported CSV files for the collapsible history list. */
export async function listImportHistory(): Promise<AdminImportHistoryResult> {
  const admin = await getSessionUser();
  if (!admin || admin.role !== "admin") {
    return { ok: true, history: [] };
  }
  try {
    await ensureImportHistoryTable();
    const [rows] = await getPool().query<ImportHistoryRow[]>(
      `SELECT id, filename, total_rows, created_rows, updated_rows, created_at
         FROM alumni_imports
        ORDER BY created_at DESC, id DESC
        LIMIT 20`,
    );
    return {
      ok: true,
      history: rows.map((row) => {
        const date = row.created_at instanceof Date ? row.created_at : new Date(row.created_at);
        const valid = !Number.isNaN(date.getTime());
        return {
          id: row.id,
          filename: row.filename?.trim() || "CSV import",
          totalRows: Number(row.total_rows ?? 0),
          createdRows: Number(row.created_rows ?? 0),
          updatedRows: Number(row.updated_rows ?? 0),
          importedAt: valid ? `${manilaDate(date)} · ${manilaClock(date)}` : "-",
          stamp: valid ? date.toISOString() : "",
        };
      }),
    };
  } catch (error) {
    console.error("[admin-import] History query failed:", error);
    return { ok: false, message: "Import history could not be loaded right now.", history: [] };
  }
}

type FieldKey =
  | "lastName"
  | "firstName"
  | "middleName"
  | "gender"
  | "birthDate"
  | "ethnicity"
  | "religion"
  | "birthPlace"
  | "homeAddress"
  | "presentAddress"
  | "phone"
  | "email"
  | "facebook"
  | "college"
  | "degree"
  | "degreeLevel"
  | "dateGraduated"
  | "campus"
  | "msuId"
  | "employmentStatus"
  | "employer"
  | "sector"
  | "position"
  | "workplaceAddress"
  | "workLocation"
  | "lengthOfEmployment"
  | "yearsInOffice"
  | "orgName"
  | "orgPosition"
  | "orgAddress"
  | "orgContact"
  | "orgEmail"
  | "orgMemberSince"
  | "fullName"
  | "age"
  | "akanEmail"
  | "major"
  | "schoolAddress"
  | "batchYear"
  | "orgInvolvement"
  | "presentCountry"
  | "presentProvince"
  | "presentCity"
  | "presentBarangay"
  | "presentStreet"
  | "presentBlock"
  | "presentHouseNo"
  | "presentZip"
  | "homeCountry"
  | "homeProvince"
  | "homeCity"
  | "homeBarangay"
  | "homeStreet"
  | "homeBlock"
  | "homeHouseNo"
  | "homeZip"
  | "latitude"
  | "longitude";

/**
 * Header aliases are normalized before matching, so punctuation, casing, and
 * spacing differences do not matter. The first alias list entry is only a
 * label; every alias is matched.
 */
const HEADER_ALIASES: Record<FieldKey, string[]> = {
  lastName: ["Last Name", "last_name", "Surname", "Family Name"],
  firstName: ["First Name", "first_name", "Given Name"],
  middleName: ["Middle Name", "middle_name", "Middle Initial", "MI"],
  fullName: ["Full Name", "full_name", "Name"],
  gender: ["Gender", "gender", "Sex"],
  birthDate: [
    "Birth Date",
    "date_of_birth",
    "birthday",
    "Birthdate",
    "Birthday",
    "Date of Birth",
    "DOB",
  ],
  age: ["Age", "age"],
  ethnicity: ["Ethnicity", "ethnicity", "tribe", "Tribe", "Ethnicity / Tribe", "Ethnic Group"],
  religion: ["Religion", "religious_affiliation", "religion", "Religious Affiliation", "Faith"],
  birthPlace: ["Birth Place", "place_of_birth", "Birthplace", "Place of Birth"],
  homeAddress: ["Home Address", "Permanent Address", "Permanent Home Address"],
  presentAddress: ["Present Address", "Current Address", "Address"],
  phone: [
    "Contact Number",
    "mobile_number",
    "phone",
    "contact_number",
    "Active Mobile Number",
    "Phone",
    "Phone Number",
    "Mobile Number",
    "Mobile",
    "Contact No",
  ],
  email: [
    "Email Address",
    "email",
    "active_email",
    "Active Email Address",
    "Email",
    "E-mail",
    "Account Email",
  ],
  akanEmail: ["akan_email", "Akan Email Address", "Akan Email"],
  facebook: [
    "Facebook Link",
    "facebook",
    "facebook_account",
    "Facebook Account",
    "FB Link",
    "Facebook URL",
  ],
  college: [
    "College",
    "college",
    "name_of_college",
    "Name of College",
    "College / School",
    "College Graduated",
  ],
  degree: [
    "Degree/Course taken",
    "course",
    "degree",
    "Degree",
    "Course",
    "Degree / Course",
    "Program",
    "Course Taken",
  ],
  degreeLevel: ["degree_level", "Degree Level", "Education Level", "Level of Education"],
  major: ["major", "Major", "Field of Study"],
  dateGraduated: [
    "date_graduated",
    "Date Graduated",
    "Graduation Date",
    "Year Graduated",
    "Graduated On",
    "Date of Graduation",
  ],
  batchYear: ["batch_year", "Batch Year", "Batch"],
  campus: [
    "university",
    "school_attended",
    "University / School Attended",
    "Campus Graduated",
    "Campus",
    "Campus Address",
    "School",
  ],
  schoolAddress: [
    "university_address",
    "school_address",
    "University / School Address",
    "School Address",
  ],
  msuId: [
    "school_id",
    "student_id",
    "MSU ID No.",
    "MSU ID",
    "MSU ID Number",
    "School ID No.",
    "Student ID",
    "ID Number",
  ],
  employmentStatus: ["employment_status", "Employment Status", "Job Status", "Employment"],
  employer: [
    "present_company",
    "company_name",
    "Present Company / Agency Name",
    "Employer",
    "Company",
    "Employer / Company",
    "Employer Name",
    "Company Name",
  ],
  sector: [
    "employment_sector",
    "present_employment_sector",
    "Present Employment Sector",
    "Sector",
    "Industry",
    "Employment Sector",
    "Type of Employer",
  ],
  position: [
    "present_position",
    "job_title",
    "Present Position / Job",
    "Position",
    "Job Title",
    "Designation",
    "Work Position",
  ],
  workplaceAddress: [
    "company_address",
    "Company Address",
    "Workplace Address",
    "Employment and Business Address",
    "Business Address",
    "Office Address",
  ],
  workLocation: [
    "location_of_employment",
    "employment_location",
    "Location of Employment",
    "Work Location",
    "Local / Abroad",
    "Location of Work",
  ],
  lengthOfEmployment: ["length_of_employment", "Length of Employment", "Employment Length"],
  yearsInOffice: [
    "years_assumed",
    "Years Assumed in Current Office / Agency",
    "Years in Office",
    "Years in Position",
    "Years of Service",
  ],
  orgInvolvement: ["organization_involvement", "Organization Involvement"],
  orgName: [
    "organization_name",
    "group_organization_name",
    "Group / Organization Name",
    "Organization",
    "Organization Name",
    "Organization Affiliation",
    "Affiliation",
    "Org Name",
  ],
  orgPosition: [
    "organization_position",
    "Organization Position",
    "Position in Organization",
    "Org Position",
    "Organization Role",
  ],
  orgAddress: [
    "group_organization_address",
    "Group / Organization Address",
    "Organization Address",
    "Org Address",
  ],
  orgContact: [
    "organization_contact",
    "Organization Contact",
    "Organization Contact No.",
    "Org Contact",
    "Org Contact No.",
    "Organization Phone",
  ],
  orgEmail: ["organization_email", "Organization Email", "Organization Email Address", "Org Email"],
  orgMemberSince: [
    "membership_since",
    "Membership Since",
    "Member Since",
    "Organization Member Since",
    "Date Joined",
    "Membership Date",
  ],
  presentCountry: ["present_country", "current_country", "Current Country", "Present Country"],
  presentProvince: [
    "present_province",
    "current_province",
    "Current Province / State / Region",
    "Present Province / State / Region",
  ],
  presentCity: [
    "present_city",
    "current_city",
    "Current City / Municipality",
    "Present City / Municipality",
  ],
  presentBarangay: [
    "present_barangay",
    "current_barangay",
    "Current Subdivision / Barangay",
    "Present Subdivision / Barangay",
  ],
  presentStreet: ["present_street", "current_street", "Current Street", "Present Street"],
  presentBlock: ["present_block", "current_block", "Current Block", "Present Block"],
  presentHouseNo: [
    "present_house_no",
    "current_house_no",
    "Current House No.",
    "Present House No.",
  ],
  presentZip: ["present_zip_code", "current_zip_code", "Current Zip Code", "Present Zip Code"],
  homeCountry: ["home_country", "Home Country"],
  homeProvince: ["home_province", "Home Province / State / Region"],
  homeCity: ["home_city", "Home City / Municipality"],
  homeBarangay: ["home_barangay", "Home Subdivision / Barangay"],
  homeStreet: ["home_street", "Home Street"],
  homeBlock: ["home_block", "Home Block"],
  homeHouseNo: ["home_house_no", "Home House No."],
  homeZip: ["home_zip_code", "Home Zip Code"],
  latitude: ["Latitude", "Lat"],
  longitude: ["Longitude", "Lng", "Long"],
};

const ALIAS_LOOKUP = new Map<string, FieldKey>();
for (const [key, aliases] of Object.entries(HEADER_ALIASES) as Array<[FieldKey, string[]]>) {
  ALIAS_LOOKUP.set(normalizeKey(key), key);
  for (const alias of aliases) ALIAS_LOOKUP.set(normalizeKey(alias), key);
}

type ParsedAddress = {
  building: string;
  houseNo: string;
  block: string;
  street: string;
  subdivision: string;
  city: string;
  province: string;
  country: string;
  zipCode: string;
};

const EMPTY_ADDRESS: ParsedAddress = {
  building: "",
  houseNo: "",
  block: "",
  street: "",
  subdivision: "",
  city: "",
  province: "",
  country: "",
  zipCode: "",
};

/** Restore the leading zero on 10-digit PH mobile numbers (9722410867 -> 09722410867). */
function normalizeMobile(raw: string | null | undefined): string {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10 && digits.startsWith("9")) return `0${digits}`;
  if (digits.length === 12 && digits.startsWith("63")) return `0${digits.slice(2)}`;
  return digits;
}

/** Fallback for files that only provide a Full Name column. */
function splitFullName(raw: string): { firstName: string; lastName: string } {
  const parts = (raw ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  return { firstName: parts[0] ?? "", lastName: parts[parts.length - 1] ?? "" };
}

type ExistingUserRow = RowDataPacket & {
  id: number;
  role: "alumni" | "admin";
  email: string;
};

export function normalizeKey(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function clamp(value: string | null | undefined, max: number): string {
  return (value ?? "").trim().slice(0, max);
}

function optional(value: string | null | undefined, max: number): string | null {
  const trimmed = clamp(value, max);
  return trimmed === "" ? null : trimmed;
}

function slug(value: string): string {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ".")
      .replace(/^\.+|\.+$/g, "") || "alumni"
  );
}

function detectDelimiter(firstLine: string): string {
  const candidates = [",", ";", "\t"];
  let best = ",";
  let bestCount = 0;

  for (const candidate of candidates) {
    const count = firstLine.split(candidate).length - 1;
    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  }

  return best;
}

/** RFC-4180 style parser with BOM, quoted fields, escaped quotes, and CRLF. */
function parseCsv(text: string): string[][] {
  const clean = text.replace(/^\uFEFF/, "");
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = detectDelimiter(firstLine);

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  for (let index = 0; index < clean.length; index += 1) {
    const char = clean[index];

    if (inQuotes) {
      if (char === '"') {
        if (clean[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      pushField();
    } else if (char === "\r") {
      if (clean[index + 1] === "\n") index += 1;
      pushRow();
    } else if (char === "\n") {
      pushRow();
    } else {
      field += char;
    }
  }

  if (field !== "" || row.length > 0) pushRow();

  return rows.filter((candidate) => candidate.some((cell) => cell.trim() !== ""));
}

function buildHeaderMap(headers: string[]): Map<FieldKey, number> {
  const map = new Map<FieldKey, number>();

  headers.forEach((header, index) => {
    const key = ALIAS_LOOKUP.get(normalizeKey(header));
    if (key && !map.has(key)) map.set(key, index);
  });

  return map;
}

const MONTHS: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function normalizeYear(value: number): number {
  if (value >= 100) return value;
  return value < 50 ? 2000 + value : 1900 + value;
}

function buildIsoDate(year: number, month: number, day: number): string | null {
  if (!Number.isFinite(year) || year < 1 || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return `${year}-${pad(month)}-${pad(day)}`;
}

function monthFromName(value: string): number | null {
  return MONTHS[value.trim().toLowerCase()] ?? null;
}

/** Accepts ISO, DD-MM-YYYY, MM/DD/YYYY, "15 March 2020", and year-only values. */
export function parseCsvDate(raw: string | null | undefined): string | null {
  const value = (raw ?? "").trim().replace(/(\d)(st|nd|rd|th)\b/gi, "$1");
  if (!value) return null;

  let match = /^(\d{4})$/.exec(value);
  if (match) return buildIsoDate(Number(match[1]), 1, 1);

  match = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(value);
  if (match) return buildIsoDate(Number(match[1]), Number(match[2]), Number(match[3]));

  match = /^(\d{4})[-/.](\d{1,2})$/.exec(value);
  if (match) return buildIsoDate(Number(match[1]), Number(match[2]), 1);

  match = /^(\d{1,2})[\s-]+([A-Za-z]+)[\s,-]+(\d{2,4})$/.exec(value);
  if (match) {
    const month = monthFromName(match[2] ?? "");
    if (month) return buildIsoDate(normalizeYear(Number(match[3])), month, Number(match[1]));
  }

  match = /^([A-Za-z]+)[\s-]+(\d{1,2})[\s,-]+(\d{2,4})$/.exec(value);
  if (match) {
    const month = monthFromName(match[1] ?? "");
    if (month) return buildIsoDate(normalizeYear(Number(match[3])), month, Number(match[2]));
  }

  match = /^([A-Za-z]+)[\s-]+(\d{4})$/.exec(value);
  if (match) {
    const month = monthFromName(match[1] ?? "");
    if (month) return buildIsoDate(Number(match[2]), month, 1);
  }

  match = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/.exec(value);
  if (match) {
    const first = Number(match[1]);
    const second = Number(match[2]);
    const year = normalizeYear(Number(match[3]));

    // DD-MM-YYYY is the documented format. Only flip when the day/month
    // position makes the other interpretation the only valid one.
    if (first > 12 && second <= 12) return buildIsoDate(year, second, first);
    if (second > 12 && first <= 12) return buildIsoDate(year, first, second);
    return buildIsoDate(year, second, first);
  }

  return null;
}

function splitAddress(raw: string | null | undefined): ParsedAddress {
  let value = (raw ?? "").trim();
  if (!value) return { ...EMPTY_ADDRESS };

  let zipCode = "";
  const zipMatch = /(?:^|[,\s])(\d{4,5})\s*$/.exec(value);
  if (zipMatch) {
    zipCode = zipMatch[1] ?? "";
    value = value.slice(0, zipMatch.index).replace(/[,\s]+$/, "");
  }

  const parts = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) return { ...EMPTY_ADDRESS, zipCode };
  if (parts.length === 1) return { ...EMPTY_ADDRESS, street: parts[0] ?? "", zipCode };
  if (parts.length === 2) {
    return { ...EMPTY_ADDRESS, street: parts[0] ?? "", city: parts[1] ?? "", zipCode };
  }

  return {
    ...EMPTY_ADDRESS,
    street: parts[0] ?? "",
    subdivision: parts.length >= 4 ? (parts[1] ?? "") : "",
    city: parts[parts.length - 2] ?? "",
    province: parts[parts.length - 1] ?? "",
    zipCode,
  };
}

function bestLocation(
  city: string | null | undefined,
  province: string | null | undefined,
): ResolvedLocation | null {
  return resolveLocation(city, province);
}

function isCityMatch(location: ResolvedLocation | null): boolean {
  return location?.precision === "city";
}

/**
 * Try every comma-separated segment (and its neighbours) until the gazetteer
 * recognizes a city or province. City-level matches win over province centroids
 * so a pin lands on the right municipality whenever possible.
 */
function resolveAddressLocation(raw: string | null | undefined): ResolvedLocation | null {
  const parts = (raw ?? "")
    .split(",")
    .map((part) =>
      part
        .trim()
        .replace(/\b\d{4,5}\b/g, "")
        .trim(),
    )
    .filter(Boolean);

  if (parts.length === 0) return null;

  let best: ResolvedLocation | null = null;

  const consider = (location: ResolvedLocation | null) => {
    if (!location?.matched) return;
    if (!best || (location.precision === "city" && best.precision !== "city")) best = location;
  };

  for (let index = 0; index < parts.length; index += 1) {
    const segment = parts[index] ?? "";
    consider(resolveLocation(segment, parts[index - 1] ?? ""));
    consider(resolveLocation(segment, parts[index + 1] ?? ""));
    consider(resolveLocation(segment, ""));
    if (isCityMatch(best)) break;
  }

  return best;
}

function normalizeGender(raw: string | null | undefined): "Male" | "Female" | "Prefer not to say" {
  const value = normalizeKey(raw);
  if (!value) return "Prefer not to say";
  if (value === "m" || value.startsWith("male") || value === "lalaki") return "Male";
  if (value === "f" || value.startsWith("female") || value === "babae") return "Female";
  return "Prefer not to say";
}

function normalizeEducationLevel(raw: string | null | undefined): EducationLevel {
  const value = normalizeKey(raw);
  if (value.includes("post") || value.includes("doctor") || value.includes("phd")) {
    return "Post Graduate Degree";
  }
  if (value.includes("master") || value.includes("graduate")) return "Graduate Degree";
  return "Baccalaureate Degree";
}

function normalizeSector(raw: string | null | undefined): EmploymentInput["sector"] {
  const value = normalizeKey(raw);
  if (!value) return "";
  if (value.includes("gov")) return "Government";
  if (
    value.includes("free") ||
    value.includes("self") ||
    value.includes("entrepreneur") ||
    value.includes("business")
  ) {
    return "Freelance / Entrepreneurial";
  }
  if (
    value.includes("private") ||
    value.includes("non gov") ||
    value.includes("ngo") ||
    value.includes("non profit") ||
    value.includes("nonprofit")
  ) {
    return "Non-Government / Private Institution";
  }
  return "";
}

function normalizeWorkLocation(raw: string | null | undefined): EmploymentInput["workLocation"] {
  const value = normalizeKey(raw);
  if (!value) return "";
  if (value.includes("abroad") || value.includes("overseas") || value.includes("foreign")) {
    return "Abroad";
  }
  if (value.includes("local") || value.includes("philippines") || value.includes("domestic")) {
    return "Local";
  }
  return "";
}

function normalizeCoordinate(raw: string, max: number): number | null {
  if (!raw.trim()) return null;
  const parsed = Number(raw.trim());
  if (!Number.isFinite(parsed) || Math.abs(parsed) > max) return null;
  return parsed;
}

function resolveEmail(
  raw: string,
  firstName: string,
  lastName: string,
  usedEmails: Set<string>,
): string {
  const provided = raw.trim().toLowerCase();

  if (provided && EMAIL_PATTERN.test(provided)) {
    if (usedEmails.has(provided)) {
      throw new Error(`Duplicate email address "${provided}" in this file.`);
    }
    usedEmails.add(provided);
    return provided.slice(0, 255);
  }

  const base = `${slug(firstName)}.${slug(lastName)}`.slice(0, 200) || "alumni";
  let email = `${base}@alumtrack.local`;
  let suffix = 1;

  while (usedEmails.has(email)) {
    suffix += 1;
    email = `${base}${suffix}@alumtrack.local`;
  }

  usedEmails.add(email);
  return email;
}

async function upsertAddress(
  connection: Connection,
  userId: number,
  kind: "current" | "home",
  address: ParsedAddress,
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
      optional(address.building, 120),
      optional(address.houseNo, 50),
      optional(address.block, 50),
      optional(address.street, 150),
      optional(address.subdivision, 150),
      optional(address.city, 120),
      optional(address.province, 120),
      optional(address.country, 120),
      optional(address.zipCode, 20),
    ],
  );
}

type AddressKeys = {
  country: FieldKey;
  province: FieldKey;
  city: FieldKey;
  barangay: FieldKey;
  street: FieldKey;
  block: FieldKey;
  houseNo: FieldKey;
  zip: FieldKey;
};

const PRESENT_ADDRESS_KEYS: AddressKeys = {
  country: "presentCountry",
  province: "presentProvince",
  city: "presentCity",
  barangay: "presentBarangay",
  street: "presentStreet",
  block: "presentBlock",
  houseNo: "presentHouseNo",
  zip: "presentZip",
};

const HOME_ADDRESS_KEYS: AddressKeys = {
  country: "homeCountry",
  province: "homeProvince",
  city: "homeCity",
  barangay: "homeBarangay",
  street: "homeStreet",
  block: "homeBlock",
  houseNo: "homeHouseNo",
  zip: "homeZip",
};

/** Structured columns win; the composite free-text column is the fallback. */
function structuredAddress(
  get: (key: FieldKey) => string,
  keys: AddressKeys,
  raw: string,
): { address: ParsedAddress; populated: boolean } {
  const base = splitAddress(raw);
  const pick = (key: FieldKey, fallback: string, max: number) => clamp(get(key) || fallback, max);
  return {
    address: {
      ...base,
      houseNo: pick(keys.houseNo, base.houseNo, 50),
      block: pick(keys.block, base.block, 50),
      street: pick(keys.street, base.street, 150),
      subdivision: pick(keys.barangay, base.subdivision, 150),
      city: pick(keys.city, base.city, 120),
      province: pick(keys.province, base.province, 120),
      country: pick(keys.country, base.country, 120),
      zipCode: pick(keys.zip, base.zipCode, 20),
    },
    populated: Object.values(keys).some((key) => get(key).trim() !== ""),
  };
}

async function importRow(
  connection: Connection,
  get: (key: FieldKey) => string,
  admin: AuthUser,
  passwordHash: string,
  usedEmails: Set<string>,
): Promise<"created" | "updated"> {
  const fromFullName = splitFullName(get("fullName"));
  const firstName = clamp(get("firstName") || fromFullName.firstName, 100);
  const lastName = clamp(get("lastName") || fromFullName.lastName, 100);
  if (!firstName || !lastName) {
    throw new Error("First name and last name are required.");
  }

  const middleName = clamp(get("middleName"), 100);
  const displayName = clamp(fullName(firstName, middleName, lastName), 150);

  // Re-import matching: prefer the account email, then the School ID No. so a
  // repeated file updates the same alumnus instead of creating duplicates.
  const schoolId = clamp(get("msuId"), 50);
  const rawEmail = get("email").trim().toLowerCase();
  let existingUser: ExistingUserRow | undefined;
  if (EMAIL_PATTERN.test(rawEmail)) {
    const [rows] = await connection.execute<ExistingUserRow[]>(
      "SELECT id, role, email FROM users WHERE email = ? LIMIT 1",
      [rawEmail],
    );
    existingUser = rows[0];
  }
  if (!existingUser && schoolId) {
    const [rows] = await connection.execute<ExistingUserRow[]>(
      `SELECT u.id, u.role, u.email
         FROM users u
         JOIN alumni_education e ON e.user_id = u.id
        WHERE e.school_id_no = ? LIMIT 1`,
      [schoolId],
    );
    existingUser = rows[0];
  }
  const email = resolveEmail(
    rawEmail || existingUser?.email || "",
    firstName,
    lastName,
    usedEmails,
  );

  // Phase 1 - personal details.
  const birthIso = parseCsvDate(get("birthDate"));
  const birthDate = birthIso ?? "1900-01-01";
  const providedAge = Number.parseInt(get("age"), 10);
  const ageValue =
    Number.isFinite(providedAge) && providedAge > 0
      ? providedAge
      : birthIso
        ? Number(calculateAge(birthIso))
        : Number.NaN;
  const gender = normalizeGender(get("gender"));
  const ethnicity = clamp(get("ethnicity") || "Not provided", 120);
  const birthPlace = clamp(get("birthPlace") || "Not provided", 200);
  const religion = clamp(get("religion") || "Not provided", 120);

  // Phase 2 - address & contact. Structured Present/Home columns take
  // precedence; the composite free-text columns remain a fallback.
  const presentRaw = get("presentAddress");
  const homeRaw = get("homeAddress");
  const presentInfo = structuredAddress(get, PRESENT_ADDRESS_KEYS, presentRaw);
  const homeInfo = structuredAddress(get, HOME_ADDRESS_KEYS, homeRaw || presentRaw);
  const present = presentInfo.address;
  const home = homeInfo.address;
  // STRICT present-address-only geocoding: never fall back to Home Address
  // or workplace.
  const location = resolveAddressLocation(
    presentRaw || [present.city, present.province, present.country].filter(Boolean).join(", "),
  );

  const providedEmail = rawEmail;
  const contactEmail = (EMAIL_PATTERN.test(providedEmail) ? providedEmail : email).slice(0, 255);
  const mobileNumber = normalizeMobile(get("phone")) || "Not provided";
  const facebook = clamp(get("facebook"), 255);
  const akanEmail = clamp(get("akanEmail").toLowerCase(), 255);

  const currentCity = clamp(location?.city || present.city, 120);
  const currentProvince = clamp(present.province, 120);
  const currentRegion = clamp(currentProvince || currentCity || location?.region || "", 120);
  const currentCountry = clamp(present.country || location?.country || "", 120);

  const latitude = normalizeCoordinate(get("latitude"), 90) ?? location?.lat ?? null;
  const longitude = normalizeCoordinate(get("longitude"), 180) ?? location?.lng ?? null;

  // Phase 3 - educational background.
  const degree = clamp(get("degree"), 200);
  const college = clamp(get("college"), 200);
  const campus = clamp(get("campus"), 200);
  const major = clamp(get("major"), 200);
  const schoolAddress = clamp(get("schoolAddress"), 255);
  const batchYear = clamp(get("batchYear"), 20);
  const msuId = clamp(get("msuId"), 50);
  const degreeLevel = normalizeEducationLevel(get("degreeLevel"));
  const graduatedOn = parseCsvDate(get("dateGraduated"));
  const hasEducation = Boolean(
    degree ||
    college ||
    campus ||
    major ||
    schoolAddress ||
    batchYear ||
    msuId ||
    graduatedOn ||
    get("degreeLevel").trim(),
  );

  // Phase 4 - employment. Blank status is inferred from the job columns;
  // "Currently unemployed" never produces an empty employment row.
  const rawStatus = clamp(get("employmentStatus"), 40);
  const statusKey = normalizeKey(rawStatus);
  const explicitlyUnemployed =
    statusKey.includes("unemploy") || statusKey === "no" || statusKey === "none";
  const rawPosition = clamp(get("position"), 200);
  const rawEmployer = clamp(get("employer"), 200);
  const rawWorkplace = clamp(get("workplaceAddress"), 255);
  const rawSector = normalizeSector(get("sector"));
  const rawWorkLocation = normalizeWorkLocation(get("workLocation"));
  const rawLength = clamp(get("lengthOfEmployment"), 100);
  const rawYears = clamp(get("yearsInOffice"), 50);
  const hasEmploymentData = Boolean(
    rawPosition ||
    rawEmployer ||
    rawWorkplace ||
    rawSector ||
    rawWorkLocation ||
    rawLength ||
    rawYears,
  );
  const employmentStatus = explicitlyUnemployed
    ? "unemployed"
    : statusKey.includes("employ") || statusKey === "yes" || hasEmploymentData
      ? "employed"
      : "unemployed";
  const position = explicitlyUnemployed ? "" : rawPosition;
  const employer = explicitlyUnemployed ? "" : rawEmployer;
  const workplaceAddress = explicitlyUnemployed ? "" : rawWorkplace;
  const sector = explicitlyUnemployed ? "" : rawSector;
  const workLocation = explicitlyUnemployed ? "" : rawWorkLocation;
  const lengthOfEmployment = explicitlyUnemployed ? "" : rawLength;
  const yearsInOffice = explicitlyUnemployed ? "" : rawYears;
  const wantsEmployment = employmentStatus === "employed" && hasEmploymentData;

  // Phase 5 - organization affiliation.
  const orgInvolvement = clamp(get("orgInvolvement"), 200);
  const orgName = clamp(get("orgName") || orgInvolvement, 200);
  const orgPosition = clamp(get("orgPosition"), 200);
  const orgAddress = clamp(get("orgAddress"), 255);
  const orgContact = clamp(get("orgContact"), 50);
  const orgEmail = clamp(get("orgEmail").toLowerCase(), 255);
  const orgMemberSince = parseCsvDate(get("orgMemberSince"));

  // Account upsert. Admin accounts are never overwritten by an import.
  let userId: number;
  let created = false;

  if (existingUser) {
    if (existingUser.role !== "alumni") {
      throw new Error(`The email "${email}" belongs to an administrator account.`);
    }
    userId = existingUser.id;
    await connection.execute(
      "UPDATE users SET full_name = ?, password_hash = ?, is_active = 1 WHERE id = ?",
      [displayName, passwordHash, userId],
    );
  } else {
    const [inserted] = await connection.execute<ResultSetHeader>(
      "INSERT INTO users (email, password_hash, role, full_name) VALUES (?, ?, 'alumni', ?)",
      [email, passwordHash, displayName],
    );
    userId = inserted.insertId;
    created = true;
  }

  // Profile upsert. Verification is granted because an administrator is
  // importing the masterlist directly.
  await connection.execute(
    `INSERT INTO alumni_profiles
       (user_id, last_name, first_name, middle_name, gender, birth_date, age, ethnicity,
        birth_place, religion, mobile_number, contact_email, akan_email, facebook, course,
        college, batch_year, employment_status, current_position, current_company,
        current_region, current_city, current_country, latitude, longitude,
        verification_status, verified_at, verified_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
             'verified', UTC_TIMESTAMP(), ?)
     ON DUPLICATE KEY UPDATE
       last_name = VALUES(last_name),
       first_name = VALUES(first_name),
       middle_name = VALUES(middle_name),
       gender = VALUES(gender),
       birth_date = VALUES(birth_date),
       age = VALUES(age),
       ethnicity = VALUES(ethnicity),
       birth_place = VALUES(birth_place),
       religion = VALUES(religion),
       mobile_number = VALUES(mobile_number),
       contact_email = VALUES(contact_email),
       akan_email = VALUES(akan_email),
       facebook = COALESCE(VALUES(facebook), facebook),
       course = VALUES(course),
       college = VALUES(college),
       batch_year = VALUES(batch_year),
       employment_status = VALUES(employment_status),
       current_position = VALUES(current_position),
       current_company = VALUES(current_company),
       current_region = COALESCE(VALUES(current_region), current_region),
       current_city = COALESCE(VALUES(current_city), current_city),
       current_country = COALESCE(VALUES(current_country), current_country),
       latitude = COALESCE(VALUES(latitude), latitude),
       longitude = COALESCE(VALUES(longitude), longitude),
       verification_status = 'verified',
       verified_at = UTC_TIMESTAMP(),
       verified_by = VALUES(verified_by)`,
    [
      userId,
      lastName,
      firstName,
      optional(middleName, 100),
      gender,
      birthDate,
      Number.isFinite(ageValue) && ageValue >= 0 ? ageValue : null,
      ethnicity,
      birthPlace,
      religion,
      mobileNumber,
      contactEmail,
      optional(akanEmail, 255),
      optional(facebook, 255),
      optional(degree, 200),
      optional(college, 200),
      // Batch Year from its own column, else the year of Date Graduated.
      batchYear ? Number(batchYear) : graduatedOn ? Number(graduatedOn.slice(0, 4)) : null,
      employmentStatus,
      optional(position, 200),
      optional(employer, 200),
      optional(currentRegion, 120),
      optional(currentCity, 120),
      optional(currentCountry, 120),
      latitude,
      longitude,
      admin.id,
    ],
  );

  if (presentRaw || presentInfo.populated) {
    await upsertAddress(connection, userId, "current", present);
  }
  if (homeRaw || homeInfo.populated) {
    await upsertAddress(connection, userId, "home", home);
  }

  // Replace the phase records with the CSV values so re-importing the same
  // file is idempotent instead of creating duplicates.
  if (hasEducation) {
    await connection.execute("DELETE FROM alumni_education WHERE user_id = ?", [userId]);
    await connection.execute(
      `INSERT INTO alumni_education
         (user_id, level, school_id_no, degree, major, college, school, school_address, graduated_on)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        degreeLevel,
        optional(msuId, 50),
        clamp(degree || "Not provided", 200),
        optional(major, 200),
        optional(college, 200),
        clamp(campus || "Mindanao State University", 200),
        optional(schoolAddress, 255),
        graduatedOn,
      ],
    );
  }

  if (wantsEmployment) {
    await connection.execute("DELETE FROM alumni_employment WHERE user_id = ?", [userId]);
    await connection.execute(
      `INSERT INTO alumni_employment
         (user_id, is_current, position, company, company_address, length_of_employment,
          years_in_office, work_location, sector)
       VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        optional(position, 200),
        optional(employer, 200),
        optional(workplaceAddress, 255),
        optional(lengthOfEmployment, 100),
        optional(yearsInOffice, 50),
        optional(workLocation, 20),
        optional(sector, 60),
      ],
    );
  } else if (explicitlyUnemployed) {
    await connection.execute("DELETE FROM alumni_employment WHERE user_id = ?", [userId]);
  }

  if (orgName) {
    await connection.execute("DELETE FROM alumni_organizations WHERE user_id = ?", [userId]);
    await connection.execute(
      `INSERT INTO alumni_organizations
         (user_id, name, address, position, contact_no, email, member_since)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        orgName,
        optional(orgAddress, 255),
        optional(orgPosition, 200),
        optional(orgContact, 50),
        optional(orgEmail, 255),
        orgMemberSince,
      ],
    );
  }

  // Keep the denormalized profile fields in sync for search, the admin
  // directory, and the GIS map.
  await syncPrimaryEducation(connection, userId);
  await syncPrimaryEmployment(connection, userId);

  return created ? "created" : "updated";
}

export async function importAlumniCsv(
  csv: string,
  filename?: string,
  meta: ImportChunkMeta = {},
): Promise<AdminImportResult> {
  const admin = await getSessionUser();
  if (!admin || admin.role !== "admin") {
    return {
      ok: false,
      message: "Sign in with an administrator account to import alumni records.",
      errors: [],
    };
  }

  // Bulk import is a write action: viewers are read-only.
  const adminRole = admin.adminRole ?? "standard";
  if (adminRole === "viewer") {
    return {
      ok: false,
      message:
        "Your admin account is read-only. Ask a Head Admin or Standard Admin to import alumni records.",
      errors: [],
    };
  }

  const table = parseCsv(csv);
  if (table.length === 0) {
    return { ok: false, message: "The CSV file is empty.", errors: [] };
  }

  const headerMap = buildHeaderMap(table[0] ?? []);
  if (!headerMap.has("firstName") || !headerMap.has("lastName")) {
    return {
      ok: false,
      message:
        "The CSV must include First Name and Last Name columns. Download the template and keep its headers.",
      errors: [],
    };
  }

  const dataRows = table.slice(1).filter((row) => row.some((cell) => cell.trim() !== ""));

  if (dataRows.length === 0) {
    return { ok: false, message: "The CSV file only contains a header row.", errors: [] };
  }

  if (dataRows.length > MAX_ROWS) {
    return {
      ok: false,
      message:
        "Maximum 1,000 rows allowed per CSV file. Please split larger files into batches of 1,000 rows or fewer.",
      errors: [],
    };
  }

  let passwordHash: string;
  try {
    // Hash the shared default password once for the whole batch.
    passwordHash = await hashPassword(DEFAULT_PASSWORD);
  } catch (error) {
    console.error("[admin-import] Password hashing failed:", error);
    return {
      ok: false,
      message: "The import could not be prepared right now. Please try again.",
      errors: [],
    };
  }

  const pool = getPool();
  const connection = await pool.getConnection();
  const usedEmails = new Set<string>();
  const errors: string[] = [];
  let created = 0;
  let updated = 0;

  try {
    for (let index = 0; index < dataRows.length; index += 1) {
      const row = dataRows[index] ?? [];
      const rowNumber = index + 2;
      const get = (key: FieldKey): string => {
        const column = headerMap.get(key);
        if (column === undefined) return "";
        return (row[column] ?? "").trim();
      };

      try {
        await connection.beginTransaction();
        const result = await importRow(connection, get, admin, passwordHash, usedEmails);
        await connection.commit();
        if (result === "created") created += 1;
        else updated += 1;
      } catch (error) {
        await connection.rollback();
        const reason = error instanceof Error ? error.message : "Unknown error";
        errors.push(`Row ${rowNumber}: ${reason}`);
      }
    }

    // A chunked upload sends many requests for one file. Only the final chunk
    // writes the activity entry and the "Imported CSV files" history row, using
    // the client-supplied totals so a 300-row file produces one accurate entry.
    const shouldLogImport = meta.isLastChunk !== false;
    const historyTotalRows = meta.totalFileRows ?? dataRows.length;
    // `totalCreated`/`totalUpdated` carry the counts from earlier chunks; add
    // this chunk's counts so the final entry reflects the entire file.
    const historyCreated = (meta.totalCreated ?? 0) + created;
    const historyUpdated = (meta.totalUpdated ?? 0) + updated;

    if (shouldLogImport && historyCreated + historyUpdated > 0) {
      await pool.execute(
        `INSERT INTO activity_log (actor_user_id, actor_name, action, entity_type, entity_id)
         VALUES (?, ?, ?, 'admin', NULL)`,
        [
          admin.id,
          admin.fullName ?? admin.email,
          `Imported CSV - ${historyCreated} new, ${historyUpdated} updated`,
        ],
      );
      try {
        await ensureImportHistoryTable();
        await pool.execute(
          `INSERT INTO alumni_imports (filename, total_rows, created_rows, updated_rows, created_by)
           VALUES (?, ?, ?, ?, ?)`,
          [
            (filename ?? "").trim().slice(0, 255) || "CSV import",
            historyTotalRows,
            historyCreated,
            historyUpdated,
            admin.id,
          ],
        );
      } catch (historyError) {
        // History must never block a successful import.
        console.error("[admin-import] History insert failed:", historyError);
      }
    }
  } catch (error) {
    console.error("[admin-import] Import failed:", error);
    return {
      ok: false,
      message: "The import could not be completed right now. Please try again.",
      errors,
    };
  } finally {
    connection.release();
  }

  const processed = created + updated;
  if (processed === 0) {
    return {
      ok: false,
      message: "No rows were imported. Review the errors below and try again.",
      errors,
    };
  }

  const skipped = dataRows.length - processed;
  const message =
    `Imported ${processed} of ${dataRows.length} row${dataRows.length === 1 ? "" : "s"}: ` +
    `${created} new, ${updated} updated${skipped > 0 ? `, ${skipped} skipped` : ""}.`;

  return {
    ok: true,
    message,
    created,
    updated,
    totalRows: dataRows.length,
    errors,
  };
}
