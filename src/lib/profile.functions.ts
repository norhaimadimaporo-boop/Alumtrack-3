import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  deleteMyEducation,
  deleteMyEmployment,
  deleteMyOrganization,
  getAlumniSession,
  getMyProfile,
  getMyWorkspace,
  saveMyEducation,
  saveMyEmployment,
  saveMyOrganization,
  updateMyProfile,
} from "./profile.server";
import type {
  EducationRecordInput,
  EmploymentRecordInput,
  OrganizationRecordInput,
  ProfileEditInput,
} from "./profile.types";

const requiredText = (max: number, message = "This field is required.") =>
  z.string().trim().min(1, message).max(max);

const optionalText = (max: number) => z.string().trim().max(max).optional().default("");

const emailOrEmpty = z
  .string()
  .trim()
  .max(255)
  .refine((value) => value === "" || z.string().email().safeParse(value).success, {
    message: "Enter a valid email address.",
  });

const addressSchema = z.object({
  building: optionalText(120),
  houseNo: optionalText(50),
  block: optionalText(50),
  street: optionalText(150),
  subdivision: optionalText(150),
  city: requiredText(120, "Enter your city or municipality."),
  province: requiredText(120, "Enter your province or state."),
  country: requiredText(120, "Enter your country."),
  zipCode: optionalText(20),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
});

const isoDateOrEmpty = z
  .string()
  .trim()
  .max(10)
  .refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), {
    message: "Enter a valid date.",
  });

const profileSchema = z.object({
  firstName: requiredText(100, "Enter your first name."),
  middleName: optionalText(100),
  lastName: requiredText(100, "Enter your last name."),
  gender: z.enum(["Male", "Female", "Prefer not to say"]),
  birthDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date of birth."),
  ethnicity: requiredText(120, "Enter your ethnicity or tribe."),
  birthPlace: requiredText(200, "Enter your place of birth."),
  religion: requiredText(120, "Enter your religious affiliation."),
  mobileNumber: requiredText(30, "Enter your active mobile number."),
  contactEmail: z.string().trim().toLowerCase().email("Enter a valid email address.").max(255),
  akanEmail: emailOrEmpty,
  facebook: optionalText(255),
  currentAddress: addressSchema,
  homeAddress: addressSchema,
});

const educationSchema = z.object({
  id: z.number().int().positive().optional(),
  level: z.enum(["Post Graduate Degree", "Graduate Degree", "Baccalaureate Degree"]),
  schoolIdNo: optionalText(50),
  degree: requiredText(200, "Enter the degree earned."),
  major: optionalText(200),
  college: optionalText(200),
  school: requiredText(200, "Enter the university or school attended."),
  schoolAddress: optionalText(255),
  graduatedOn: isoDateOrEmpty,
});

const employmentSchema = z.object({
  id: z.number().int().positive().optional(),
  isCurrent: z.boolean(),
  position: requiredText(200, "Enter your position."),
  company: requiredText(200, "Enter your company or agency."),
  companyAddress: optionalText(255),
  lengthOfEmployment: optionalText(100),
  yearsInOffice: optionalText(50),
  workLocation: z.enum(["Local", "Abroad", ""]),
  sector: z.enum([
    "Government",
    "Non-Government / Private Institution",
    "Freelance / Entrepreneurial",
    "",
  ]),
});

const organizationSchema = z.object({
  id: z.number().int().positive().optional(),
  name: requiredText(200, "Enter the organization name."),
  address: optionalText(255),
  position: optionalText(200),
  contactNo: optionalText(50),
  email: emailOrEmpty,
  memberSince: isoDateOrEmpty,
});

const idSchema = z.object({ id: z.number().int().positive() });

export const getMyProfileData = createServerFn({ method: "GET" }).handler(async () =>
  getMyProfile(),
);

export const getMyWorkspaceData = createServerFn({ method: "GET" }).handler(async () =>
  getMyWorkspace(),
);

export const getAlumniSessionData = createServerFn({ method: "GET" }).handler(async () =>
  getAlumniSession(),
);

export const updateMyProfileData = createServerFn({ method: "POST" })
  .validator(profileSchema)
  .handler(async ({ data }) => updateMyProfile(data as ProfileEditInput));

export const saveMyEducationData = createServerFn({ method: "POST" })
  .validator(educationSchema)
  .handler(async ({ data }) => saveMyEducation(data as EducationRecordInput));

export const deleteMyEducationData = createServerFn({ method: "POST" })
  .validator(idSchema)
  .handler(async ({ data }) => deleteMyEducation(data.id));

export const saveMyEmploymentData = createServerFn({ method: "POST" })
  .validator(employmentSchema)
  .handler(async ({ data }) => saveMyEmployment(data as EmploymentRecordInput));

export const deleteMyEmploymentData = createServerFn({ method: "POST" })
  .validator(idSchema)
  .handler(async ({ data }) => deleteMyEmployment(data.id));

export const saveMyOrganizationData = createServerFn({ method: "POST" })
  .validator(organizationSchema)
  .handler(async ({ data }) => saveMyOrganization(data as OrganizationRecordInput));

export const deleteMyOrganizationData = createServerFn({ method: "POST" })
  .validator(idSchema)
  .handler(async ({ data }) => deleteMyOrganization(data.id));
