export type RegionPoint = {
  region: string;
  short: string;
  count: number;
  /** Percentage coordinates on the stylized map canvas. */
  x: number;
  y: number;
};

/** Aggregate-only clusters — no individual names or addresses. */
export const REGION_CLUSTERS: RegionPoint[] = [
  { region: "BARMM", short: "BARMM", count: 1478, x: 48, y: 74 },
  { region: "Region X — Northern Mindanao", short: "R-X", count: 902, x: 58, y: 66 },
  { region: "Region XI — Davao", short: "R-XI", count: 388, x: 68, y: 79 },
  { region: "Region XII — SOCCSKSARGEN", short: "R-XII", count: 431, x: 56, y: 85 },
  { region: "Region VII — Central Visayas", short: "R-VII", count: 297, x: 52, y: 52 },
  { region: "NCR — Metro Manila", short: "NCR", count: 651, x: 34, y: 30 },
  { region: "Region III — Central Luzon", short: "R-III", count: 214, x: 30, y: 21 },
];

export const OVERSEAS_CLUSTERS: RegionPoint[] = [
  { region: "Saudi Arabia", short: "KSA", count: 214, x: 18, y: 38 },
  { region: "United Arab Emirates", short: "UAE", count: 168, x: 26, y: 45 },
  { region: "Qatar", short: "QAT", count: 71, x: 22, y: 56 },
  { region: "Malaysia", short: "MYS", count: 44, x: 74, y: 62 },
  { region: "Canada / USA", short: "N.AM", count: 36, x: 82, y: 26 },
];

export const PUBLIC_STATS = [
  { label: "Total traced alumni", value: "12,480", note: "Across 52 batch years" },
  { label: "Employment rate", value: "78.5%", note: "Employed within 12 months" },
  { label: "Working overseas", value: "533", note: "8 host countries" },
  { label: "Degree-aligned jobs", value: "71%", note: "Job matches course taken" },
];

export const TOP_INDUSTRIES = [
  { label: "Government & Public Service", value: 28 },
  { label: "Information Technology & BPO", value: 22 },
  { label: "Education & Academe", value: 18 },
  { label: "Health & Medical Services", value: 16 },
  { label: "Engineering & Construction", value: 10 },
  { label: "Banking & Finance", value: 6 },
];

export const EMPLOYMENT_BY_COLLEGE = [
  { label: "Information & Computing Sciences", value: 88 },
  { label: "Engineering", value: 82 },
  { label: "Business Administration", value: 76 },
  { label: "Health Sciences", value: 91 },
  { label: "Education", value: 74 },
];

export const TIME_TO_FIRST_JOB = [
  { label: "Less than 3 months", value: 34 },
  { label: "3 – 6 months", value: 28 },
  { label: "6 – 12 months", value: 21 },
  { label: "More than 1 year", value: 17 },
];

export const SECTOR_SPLIT = [
  { label: "Government", value: 34 },
  { label: "Private", value: 41 },
  { label: "Self-Employed", value: 15 },
  { label: "NGO", value: 10 },
];

/** Workplace pins visible only to signed-in alumni who opted in. */
export const WORKPLACE_PINS = [
  { name: "Naimah T. A.", role: "Software Engineer", place: "Accenture · Taguig", x: 34, y: 30 },
  { name: "Abdul R. M.", role: "Project Engineer", place: "DPWH · Cagayan de Oro", x: 58, y: 66 },
  { name: "Norhaimah Y. D.", role: "IT Support", place: "LGU · Marawi City", x: 48, y: 74 },
  { name: "Jasmin P. L.", role: "Junior Auditor", place: "SGV & Co. · Davao", x: 68, y: 79 },
  { name: "Farhana A. S.", role: "Registered Nurse", place: "Riyadh, KSA", x: 12, y: 44 },
];

export const NEARBY_ALUMNI = [
  { name: "Sittie Asmerah F. A.", course: "BS Computer Science", batch: "2022", place: "Globe Telecom · BGC", km: "2.1 km" },
  { name: "Omar H. Pangandaman", course: "BS Information Technology", batch: "2021", place: "Concentrix · Ortigas", km: "6.4 km" },
  { name: "Rania K. Bantuas", course: "BS Accountancy", batch: "2020", place: "BDO Unibank · Makati", km: "7.8 km" },
];

export const LOGIN_ACTIVITY = [
  { region: "BARMM", sessions: 142, x: 48, y: 74 },
  { region: "Region X — Northern Mindanao", sessions: 96, x: 58, y: 66 },
  { region: "NCR — Metro Manila", sessions: 118, x: 34, y: 30 },
  { region: "Region XI — Davao", sessions: 54, x: 68, y: 79 },
  { region: "Overseas", sessions: 37, x: 14, y: 44 },
];

/* ---------- Standard reports required by OARCC ---------- */

export const GRADUATES_PER_YEAR = [
  { label: "2026 — Undergraduate", value: 1420 },
  { label: "2026 — Masteral", value: 186 },
  { label: "2025 — Undergraduate", value: 1365 },
  { label: "2025 — Masteral", value: 174 },
  { label: "2024 — Undergraduate", value: 1298 },
  { label: "2024 — Masteral", value: 151 },
];

export const GRADUATES_PER_COURSE = [
  { label: "BS Information Technology", value: 512 },
  { label: "BS Civil Engineering", value: 468 },
  { label: "BS Accountancy", value: 401 },
  { label: "BS Nursing", value: 366 },
  { label: "BS Education", value: 342 },
];

export const GRADUATES_PER_COLLEGE = [
  { label: "Information & Computing Sciences", value: 894 },
  { label: "Engineering", value: 812 },
  { label: "Business Administration", value: 706 },
  { label: "Health Sciences", value: 588 },
  { label: "Education", value: 640 },
];

export const TRIBAL_SPLIT = [
  { label: "Muslim graduates", value: 62 },
  { label: "Non-Muslim graduates", value: 38 },
];

export const GRADUATES_BY_PROVINCE = [
  { label: "Lanao del Sur", value: 1842 },
  { label: "Lanao del Norte", value: 966 },
  { label: "Maguindanao", value: 612 },
  { label: "Misamis Oriental", value: 498 },
  { label: "Cotabato", value: 377 },
];

export const GRADUATES_BY_GENDER = [
  { label: "Female", value: 57 },
  { label: "Male", value: 43 },
];

export const GROUP_AFFILIATIONS = [
  { label: "Secular organizations", value: 64 },
  { label: "Non-secular organizations", value: 36 },
];

export const EMPLOYMENT_BY_COUNTRY = [
  { label: "Saudi Arabia", value: 214 },
  { label: "United Arab Emirates", value: 168 },
  { label: "Qatar", value: 71 },
  { label: "Malaysia", value: 44 },
  { label: "Canada / USA", value: 36 },
];
