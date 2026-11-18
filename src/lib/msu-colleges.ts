/**
 * Single source of truth for the 14 MSU-Main Campus colleges and their
 * undergraduate degree/course offerings. Used by registration, profile and
 * admin forms, map/search/report filters, and the cascading combobox.
 */
export type MSUCollege = {
  code: string;
  name: string;
  label: string;
  courses: string[];
};

function college(code: string, name: string, courses: string[]): MSUCollege {
  return { code, name, label: `${name} (${code})`, courses };
}

export const MSU_COLLEGES: readonly MSUCollege[] = [
  college("COA", "College of Agriculture", ["BS Agriculture", "BS Agribusiness Management"]),
  college("CBAA", "College of Business Administration and Accountancy", [
    "BS Accountancy",
    "BS Business Administration (BSBA)",
  ]),
  college("CED", "College of Education", [
    "Bachelor of Elementary Education (BEEd)",
    "Bachelor of Early Childhood Education (BECEd)",
    "Bachelor of Secondary Education (BSEd)",
    "Bachelor of Technology and Livelihood Education (BTLEd)",
    "Bachelor of Technical-Vocational Teacher Education (BTVTEd)",
  ]),
  college("COE", "College of Engineering", [
    "BS Civil Engineering",
    "BS Chemical Engineering",
    "BS Electrical Engineering",
    "BS Electronics Engineering",
    "BS Mechanical Engineering",
    "BS Agricultural and Biosystems Engineering",
    "BS Engineering Technology",
  ]),
  college("CFAS", "College of Fisheries and Aquatic Sciences", ["BS Fisheries"]),
  college("CFES", "College of Forestry and Environmental Studies", [
    "BS Forestry",
    "BS Environmental Science",
  ]),
  college("CHS", "College of Health Sciences", ["BS Nursing", "BS Midwifery", "BS Pharmacy"]),
  college("CHTM", "College of Hospitality and Tourism Management", [
    "BS Hospitality Management",
    "BS Tourism Management",
  ]),
  college("CICS", "College of Information and Computing Sciences", [
    "BS Information Technology",
    "BS Information Systems",
    "BS Computer Science",
  ]),
  college("KFCIAAS", "King Faisal Center for Islamic, Arabic and Asian Studies", [
    "BS International Relations",
    "AB Islamic Studies",
    "BS Teaching Arabic",
  ]),
  college("CNSM", "College of Natural Sciences and Mathematics", [
    "BS Biology",
    "BS Chemistry",
    "BS Mathematics",
    "BS Physics",
    "BS Statistics",
  ]),
  college("CPA", "College of Public Affairs", [
    "BS Social Work",
    "BS Sustainable Development",
    "Bachelor of Public Administration",
  ]),
  college("CSSH", "College of Social Sciences and Humanities", [
    "AB History",
    "AB Political Science",
    "AB English",
    "AB Filipino",
    "AB Sociology",
    "BS Psychology",
    "BS Library and Information Science",
  ]),
  college("CSPEAR", "College of Sports, Physical Education and Recreation", [
    "BS Physical Education",
  ]),
];

/** Normalize legacy values (case, spacing, and trailing codes such as `(CICS)`). */
export function normalizeText(value: string): string {
  return value
    .trim()
    .replace(/\s*\([^)]*\)\s*$/, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export const COLLEGE_OPTIONS: string[] = MSU_COLLEGES.map((item) => item.label);
export const COURSE_OPTIONS: string[] = Array.from(
  new Set(MSU_COLLEGES.flatMap((item) => item.courses)),
);

export function resolveCollege(value: string): MSUCollege | undefined {
  const target = normalizeText(value);
  if (!target) return undefined;
  return MSU_COLLEGES.find(
    (item) =>
      normalizeText(item.name) === target ||
      normalizeText(item.label) === target ||
      item.code.toLowerCase() === target ||
      normalizeText(item.code) === target,
  );
}

/** Canonical college label (with code), or the trimmed legacy value if unmatched. */
export function canonicalCollege(value: string): string {
  return resolveCollege(value)?.label ?? value.trim();
}

export function coursesForCollege(value: string): string[] {
  return resolveCollege(value)?.courses ?? [];
}

export function collegeForCourse(value: string): string | undefined {
  const target = normalizeText(value);
  if (!target) return undefined;
  return MSU_COLLEGES.find((item) =>
    item.courses.some((course) => normalizeText(course) === target),
  )?.label;
}

/** Canonical course label, or the trimmed legacy value if unmatched. */
export function canonicalCourse(value: string): string {
  const target = normalizeText(value);
  if (!target) return "";
  const match = COURSE_OPTIONS.find((course) => normalizeText(course) === target);
  return match ?? value.trim();
}

export function sameCollege(a: string, b: string): boolean {
  if (!a || !b) return false;
  const left = resolveCollege(a)?.name ?? a;
  const right = resolveCollege(b)?.name ?? b;
  return normalizeText(left) === normalizeText(right);
}

export function sameCourse(a: string, b: string): boolean {
  if (!a || !b) return false;
  return normalizeText(a) === normalizeText(b);
}
