import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  getAdminChatInbox,
  getAdminChatThread,
  getAdminChatUnreadCount,
  getAlumniChatThread,
  handoffAlumniChatToAgent,
  sendAdminChatMessage,
  sendAlumniChatMessage,
} from "./chat.server";

const alumniMessageSchema = z.object({ message: z.string().max(4000) });
const sessionSchema = z.object({ sessionId: z.number().int().positive() });
const adminMessageSchema = sessionSchema.extend({ message: z.string().max(4000) });

export const getAlumniChat = createServerFn({ method: "GET" }).handler(async () =>
  getAlumniChatThread(),
);

export const sendAlumniChat = createServerFn({ method: "POST" })
  .validator(alumniMessageSchema)
  .handler(async ({ data }) => sendAlumniChatMessage(data.message));

export const handoffAlumniChat = createServerFn({ method: "POST" }).handler(async () =>
  handoffAlumniChatToAgent(),
);

export const getAdminChatConversations = createServerFn({ method: "GET" }).handler(async () =>
  getAdminChatInbox(),
);

export const getAdminChatUnread = createServerFn({ method: "GET" }).handler(async () =>
  getAdminChatUnreadCount(),
);

export const getAdminChatMessages = createServerFn({ method: "POST" })
  .validator(sessionSchema)
  .handler(async ({ data }) => getAdminChatThread(data.sessionId));

export const sendAdminChat = createServerFn({ method: "POST" })
  .validator(adminMessageSchema)
  .handler(async ({ data }) => sendAdminChatMessage(data.sessionId, data.message));
