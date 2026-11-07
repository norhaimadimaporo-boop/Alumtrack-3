/**
 * Directory record for verified alumni. A field is `null` (or empty) when the
 * owner's privacy settings hide it, so hidden values are never sent to the browser.
 *
 * Privacy gates (see `search.server.ts`):
 * - `job` / `company`: null unless `publicShowEmployment` AND (for signed-in
 *   viewers) `directoryShowWorkplace` are ON ("Current workplace").
 * - `region`: general region visible to this viewer — always for guests,
 *   only when `directoryShowRegion` is ON for signed-in viewers. Null → the
 *   card renders "Region is private".
 * - `location`: detailed "City, Province, Country" — only for signed-in
 *   viewers with `directoryShowRegion` ON. Null → the card falls back to
 *   `region` (general), then to "Region is private".
 * - `mobile` / `facebook` / `emails`: only the contacts whose switches are ON
 *   (`publicShowContact` + `directoryShowMobile`, `directoryShowFacebook`
 *   signed-in only, `publicShowEmail`).
 */
export type PublicAlumnus = {
  id: number;
  name: string;
  /** Name parts, kept separate so /search can filter on each one (e.g. "abdul"). */
  firstName: string;
  middleName: string;
  lastName: string;
  course: string;
  college: string;
  batch: string;
  job: string | null;
  company: string | null;
  region: string | null;
  location: string | null;
  status: "Employed" | "Unemployed" | "Not provided";
  mobile: string | null;
  emails: string[];
  facebook: string | null;
};

export type PublicAlumniResult =
  | { ok: true; alumni: PublicAlumnus[]; signedIn: boolean }
  | { ok: false; message: string };
