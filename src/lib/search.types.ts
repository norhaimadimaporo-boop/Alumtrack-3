/**
 * Directory record for verified alumni. A field is `null` (or empty) when the
 * owner's privacy settings hide it, so hidden values are never sent to the browser.
 */
export type PublicAlumnus = {
  id: number;
  name: string;
  course: string;
  college: string;
  batch: string;
  job: string | null;
  company: string | null;
  region: string | null;
  status: "Employed" | "Unemployed" | "Not provided";
  mobile: string | null;
  emails: string[];
  facebook: string | null;
};

export type PublicAlumniResult =
  | { ok: true; alumni: PublicAlumnus[]; signedIn: boolean }
  | { ok: false; message: string };
