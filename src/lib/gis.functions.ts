import { createServerFn } from "@tanstack/react-start";

import { listAlumniMapPins } from "./gis.server";

export const getAlumniMapPinsData = createServerFn({ method: "GET" }).handler(async () =>
  listAlumniMapPins(),
);
