/** Public directory record — verified alumni only, no contact details. */
export type PublicAlumnus = {
  id: number;
  name: string;
  course: string;
  college: string;
  batch: string;
  job: string;
  company: string;
  region: string;
  status: "Employed" | "Unemployed" | "Not provided";
};

export type PublicAlumniResult =
  { ok: true; alumni: PublicAlumnus[] } | { ok: false; message: string };
