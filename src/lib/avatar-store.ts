import { useEffect, useState } from "react";

const EVENT_NAME = "alumtrack-avatar-updated";
const STORAGE_PREFIX = "alumtrack-avatar:";
const memory = new Map<number, string | null>();

type AvatarEvent = CustomEvent<{ userId: number; avatarUrl: string | null }>;

export function setClientAvatarUrl(userId: number, avatarUrl: string | null) {
  memory.set(userId, avatarUrl);
  if (typeof window === "undefined") return;
  try {
    const key = `${STORAGE_PREFIX}${userId}`;
    if (avatarUrl === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, avatarUrl);
  } catch {
    // The in-memory event still synchronizes current views when storage is blocked.
  }
  window.dispatchEvent(
    new CustomEvent(EVENT_NAME, { detail: { userId, avatarUrl } }) as AvatarEvent,
  );
}

function storedAvatarUrl(userId: number, fallback: string | null): string | null {
  if (memory.has(userId)) return memory.get(userId) ?? null;
  if (typeof window === "undefined") return fallback;
  try {
    return window.localStorage.getItem(`${STORAGE_PREFIX}${userId}`) ?? fallback;
  } catch {
    return fallback;
  }
}

export function useAvatarUrl(userId: number, initialUrl: string | null): string | null {
  const [avatarUrl, setAvatarUrl] = useState(initialUrl);

  useEffect(() => {
    setAvatarUrl(storedAvatarUrl(userId, initialUrl));
    const onAvatarChange = (event: Event) => {
      const detail = (event as AvatarEvent).detail;
      if (detail?.userId === userId) setAvatarUrl(detail.avatarUrl);
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key !== `${STORAGE_PREFIX}${userId}`) return;
      setAvatarUrl(event.newValue ?? null);
    };
    window.addEventListener(EVENT_NAME, onAvatarChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(EVENT_NAME, onAvatarChange);
      window.removeEventListener("storage", onStorage);
    };
  }, [userId, initialUrl]);

  return avatarUrl;
}
