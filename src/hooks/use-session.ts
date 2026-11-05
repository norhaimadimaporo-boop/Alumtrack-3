import { useSyncExternalStore } from "react";
import { getAdminRole, getSession, type AdminRole, type Role } from "@/lib/session";

function subscribe(onChange: () => void) {
  window.addEventListener("alumtrack-session", onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener("alumtrack-session", onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * Read the client-side session without breaking SSR hydration: the server
 * snapshot is always null, then React re-reads localStorage after hydration.
 */
export function useSession(): Role | null {
  return useSyncExternalStore<Role | null>(subscribe, getSession, () => null);
}

/** The signed-in administrator's tier, or null for alumni/guests. */
export function useAdminRole(): AdminRole | null {
  return useSyncExternalStore<AdminRole | null>(subscribe, getAdminRole, () => null);
}
