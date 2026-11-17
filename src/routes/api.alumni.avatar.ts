import { createFileRoute } from "@tanstack/react-router";

import { deleteAvatar, getAvatarResponse, saveAvatar } from "@/lib/avatar.server";

export const Route = createFileRoute("/api/alumni/avatar")({
  server: {
    handlers: {
      GET: async ({ request }) => getAvatarResponse(request),
      POST: async ({ request }) => saveAvatar(request),
      DELETE: async () => deleteAvatar(),
    },
  },
});
