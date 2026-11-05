/** Per-account privacy and notification preferences (`alumni_privacy_settings`). */
export type PrivacySettings = {
  /** Public search: show mobile number to anonymous visitors. */
  publicShowContact: boolean;
  /** Public search: show contact and Akan email addresses. */
  publicShowEmail: boolean;
  /** Public search and directory: show current job and company. */
  publicShowEmployment: boolean;
  publicIncludeRegionStats: boolean;
  gisShowWorkplace: boolean;
  gisNearbyDiscovery: boolean;
  /** Plot the city only and hide the company name on the GIS map. */
  gisCityOnly: boolean;
  directoryShowFacebook: boolean;
  directoryShowWorkplace: boolean;
  directoryShowRegion: boolean;
  directoryShowMobile: boolean;
  notifyEvents: boolean;
  notifyJobs: boolean;
};

export const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  publicShowContact: false,
  publicShowEmail: false,
  publicShowEmployment: true,
  publicIncludeRegionStats: true,
  gisShowWorkplace: true,
  gisNearbyDiscovery: true,
  gisCityOnly: false,
  directoryShowFacebook: false,
  directoryShowWorkplace: true,
  directoryShowRegion: true,
  directoryShowMobile: false,
  notifyEvents: true,
  notifyJobs: true,
};

export type PrivacySettingsResult =
  | { ok: true; settings: PrivacySettings }
  | { ok: false; message: string };

export type SettingsActionResult = { ok: true; message: string } | { ok: false; message: string };
