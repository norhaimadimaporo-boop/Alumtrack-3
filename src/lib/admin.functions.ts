import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  deleteAlumniRecord,
  getAdminDashboard,
  listAdminAlumni,
  verifyAlumniRecord,
} from "./admin.server";
import { importAlumniCsv } from "./admin-import.server";

const recordSchema = z.object({
  id: z.number().int().positive(),
});

const importSchema = z.object({
  csv: z.string().min(1, "Upload a CSV file first.").max(5_000_000, "The CSV file is too large."),
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

export const importAlumni = createServerFn({ method: "POST" })
  .validator(importSchema)
  .handler(async ({ data }) => importAlumniCsv(data.csv));
