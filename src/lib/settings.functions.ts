import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { loginUser } from "./auth.server";
import { changeMyPassword, getMyPrivacySettings, saveMyPrivacySetting } from "./settings.server";

const privacySettingSchema = z.object({
  key: z.string().min(1).max(60),
  value: z.boolean(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password.").max(200),
  newPassword: z
    .string()
    .min(8, "The new password must be at least 8 characters long.")
    .max(200, "The new password is too long."),
});

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address.").max(255),
  password: z.string().min(1).max(200),
  role: z.enum(["alumni", "admin"]),
});

export const getMyPrivacy = createServerFn({ method: "GET" }).handler(async () =>
  getMyPrivacySettings(),
);

export const saveMyPrivacy = createServerFn({ method: "POST" })
  .validator(privacySettingSchema)
  .handler(async ({ data }) => saveMyPrivacySetting(data.key, data.value));

export const changeMyPasswordRecord = createServerFn({ method: "POST" })
  .validator(passwordSchema)
  .handler(async ({ data }) => changeMyPassword(data));

export const loginRecord = createServerFn({ method: "POST" })
  .validator(loginSchema)
  .handler(async ({ data }) => loginUser(data));
