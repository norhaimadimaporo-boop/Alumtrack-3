/**
 * Live, database-backed public statistics for the home page ("/") and the
 * alumni tracer summary. Every number rendered from this type comes from a
 * single `getPublicStats()` query against the active MySQL database — local
 * (`.env`) in development, Aiven (`.env.production` / Vercel env) in
 * production — so the same page shows correct figures regardless of which
 * database the deployment is pointed at.
 */

export type PublicIndustry = {
  /** Human label derived from `alumni_employment.sector`. */
  label: string;
  /** Share of employed alumni with a known sector, rounded to a whole %. */
  value: number;
  /** Raw alumni count behind the percentage. */
  count: number;
};

export type PublicStats = {
  /** Verified, active alumni (same population as Search / GIS map). */
  totalTraced: number;
  /** Distinct `alumni_profiles.college` values among verified alumni. */
  colleges: number;
  /**
   * Distinct effective batch years. A profile's effective batch follows the
   * priority Baccalaureate → Graduate → Post Graduate graduation year in
   * `alumni_education` (stored `batch_year` only as a last resort) —
   * matching Search, Directory, and Reports.
   */
  batchYears: number;
  /** Published `News / Event` posts whose date falls in `currentYear`. */
  eventsThisYear: number;
  currentYear: number;
  employed: number;
  unemployed: number;
  unknown: number;
  /** employed / (employed + unemployed) × 100. 0 when no status known. */
  employmentRate: number;
  workingOverseas: number;
  hostCountries: number;
  employedLocally: number;
  /** Employed alumni with a current job row whose sector is known. */
  employedWithSector: number;
  /** Employed alumni with a current job row (any sector value). */
  employedWithCurrentJob: number;
  /** Top industries from current sector records, sorted by count desc. */
  industries: PublicIndustry[];
};

export type PublicStatsResult =
  | { ok: true; stats: PublicStats }
  | { ok: false; message: string };
