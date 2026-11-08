/**
 * Degree types in display order: Baccalaureate first (primary / default),
 * then Graduate, then Post Graduate. This order drives the Phase 3
 * checkboxes in Registration and the Add/Edit Alumni modals, and the
 * Batch Year / Course / College priority (see helpers below).
 */
export const EDUCATION_LEVELS = [
  "Baccalaureate Degree",
  "Graduate Degree",
  "Post Graduate Degree",
] as const;

export type EducationLevel = (typeof EDUCATION_LEVELS)[number];

/** Year component (`YYYY`) of a graduation date, or "" when missing/invalid.
 * Accepts both `YYYY-MM-DD` (form inputs) and `DD-MM-YYYY` (`formatDate` output). */
export function yearFromGraduatedOn(graduatedOn: string | null | undefined): string {
  const trimmed = (graduatedOn ?? "").trim();
  const iso = /^(\d{4})-/.exec(trimmed);
  if (iso?.[1]) return iso[1];
  const display = /^\d{2}-\d{2}-(\d{4})$/.exec(trimmed);
  return display?.[1] ?? "";
}

/**
 * Batch Year priority: Baccalaureate graduation year first, then Graduate,
 * then Post Graduate. Used for auto-sync in the forms (client) and for the
 * stored `batch_year` (server) so Directory / Search / Reports all agree.
 */
export function priorityBatchYear(
  education: ReadonlyArray<{ level: string; graduatedOn?: string | null }>,
): string {
  for (const level of EDUCATION_LEVELS) {
    const record = education.find((entry) => entry.level === level);
    const year = yearFromGraduatedOn(record?.graduatedOn);
    if (year) return year;
  }
  return "";
}

/**
 * Primary degree record for Course/College sync: Baccalaureate first, then
 * Graduate, then Post Graduate. Falls back to the first record when none of
 * the known levels match (legacy data).
 */
export function primaryEducationRecord<T extends { level: string }>(
  education: ReadonlyArray<T>,
): T | undefined {
  for (const level of EDUCATION_LEVELS) {
    const record = education.find((entry) => entry.level === level);
    if (record) return record;
  }
  return education[0];
}

export type AddressInput = {
  building: string;
  houseNo: string;
  block: string;
  street: string;
  /** Subdivision / Barangay. */
  subdivision: string;
  city: string;
  /** Province / State / Region. */
  province: string;
  country: string;
  zipCode: string;
  /** Map coordinates taken from the selected city (current address only). */
  latitude?: number | null;
  longitude?: number | null;
};

export type EducationInput = {
  level: EducationLevel;
  schoolIdNo: string;
  degree: string;
  major: string;
  college: string;
  school: string;
  schoolAddress: string;
  graduatedOn: string;
};

export type EmploymentInput = {
  position: string;
  company: string;
  companyAddress: string;
  lengthOfEmployment: string;
  yearsInOffice: string;
  workLocation: "Local" | "Abroad" | "";
  sector:
    "Government" | "Non-Government / Private Institution" | "Freelance / Entrepreneurial" | "";
};

export type OrganizationInput = {
  name: string;
  address: string;
  position: string;
  contactNo: string;
  email: string;
  memberSince: string;
};

export type RegistrationInput = {
  firstName: string;
  middleName: string;
  lastName: string;
  gender: "Male" | "Female" | "Prefer not to say";
  birthDate: string;
  ethnicity: string;
  birthPlace: string;
  religion: string;
  accountEmail: string;
  password: string;
  sameAddress: boolean;
  currentAddress: AddressInput;
  homeAddress: AddressInput;
  mobileNumber: string;
  contactEmail: string;
  akanEmail: string;
  facebook: string;
  education: EducationInput[];
  employmentStatus: "employed" | "unemployed" | "unknown";
  employment: EmploymentInput | null;
  organization: OrganizationInput | null;
};

export type RegistrationResult =
  { ok: true; message: string } | { ok: false; message: string; field?: string };
