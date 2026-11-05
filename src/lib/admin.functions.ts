import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  createAdminAccount,
  deleteAdminAccount,
  deleteAlumniRecord,
  getAdminDashboard,
  listAdminAccounts,
  listAdminAlumni,
  updateAdminAccount,
  verifyAlumniRecord,
} from "./admin.server";
import { importAlumniCsv } from "./admin-import.server";

const recordSchema = z.object({
  id: z.number().int().positive(),
});

const importSchema = z.object({
  csv: z.string().min(1, "Upload a CSV file first.").max(5_000_000, "The CSV file is too large."),
});

const adminRoleSchema = z.enum(["head", "standard", "viewer"]);

const createAdminSchema = z.object({
  fullName: z.string().trim().min(1, "Enter the administrator's full name.").max(150),
  email: z.string().trim().email("Enter a valid email address.").max(255),
  password: z.string().min(8, "The password must be at least 8 characters long.").max(200),
  role: adminRoleSchema,
});

const updateAdminSchema = z.object({
  id: z.number().int().positive(),
  fullName: z.string().trim().min(1, "Enter the administrator's full name.").max(150),
  email: z.string().trim().email("Enter a valid email address.").max(255),
  role: adminRoleSchema,
  active: z.boolean(),
  password: z.string().max(200).optional(),
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

export const getAdminAccounts = createServerFn({ method: "GET" }).handler(async () =>
  listAdminAccounts(),
);

export const createAdmin = createServerFn({ method: "POST" })
  .validator(createAdminSchema)
  .handler(async ({ data }) => createAdminAccount(data));

export const updateAdmin = createServerFn({ method: "POST" })
  .validator(updateAdminSchema)
  .handler(async ({ data }) => updateAdminAccount(data));

export const deleteAdmin = createServerFn({ method: "POST" })
  .validator(recordSchema)
  .handler(async ({ data }) => deleteAdminAccount(data.id));
