export type ChatMode = "bot" | "agent";
export type ChatStatus = "open" | "resolved";
export type ChatSender = "alumni" | "bot" | "admin";

export type ChatMessage = {
  id: number;
  senderType: ChatSender;
  senderName: string | null;
  message: string;
  isRead: boolean;
  createdAt: string;
  timeLabel: string;
};

export type AlumniChatSession = {
  id: number;
  mode: ChatMode;
  status: ChatStatus;
  messages: ChatMessage[];
};

export type AdminChatConversation = {
  id: number;
  alumniUserId: number;
  alumniName: string;
  course: string;
  batch: string;
  mode: ChatMode;
  status: ChatStatus;
  unreadAdminCount: number;
  lastMessagePreview: string;
  updatedAt: string;
  updatedLabel: string;
};

export type AlumniChatResult =
  { ok: true; session: AlumniChatSession } | { ok: false; message: string };

export type AdminChatInboxResult =
  | { ok: true; conversations: AdminChatConversation[]; unreadTotal: number }
  | { ok: false; message: string };

export type ChatActionResult = { ok: true; message: string } | { ok: false; message: string };
