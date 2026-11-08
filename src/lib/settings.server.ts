import type { RowDataPacket } from "mysql2/promise";

import { getSessionUser, hashPassword, verifyPassword } from "./auth.server";
import { getPool } from "./db.server";
import {
  DEFAULT_PRIVACY_SETTINGS,
  type PrivacySettings,
  type PrivacySettingsResult,
  type SettingsActionResult,
} from "./settings.types";

/** Maps each setting to its `alumni_privacy_settings` column. */
const COLUMNS: Array<[keyof PrivacySettings, string]> = [
  ["publicShowContact", "public_show_contact"],
  ["publicShowEmail", "public_show_email"],
  ["publicShowEmployment", "public_show_employment"],
  ["publicIncludeRegionStats", "public_include_region_stats"],
  ["gisShowWorkplace", "gis_show_workplace"],
  ["gisNearbyDiscovery", "gis_nearby_discovery"],
  ["gisCityOnly", "gis_city_only"],
  ["directoryShowFacebook", "directory_show_facebook"],
  ["directoryShowWorkplace", "directory_show_workplace"],
  ["directoryShowRegion", "directory_show_region"],
  ["directoryShowMobile", "directory_show_mobile"],
  ["notifyEvents", "notify_events"],
  ["notifyJobs", "notify_jobs"],
];

const COLUMN_NAMES = COLUMNS.map(([, column]) => column);

type SettingsRow = RowDataPacket & Record<string, number>;

function fromRow(row: SettingsRow): PrivacySettings {
  const settings = { ...DEFAULT_PRIVACY_SETTINGS };
  for (const [key, column] of COLUMNS) {
    settings[key] = Number(row[column]) === 1;
  }
  return settings;
}

/** Saved preferences for the signed-in account, or the defaults when none are saved yet. */
export async function getMyPrivacySettings(): Promise<PrivacySettingsResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "Sign in to manage your privacy settings." };

  try {
    const [rows] = await getPool().execute<SettingsRow[]>(
      `SELECT ${COLUMN_NAMES.join(", ")} FROM alumni_privacy_settings WHERE user_id = ?`,
      [user.id],
    );
    const row = rows[0];
    return { ok: true, settings: row ? fromRow(row) : { ...DEFAULT_PRIVACY_SETTINGS } };
  } catch (error) {
    console.error("[settings] Privacy settings query failed:", error);
    return { ok: false, message: "Your settings could not be loaded right now." };
  }
}

const COLUMN_BY_KEY = new Map<string, string>(COLUMNS);

/**
 * Saves every toggle at once (explicit Save Changes button). All columns
 * are written in a single upsert so the toggles the user sees are exactly
 * what lands in the database — and, downstream, in Search Alumni and GIS
 * Map visibility — only after they press Save.
 */
export async function saveMyPrivacySettings(
  settings: PrivacySettings,
): Promise<SettingsActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "Sign in to manage your privacy settings." };

  try {
    const placeholders = COLUMN_NAMES.map(() => "?").join(", ");
    const updates = COLUMN_NAMES.map((column) => `${column} = new.${column}`).join(", ");
    await getPool().execute(
      `INSERT INTO alumni_privacy_settings (user_id, ${COLUMN_NAMES.join(", ")})
       VALUES (${["?", placeholders].join(", ")}) AS new
       ON DUPLICATE KEY UPDATE ${updates}`,
      [
        user.id,
        ...COLUMNS.map(([key]) => (settings[key] ? 1 : 0)),
      ],
    );
    return { ok: true, message: "Privacy settings saved." };
  } catch (error) {
    console.error("[settings] Privacy settings save failed:", error);
    return { ok: false, message: "Your settings could not be saved. Please try again." };
  }
}

/**
 * Saves one switch. Each switch is written on its own so quick successive
 * clicks cannot overwrite each other with stale values. A new row gets the
 * table defaults for every other column.
 */
export async function saveMyPrivacySetting(key: string, value: boolean): Promise<SettingsActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "Sign in to manage your privacy settings." };

  const column = COLUMN_BY_KEY.get(key);
  if (!column) return { ok: false, message: "That setting is not available." };

  try {
    await getPool().execute(
      `INSERT INTO alumni_privacy_settings (user_id, ${column})
       VALUES (?, ?) AS new
       ON DUPLICATE KEY UPDATE ${column} = new.${column}`,
      [user.id, value ? 1 : 0],
    );
    return { ok: true, message: "Your privacy settings were saved." };
  } catch (error) {
    console.error("[settings] Privacy settings save failed:", error);
    return { ok: false, message: "Your settings could not be saved. Please try again." };
  }
}

export async function changeMyPassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<SettingsActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "Sign in to change your password." };

  try {
    const [rows] = await getPool().execute<RowDataPacket[]>(
      "SELECT password_hash FROM users WHERE id = ? AND is_active = 1 LIMIT 1",
      [user.id],
    );
    const stored = rows[0]?.["password_hash"] as string | undefined;
    if (!stored) return { ok: false, message: "Your account could not be found." };

    if (!(await verifyPassword(input.currentPassword, stored))) {
      return { ok: false, message: "Your current password is incorrect." };
    }
    if (await verifyPassword(input.newPassword, stored)) {
      return { ok: false, message: "Choose a password that is different from your current one." };
    }

    const passwordHash = await hashPassword(input.newPassword);
    await getPool().execute("UPDATE users SET password_hash = ? WHERE id = ?", [
      passwordHash,
      user.id,
    ]);
    return { ok: true, message: "Your password has been updated." };
  } catch (error) {
    console.error("[settings] Password change failed:", error);
    return { ok: false, message: "Your password could not be changed right now. Please try again." };
  }
}
