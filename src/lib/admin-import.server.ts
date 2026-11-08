import type { Connection, ResultSetHeader, RowDataPacket } from "mysql2/promise";

import type { AdminImportResult } from "./admin.types";
import { getSessionUser, hashPassword, type AuthUser } from "./auth.server";
import { getPool } from "./db.server";
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
const MAX_ROWS = 5000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  | "latitude"
  | "longitude";

/**
 * Header aliases are normalized before matching, so punctuation, casing, and
 * spacing differences do not matter. The first alias list entry is only a
 * label; every alias is matched.
 */
const HEADER_ALIASES: Record<FieldKey, string[]> = {
  lastName: ["Last Name", "Surname", "Family Name"],
  firstName: ["First Name", "Given Name"],
  middleName: ["Middle Name", "Middle Initial", "MI"],
  gender: ["Gender", "Sex"],
  birthDate: ["Birth Date", "Birthdate", "Birthday", "Date of Birth", "DOB"],
  ethnicity: ["Ethnicity", "Tribe", "Ethnicity / Tribe", "Ethnic Group"],
  religion: ["Religion", "Religious Affiliation", "Faith"],
  birthPlace: ["Birth Place", "Birthplace", "Place of Birth"],
  homeAddress: ["Home Address", "Permanent Address", "Permanent Home Address"],
  presentAddress: ["Present Address", "Current Address", "Address"],
  phone: ["Contact Number", "Phone", "Phone Number", "Mobile Number", "Mobile", "Contact No"],
  email: ["Email Address", "Email", "E-mail", "Account Email"],
  facebook: ["Facebook Link", "Facebook", "FB Link", "Facebook URL", "Facebook Account"],
  college: ["College", "College / School", "College Graduated"],
  degree: ["Degree/Course taken", "Degree / Course", "Course", "Degree", "Program", "Course Taken"],
  degreeLevel: ["Degree Level", "Education Level", "Level of Education"],
  dateGraduated: [
    "Date Graduated",
    "Graduation Date",
    "Year Graduated",
    "Graduated On",
    "Date of Graduation",
  ],
  campus: ["Campus Graduated", "Campus", "Campus Address", "School", "School Address"],
  msuId: ["MSU ID No.", "MSU ID", "MSU ID Number", "School ID No.", "Student ID", "ID Number"],
  employmentStatus: ["Employment Status", "Job Status", "Employment"],
  employer: ["Employer", "Company", "Employer / Company", "Employer Name", "Company Name"],
  sector: ["Sector", "Industry", "Employment Sector", "Type of Employer"],
  position: ["Position", "Job Title", "Designation", "Work Position"],
  workplaceAddress: [
    "Workplace Address",
    "Employment and Business Address",
    "Company Address",
    "Business Address",
    "Office Address",
  ],
  workLocation: ["Work Location", "Local / Abroad", "Location of Work"],
  lengthOfEmployment: ["Length of Employment", "Employment Length"],
  yearsInOffice: ["Years in Office", "Years in Position", "Years of Service"],
  orgName: [
    "Organization",
    "Organization Name",
    "Organization Affiliation",
    "Affiliation",
    "Org Name",
  ],
  orgPosition: [
    "Organization Position",
    "Position in Organization",
    "Org Position",
    "Organization Role",
  ],
  orgAddress: ["Organization Address", "Org Address"],
  orgContact: [
    "Organization Contact",
    "Organization Contact No.",
    "Org Contact",
    "Org Contact No.",
    "Organization Phone",
  ],
  orgEmail: ["Organization Email", "Org Email"],
  orgMemberSince: ["Member Since", "Organization Member Since", "Date Joined", "Membership Date"],
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
  zipCode: "",
};

type ExistingUserRow = RowDataPacket & {
  id: number;
  role: "alumni" | "admin";
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
       (user_id, kind, building, house_no, block, street, subdivision, city, province, zip_code)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       building = VALUES(building),
       house_no = VALUES(house_no),
       block = VALUES(block),
       street = VALUES(street),
       subdivision = VALUES(subdivision),
       city = VALUES(city),
       province = VALUES(province),
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
      optional(address.zipCode, 20),
    ],
  );
}

async function importRow(
  connection: Connection,
  get: (key: FieldKey) => string,
  admin: AuthUser,
  passwordHash: string,
  usedEmails: Set<string>,
): Promise<"created" | "updated"> {
  const firstName = clamp(get("firstName"), 100);
  const lastName = clamp(get("lastName"), 100);
  if (!firstName || !lastName) {
    throw new Error("First name and last name are required.");
  }

  const middleName = clamp(get("middleName"), 100);
  const displayName = clamp(fullName(firstName, middleName, lastName), 150);
  const email = resolveEmail(get("email"), firstName, lastName, usedEmails);

  // Phase 1 — personal details.
  const birthIso = parseCsvDate(get("birthDate"));
  const birthDate = birthIso ?? "1900-01-01";
  const ageValue = birthIso ? Number(calculateAge(birthIso)) : Number.NaN;
  const gender = normalizeGender(get("gender"));
  const ethnicity = clamp(get("ethnicity") || "Not provided", 120);
  const birthPlace = clamp(get("birthPlace") || "Not provided", 200);
  const religion = clamp(get("religion") || "Not provided", 120);

  // Phase 2 — address & contact.
  const presentRaw = get("presentAddress");
  const homeRaw = get("homeAddress");
  const present = splitAddress(presentRaw);
  const home = splitAddress(homeRaw || presentRaw);
  const location =
    resolveAddressLocation(presentRaw) ??
    resolveAddressLocation(homeRaw) ??
    resolveAddressLocation(get("workplaceAddress")) ??
    bestLocation(present.city || presentRaw, present.province);

  const providedEmail = get("email").trim().toLowerCase();
  const contactEmail = (EMAIL_PATTERN.test(providedEmail) ? providedEmail : email).slice(0, 255);
  const mobileNumber = clamp(get("phone") || "Not provided", 30);
  const facebook = clamp(get("facebook"), 255);

  const currentCity = clamp(location?.city || present.city, 120);
  const currentProvince = clamp(present.province, 120);
  const currentRegion = clamp(currentProvince || currentCity || location?.region || "", 120);
  const currentCountry = clamp(location?.country ?? "", 120);

  const latitude = normalizeCoordinate(get("latitude"), 90) ?? location?.lat ?? null;
  const longitude = normalizeCoordinate(get("longitude"), 180) ?? location?.lng ?? null;

  // Phase 3 — educational background.
  const degree = clamp(get("degree"), 200);
  const college = clamp(get("college"), 200);
  const campus = clamp(get("campus"), 200);
  const msuId = clamp(get("msuId"), 50);
  const degreeLevel = normalizeEducationLevel(get("degreeLevel"));
  const graduatedOn = parseCsvDate(get("dateGraduated"));
  const hasEducation = Boolean(
    degree || college || campus || msuId || graduatedOn || get("degreeLevel").trim(),
  );

  // Phase 4 — employment.
  const position = clamp(get("position"), 200);
  const employer = clamp(get("employer"), 200);
  const workplaceAddress = clamp(get("workplaceAddress"), 255);
  const sector = normalizeSector(get("sector"));
  const workLocation = normalizeWorkLocation(get("workLocation"));
  const lengthOfEmployment = clamp(get("lengthOfEmployment"), 100);
  const yearsInOffice = clamp(get("yearsInOffice"), 50);
  const rawStatus = clamp(get("employmentStatus"), 40);
  const statusKey = normalizeKey(rawStatus);
  const hasEmploymentData = Boolean(
    position ||
    employer ||
    workplaceAddress ||
    sector ||
    workLocation ||
    lengthOfEmployment ||
    yearsInOffice,
  );
  const explicitlyUnemployed =
    statusKey.includes("unemploy") || statusKey === "no" || statusKey === "none";
  const employmentStatus = explicitlyUnemployed
    ? "unemployed"
    : statusKey.includes("employ") || statusKey === "yes" || hasEmploymentData
      ? "employed"
      : "unemployed";
  const wantsEmployment = employmentStatus === "employed" || hasEmploymentData;

  // Phase 5 — organization affiliation.
  const orgName = clamp(get("orgName"), 200);
  const orgPosition = clamp(get("orgPosition"), 200);
  const orgAddress = clamp(get("orgAddress"), 255);
  const orgContact = clamp(get("orgContact"), 50);
  const orgEmail = clamp(get("orgEmail").toLowerCase(), 255);
  const orgMemberSince = parseCsvDate(get("orgMemberSince"));

  // Account upsert. Admin accounts are never overwritten by an import.
  const [existingUsers] = await connection.execute<ExistingUserRow[]>(
    "SELECT id, role FROM users WHERE email = ? LIMIT 1",
    [email],
  );
  const existingUser = existingUsers[0];
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
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
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
      optional(facebook, 255),
      optional(degree, 200),
      optional(college, 200),
      // Batch Year auto-sync: year of Date Graduated (priority degree in CSV).
      graduatedOn ? Number(graduatedOn.slice(0, 4)) : null,
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

  if (presentRaw) await upsertAddress(connection, userId, "current", present);
  if (homeRaw) await upsertAddress(connection, userId, "home", home);

  // Replace the phase records with the CSV values so re-importing the same
  // file is idempotent instead of creating duplicates.
  if (hasEducation) {
    await connection.execute("DELETE FROM alumni_education WHERE user_id = ?", [userId]);
    await connection.execute(
      `INSERT INTO alumni_education
         (user_id, level, school_id_no, degree, major, college, school, school_address, graduated_on)
       VALUES (?, ?, ?, ?, NULL, ?, ?, NULL, ?)`,
      [
        userId,
        degreeLevel,
        optional(msuId, 50),
        clamp(degree || "Not provided", 200),
        optional(college, 200),
        clamp(campus || "Mindanao State University", 200),
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

export async function importAlumniCsv(csv: string): Promise<AdminImportResult> {
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

  const dataRows = table
    .slice(1)
    .filter((row) => row.some((cell) => cell.trim() !== ""))
    .slice(0, MAX_ROWS);

  if (dataRows.length === 0) {
    return { ok: false, message: "The CSV file only contains a header row.", errors: [] };
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

    if (created + updated > 0) {
      await pool.execute(
        `INSERT INTO activity_log (actor_user_id, actor_name, action, entity_type, entity_id)
         VALUES (?, ?, ?, 'admin', NULL)`,
        [
          admin.id,
          admin.fullName ?? admin.email,
          `Imported CSV — ${created} new, ${updated} updated`,
        ],
      );
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
