import { createServerFn } from "@tanstack/react-start";

import { listPublicAlumni } from "./search.server";

export const getPublicAlumni = createServerFn({ method: "GET" }).handler(async () =>
  listPublicAlumni(),
);
