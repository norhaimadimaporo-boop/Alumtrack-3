import { useEffect, useState } from "react";
import { getSession, type Role } from "@/lib/session";

export function useSession() {
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    const sync = () => setRole(getSession());
    sync();
    window.addEventListener("alumtrack-session", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("alumtrack-session", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return role;
}
