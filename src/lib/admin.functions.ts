import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  deleteAlumniRecord,
  getAdminDashboard,
  listAdminAlumni,
  verifyAlumniRecord,
} from "./admin.server";

const recordSchema = z.object({
  id: z.number().int().positive(),
});

export const getAdminDashboardData = createServerFn({ method: "GET" }).handler(async () =>
  getAdminDashboard(),
);

export const getAdminAlumni = createServerFn({ method: "GET" }).handler(async () =>
  listAdminAlumni(),
);

export const verifyAlumni = createServerFn({ method: "POST" })
  .validator(recordSchema)
  .handler(async ({ data }) => verifyAlumniRecord(data.id));

export const deleteAlumni = createServerFn({ method: "POST" })
  .validator(recordSchema)
  .handler(async ({ data }) => deleteAlumniRecord(data.id));
