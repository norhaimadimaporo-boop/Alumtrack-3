import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  changeMyPassword,
  getMyPrivacySettings,
  saveMyPrivacySetting,
  saveMyPrivacySettings,
} from "./settings.server";

const privacySettingSchema = z.object({
  key: z.string().min(1).max(60),
  value: z.boolean(),
});

const privacySettingsSchema = z.object({
  publicShowContact: z.boolean(),
  publicShowEmail: z.boolean(),
  publicShowEmployment: z.boolean(),
  publicIncludeRegionStats: z.boolean(),
  gisShowWorkplace: z.boolean(),
  gisNearbyDiscovery: z.boolean(),
  gisCityOnly: z.boolean(),
  directoryShowFacebook: z.boolean(),
  directoryShowWorkplace: z.boolean(),
  directoryShowRegion: z.boolean(),
  directoryShowMobile: z.boolean(),
  notifyEvents: z.boolean(),
  notifyJobs: z.boolean(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password.").max(200),
  newPassword: z
    .string()
    .min(8, "The new password must be at least 8 characters long.")
    .max(200, "The new password is too long."),
});

export const getMyPrivacy = createServerFn({ method: "GET" }).handler(async () =>
  getMyPrivacySettings(),
);

export const saveMyPrivacy = createServerFn({ method: "POST" })
  .validator(privacySettingSchema)
  .handler(async ({ data }) => saveMyPrivacySetting(data.key, data.value));

/** Bulk save wired to the explicit Save Changes button (no auto-save). */
export const saveMyPrivacySettingsRecord = createServerFn({ method: "POST" })
  .validator(privacySettingsSchema)
  .handler(async ({ data }) => saveMyPrivacySettings(data));

export const changeMyPasswordRecord = createServerFn({ method: "POST" })
  .validator(passwordSchema)
  .handler(async ({ data }) => changeMyPassword(data));

