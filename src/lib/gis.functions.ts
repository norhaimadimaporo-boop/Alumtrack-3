import { createServerFn } from "@tanstack/react-start";

import { listAdminMapPins, listAlumniMapPins } from "./gis.server";

export const getAlumniMapPinsData = createServerFn({ method: "GET" }).handler(async () =>
  listAlumniMapPins(),
);

export const getAdminMapPinsData = createServerFn({ method: "GET" }).handler(async () =>
  listAdminMapPins(),
);
