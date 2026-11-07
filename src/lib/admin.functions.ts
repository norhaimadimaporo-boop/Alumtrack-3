import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  createAdminAccount,
  createAlumniRecord,
  deleteAdminAccount,
  deleteAlumniRecord,
  getAdminDashboard,
  listAdminAccounts,
  listAdminAlumni,
  updateAdminAccount,
  updateAlumniRecord,
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

const addressSchema = z.object({
  building: z.string().max(120).default(""),
  houseNo: z.string().max(50).default(""),
  block: z.string().max(50).default(""),
  street: z.string().max(150).default(""),
  subdivision: z.string().max(150).default(""),
  city: z.string().max(120).default(""),
  province: z.string().max(120).default(""),
  country: z.string().max(120).default(""),
  zipCode: z.string().max(20).default(""),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
});

const saveAlumniSchema = z.object({
  fullName: z.string().trim().min(1, "Enter the alumni's full name.").max(150),
  gender: z.enum(["Male", "Female", "Prefer not to say"]),
  birthDate: z.string(),
  ethnicity: z.string().max(120).default(""),
  birthPlace: z.string().max(265).default(""),
  religion: z.string().max(120).default(""),
  currentAddress: addressSchema,
  homeAddress: addressSchema,
  mobileNumber: z.string().max(30).default(""),
  contactEmail: z.string().max(255).default(""),
  akanEmail: z.string().max(255).default(""),
  facebook: z.string().max(255).default(""),
  education: z
    .array(
      z.object({
        level: z.enum(["Post Graduate Degree", "Graduate Degree", "Baccalaureate Degree"]),
        schoolIdNo: z.string().max(50).default(""),
        degree: z.string().max(200).default(""),
        major: z.string().max(200).default(""),
        college: z.string().max(200).default(""),
        school: z.string().max(200).default(""),
        schoolAddress: z.string().max(255).default(""),
        graduatedOn: z.string().default(""),
      }),
    )
    .default([]),
  course: z.string().max(200).default(""),
  college: z.string().max(200).default(""),
  batch: z.string().max(10).default(""),
  region: z.string().max(120).default(""),
  employmentStatus: z.enum(["employed", "unemployed", "unknown"]),
  employment: z
    .object({
      position: z.string().max(200).default(""),
      company: z.string().max(200).default(""),
      companyAddress: z.string().max(255).default(""),
      lengthOfEmployment: z.string().max(100).default(""),
      yearsInOffice: z.string().max(50).default(""),
      workLocation: z.string().max(50).default(""),
      sector: z.string().max(100).default(""),
    })
    .nullable()
    .default(null),
  organization: z
    .object({
      name: z.string().max(200).default(""),
      address: z.string().max(255).default(""),
      position: z.string().max(200).default(""),
      contactNo: z.string().max(50).default(""),
      email: z.string().max(255).default(""),
      memberSince: z.string().default(""),
    })
    .nullable()
    .default(null),
});

const updateAlumniSchema = saveAlumniSchema.extend({
  id: z.number().int().positive(),
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

export const updateAlumni = createServerFn({ method: "POST" })
  .validator(updateAlumniSchema)
  .handler(async ({ data }) => updateAlumniRecord(data));

export const createAlumni = createServerFn({ method: "POST" })
  .validator(saveAlumniSchema)
  .handler(async ({ data }) => createAlumniRecord(data));

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
