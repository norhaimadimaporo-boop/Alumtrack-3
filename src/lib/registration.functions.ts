import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { registerAlumniAccount } from "./registration.server";
import type { RegistrationInput } from "./registration.types";

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
  province: requiredText(120, "Enter your province."),
  zipCode: optionalText(20),
});

const educationSchema = z.object({
  level: z.enum(["Post Graduate Degree", "Graduate Degree", "Baccalaureate Degree"]),
  schoolIdNo: optionalText(50),
  degree: requiredText(200, "Enter the degree earned."),
  major: requiredText(200, "Enter your major."),
  college: requiredText(200, "Enter the name of your college."),
  school: requiredText(200, "Enter the university or school attended."),
  schoolAddress: requiredText(255, "Enter the school address."),
  graduatedOn: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid graduation date."),
});

const employmentSchema = z.object({
  position: requiredText(200, "Enter your present position."),
  company: requiredText(200, "Enter your present company or agency."),
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
  name: requiredText(200, "Enter the organization name."),
  address: optionalText(255),
  position: optionalText(200),
  contactNo: optionalText(50),
  email: emailOrEmpty,
  memberSince: z.string().trim().max(10).optional().default(""),
});

const registrationSchema = z.object({
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
  accountEmail: z.string().trim().toLowerCase().email("Enter a valid email address.").max(255),
  password: z.string().min(8, "Use at least 8 characters.").max(200),
  sameAddress: z.boolean(),
  currentAddress: addressSchema,
  homeAddress: addressSchema,
  mobileNumber: requiredText(30, "Enter your active mobile number."),
  contactEmail: z.string().trim().toLowerCase().email("Enter a valid email address.").max(255),
  akanEmail: emailOrEmpty,
  facebook: optionalText(255),
  education: z.array(educationSchema).min(1, "Select at least one degree."),
  employmentStatus: z.enum(["employed", "unemployed", "unknown"]),
  employment: employmentSchema.nullable(),
  organization: organizationSchema.nullable(),
});

export const registerAlumni = createServerFn({ method: "POST" })
  .validator(registrationSchema)
  .handler(async ({ data }) => registerAlumniAccount(data as RegistrationInput));
