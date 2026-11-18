import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { deleteChatMessage, editChatMessage } from "@/lib/chat.server";

const editSchema = z.object({ message: z.string().trim().min(1).max(4000) });

function mutationResponse(result: Awaited<ReturnType<typeof editChatMessage>>) {
  return Response.json(result, { status: result.ok ? 200 : result.status });
}

export const Route = createFileRoute("/api/chat/messages/$id")({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        const messageId = Number(params.id);
        if (!Number.isSafeInteger(messageId) || messageId <= 0) {
          return Response.json(
            { ok: false, status: 400, message: "Invalid chat message." },
            { status: 400 },
          );
        }
        const contentLength = Number(request.headers.get("content-length") ?? 0);
        if (contentLength > 20_000) {
          return Response.json(
            { ok: false, status: 400, message: "The message is too long." },
            { status: 400 },
          );
        }
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json(
            { ok: false, status: 400, message: "Enter a valid message." },
            { status: 400 },
          );
        }
        const parsed = editSchema.safeParse(body);
        if (!parsed.success) {
          return Response.json(
            { ok: false, status: 400, message: "Enter a message between 1 and 4000 characters." },
            { status: 400 },
          );
        }
        return mutationResponse(await editChatMessage(messageId, parsed.data.message));
      },
      DELETE: async ({ params }) => {
        const messageId = Number(params.id);
        if (!Number.isSafeInteger(messageId) || messageId <= 0) {
          return Response.json(
            { ok: false, status: 400, message: "Invalid chat message." },
            { status: 400 },
          );
        }
        return mutationResponse(await deleteChatMessage(messageId));
      },
    },
  },
});
