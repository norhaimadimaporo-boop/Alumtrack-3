const KEY = "alumtrack-session";

export type Role = "alumni" | "admin";

export function getSession(): Role | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(KEY);
  return v === "alumni" || v === "admin" ? v : null;
}

export function setSession(role: Role) {
  window.localStorage.setItem(KEY, role);
  window.dispatchEvent(new Event("alumtrack-session"));
}

export function clearSession() {
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("alumtrack-session"));
}
