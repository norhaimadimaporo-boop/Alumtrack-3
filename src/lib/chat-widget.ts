/** Cross-page signal used to open the floating OARCC AI chatbox. */
export const OPEN_ALUMNI_CHAT_EVENT = "alumtrack:open-alumni-chat";

export function openAlumniChat() {
  if (typeof window === "undefined") return;
  // Persist the request across route changes: the launcher is only mounted
  // inside the Alumni portal, so a click on the public Home card must survive
  // the navigation to the dashboard.
  try {
    window.sessionStorage.setItem(OPEN_ALUMNI_CHAT_EVENT, "1");
  } catch {
    // Ignore storage restrictions; the immediate event still works in-page.
  }
  window.dispatchEvent(new Event(OPEN_ALUMNI_CHAT_EVENT));
}
