/**
 * Live report records for /admin/reports. One row per verified, active
 * alumnus with every field needed for KPI cards, charts, GIS pins,
 * the 11 filter dropdowns, and the filtered results table.
 */
export type ReportRecord = {
  id: number;
  userId: number;
  name: string;
  course: string;
  college: string;
  /** Effective batch year (profile fallback to education), as a string. */
  batch: string;
  gender: string;
  /** Tribe / ethnicity label. */
  ethnicity: string;
  /** Religious affiliation label. */
  religion: string;
  employmentStatus: "employed" | "unemployed" | "unknown";
  /** General region (current_region or address province fallback). */
  region: string;
  /** Province for charts/filters (address province, else region). */
  province: string;
  city: string;
  country: string;
  /** True when employed abroad (foreign country). */
  abroad: boolean;
  /** Group affiliation bucket for charts/filters. */
  affiliation: "Secular" | "Non-secular" | "No affiliation";
  /** Resolved map pin (null when no coordinates could be determined). */
  pin: {
    id: string;
    name: string;
    role: string;
    status: "Employed" | "Unemployed";
    company: string | null;
    city: string;
    region: string;
    country: string;
    precision: "city" | "state";
    lat: number;
    lng: number;
    course: string;
    batch: string;
  } | null;
};

export type ReportRecordsResult =
  | { ok: true; records: ReportRecord[] }
  | { ok: false; message: string };
