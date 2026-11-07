/**
 * System usage data for /admin/usage. Counters are computed live from the
 * `sessions` + `users` tables (no static values); access logs come from
 * session creations (logins) joined to rosters and profile locations.
 */
export type AccessLogEntry = {
  id: string;
  user: string;
  role: "Alumni" | "Admin";
  action: "Login" | "Logout";
  date: string;
  clock: string;
  stamp: string;
  where: string;
  active: boolean;
};

export type SystemUsageData = {
  activeSessions: number;
  loginsToday: number;
  regionsWithActivity: number;
  overseasSessions: number;
  /** Recent access logs, newest first (capped on the server). */
  accessLogs: AccessLogEntry[];
};

export type SystemUsageResult =
  | { ok: true; usage: SystemUsageData }
  | { ok: false; message: string };
