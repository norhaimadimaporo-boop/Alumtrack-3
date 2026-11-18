/** Cross-page signal used to open the floating OARCC AI chatbox. */
export const OPEN_ALUMNI_CHAT_EVENT = "alumtrack:open-alumni-chat";

export function openAlumniChat() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(OPEN_ALUMNI_CHAT_EVENT));
}
