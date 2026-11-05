const KEY = "alumtrack-session";

export type Role = "alumni" | "admin";

/** Three-tier administrator hierarchy: head > standard > viewer. */
export type AdminRole = "head" | "standard" | "viewer";

const ADMIN_ROLES: readonly AdminRole[] = ["head", "standard", "viewer"];

export function isAdminRole(value: unknown): value is AdminRole {
  return typeof value === "string" && (ADMIN_ROLES as readonly string[]).includes(value);
}

function isRole(value: unknown): value is Role {
  return value === "alumni" || value === "admin";
}

type SessionPayload = {
  role: Role;
  adminRole: AdminRole | null;
};

/**
 * Sessions used to be stored as a bare role string. Parse both the legacy value
 * and the current JSON payload so an existing browser is not signed out.
 */
function parseSession(raw: string | null): SessionPayload | null {
  if (!raw) return null;
  if (isRole(raw)) return { role: raw, adminRole: null };

  try {
    const data = JSON.parse(raw) as { role?: unknown; adminRole?: unknown } | null;
    if (!data || !isRole(data.role)) return null;
    return {
      role: data.role,
      adminRole: data.role === "admin" && isAdminRole(data.adminRole) ? data.adminRole : null,
    };
  } catch {
    return null;
  }
}

function readSession(): SessionPayload | null {
  if (typeof window === "undefined") return null;
  return parseSession(window.localStorage.getItem(KEY));
}

function notifySessionChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("alumtrack-session"));
}

export function getSession(): Role | null {
  return readSession()?.role ?? null;
}

export function getAdminRole(): AdminRole | null {
  return readSession()?.adminRole ?? null;
}

export function setSession(role: Role, adminRole: AdminRole | null = null) {
  if (typeof window === "undefined") return;
  const payload: SessionPayload = {
    role,
    adminRole: role === "admin" ? adminRole : null,
  };
  window.localStorage.setItem(KEY, JSON.stringify(payload));
  notifySessionChanged();
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
  notifySessionChanged();
}
