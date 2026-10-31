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

/* ---------- Alumni map ---------- */

export type EmploymentStatus = "Employed" | "Unemployed";

/** How accurately a pin is placed: city/municipality here, state/province abroad. */
export type GeoPrecision = "city" | "state";

export type AlumniMapPin = {
  id: string;
  name: string;
  /** Job title, or "Seeking employment" for unemployed alumni. */
  role: string;
  status: EmploymentStatus;
  company: string | null;
  /** City or municipality. */
  city: string;
  /** Province / emirate / governorate. */
  region: string;
  country: string;
  precision: GeoPrecision;
  lat: number;
  lng: number;
  course: string;
  batch: string;
};

/**
 * Opt-in workplace pins visible to signed-in alumni. Overseas alumni are placed
 * at state/province level (e.g. Dubai Emirate) to protect their exact address;
 * Philippine alumni keep city/municipality precision.
 */
export const ALUMNI_MAP_PINS: AlumniMapPin[] = [
  {
    id: "pin-naimah",
    name: "Naimah T. A.",
    role: "Software Engineer",
    status: "Employed",
    company: "Accenture Philippines",
    city: "Taguig City",
    region: "Metro Manila",
    country: "Philippines",
    precision: "city",
    lat: 14.5176,
    lng: 121.0509,
    course: "BS Information Technology",
    batch: "2024",
  },
  {
    id: "pin-abdul",
    name: "Abdul R. M.",
    role: "Project Engineer",
    status: "Employed",
    company: "DPWH Region X",
    city: "Cagayan de Oro",
    region: "Misamis Oriental",
    country: "Philippines",
    precision: "city",
    lat: 8.4542,
    lng: 124.6319,
    course: "BS Civil Engineering",
    batch: "2021",
  },
  {
    id: "pin-norhaimah",
    name: "Norhaimah Y. D.",
    role: "IT Support Officer",
    status: "Employed",
    company: "LGU Marawi City",
    city: "Marawi City",
    region: "Lanao del Sur",
    country: "Philippines",
    precision: "city",
    lat: 8.0,
    lng: 124.29,
    course: "BS Information Technology",
    batch: "2022",
  },
  {
    id: "pin-jasmin",
    name: "Jasmin P. L.",
    role: "Junior Auditor",
    status: "Employed",
    company: "SGV & Co.",
    city: "Davao City",
    region: "Davao del Sur",
    country: "Philippines",
    precision: "city",
    lat: 7.1907,
    lng: 125.4553,
    course: "BS Accountancy",
    batch: "2020",
  },
  {
    id: "pin-rania",
    name: "Rania K. B.",
    role: "Accountant",
    status: "Employed",
    company: "BDO Unibank",
    city: "Makati City",
    region: "Metro Manila",
    country: "Philippines",
    precision: "city",
    lat: 14.5547,
    lng: 121.0244,
    course: "BS Accountancy",
    batch: "2020",
  },
  {
    id: "pin-amirah",
    name: "Amirah B. S.",
    role: "Civil Engineer",
    status: "Employed",
    company: "Emirates Engineering LLC",
    city: "Dubai",
    region: "Dubai Emirate",
    country: "United Arab Emirates",
    precision: "state",
    lat: 25.2048,
    lng: 55.2708,
    course: "BS Civil Engineering",
    batch: "2018",
  },
  {
    id: "pin-farhana",
    name: "Farhana A. S.",
    role: "Registered Nurse",
    status: "Employed",
    company: "King Fahd Medical City",
    city: "Riyadh",
    region: "Riyadh Province",
    country: "Saudi Arabia",
    precision: "state",
    lat: 24.7136,
    lng: 46.6753,
    course: "BS Nursing",
    batch: "2019",
  },
  {
    id: "pin-yusuf",
    name: "Yusuf M. K.",
    role: "Logistics Supervisor",
    status: "Employed",
    company: "Qatar Logistics Co.",
    city: "Doha",
    region: "Ad Dawhah",
    country: "Qatar",
    precision: "state",
    lat: 25.2854,
    lng: 51.531,
    course: "BS Business Administration",
    batch: "2017",
  },
  {
    id: "pin-zainab",
    name: "Zainab A. T.",
    role: "IT Analyst",
    status: "Employed",
    company: "Maybank",
    city: "Kuala Lumpur",
    region: "Federal Territory",
    country: "Malaysia",
    precision: "state",
    lat: 3.139,
    lng: 101.6869,
    course: "BS Information Technology",
    batch: "2021",
  },
  {
    id: "pin-nadia",
    name: "Nadia S. L.",
    role: "Staff Nurse",
    status: "Employed",
    company: "Singapore General Hospital",
    city: "Singapore",
    region: "Central Region",
    country: "Singapore",
    precision: "city",
    lat: 1.2847,
    lng: 103.8513,
    course: "BS Nursing",
    batch: "2020",
  },
  {
    id: "pin-sittie",
    name: "Sittie A. F.",
    role: "Seeking employment",
    status: "Unemployed",
    company: null,
    city: "Iligan City",
    region: "Lanao del Norte",
    country: "Philippines",
    precision: "city",
    lat: 8.228,
    lng: 124.2452,
    course: "BS Computer Science",
    batch: "2024",
  },
  {
    id: "pin-omar",
    name: "Omar H. P.",
    role: "Seeking employment",
    status: "Unemployed",
    company: null,
    city: "Cotabato City",
    region: "BARMM",
    country: "Philippines",
    precision: "city",
    lat: 7.2047,
    lng: 124.231,
    course: "BS Information Technology",
    batch: "2023",
  },
];

export type MapViewBounds = {
  minLng: number;
  maxLng: number;
  minLat: number;
  maxLat: number;
};

export type MapViewKey = "region" | "philippines" | "middle-east";

export type MapView = {
  key: MapViewKey;
  label: string;
  short: string;
  hint: string;
  /** Leaflet `[lat, lng]` centre used for the initial render. */
  center: [number, number];
  /** Leaflet zoom used for the initial render (fitBounds refines it after mount). */
  zoom: number;
  bounds: MapViewBounds;
};

/**
 * Map presets. The default "region" view frames the Philippines together with
 * the Middle East and Southeast Asia so overseas alumni are visible on load.
 */
export const MAP_VIEWS: MapView[] = [
  {
    key: "region",
    label: "Asia & Middle East",
    short: "Region",
    hint: "Philippines + Middle East + Southeast Asia",
    center: [20, 83],
    zoom: 3,
    bounds: { minLng: 30, maxLng: 136, minLat: -4, maxLat: 44 },
  },
  {
    key: "philippines",
    label: "Philippines",
    short: "PH",
    hint: "City / municipality precision",
    center: [12, 122],
    zoom: 5,
    bounds: { minLng: 112, maxLng: 132, minLat: 2, maxLat: 22 },
  },
  {
    key: "middle-east",
    label: "Middle East",
    short: "Gulf",
    hint: "State / province precision",
    center: [22, 47],
    zoom: 5,
    bounds: { minLng: 34, maxLng: 60, minLat: 12, maxLat: 32 },
  },
];

/** Legend copy — kept apart from the map component so it is easy to audit. */
export const MAP_LEGEND = [
  {
    status: "Employed" as const,
    color: "success" as const,
    label: "Green pin = Employed",
  },
  {
    status: "Unemployed" as const,
    color: "highlight" as const,
    label: "Yellow pin = Unemployed",
  },
];

export const NEARBY_ALUMNI = [
  {
    name: "Sittie Asmerah F. A.",
    course: "BS Computer Science",
    batch: "2022",
    place: "Globe Telecom · BGC",
    km: "2.1 km",
  },
  {
    name: "Omar H. Pangandaman",
    course: "BS Information Technology",
    batch: "2021",
    place: "Concentrix · Ortigas",
    km: "6.4 km",
  },
  {
    name: "Rania K. Bantuas",
    course: "BS Accountancy",
    batch: "2020",
    place: "BDO Unibank · Makati",
    km: "7.8 km",
  },
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
