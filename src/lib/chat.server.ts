import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

import { requireAdmin } from "./admin.server";
import { getSessionUser } from "./auth.server";
import { getPool } from "./db.server";
import { relativeTime } from "./profile-format";
import type {
  AdminChatConversation,
  AdminChatInboxResult,
  AlumniChatResult,
  ChatActionResult,
  ChatMessage,
  ChatMode,
  ChatSender,
  ChatStatus,
} from "./chat.types";

const BOT_NAME = "OARCC Virtual Assistant";
const INITIAL_GREETING = "Thank you for getting in touch with OARCC. How may I help you today?";
const HANDOFF_NOTICE = "You are now connected with OARCC Admin Support. Type your message below.";
const MAX_MESSAGE_LENGTH = 4000;
let tablesPromise: Promise<void> | null = null;

/** Create chat tables lazily on API use; same code works against local or Aiven MySQL. */
export function ensureChatTables(): Promise<void> {
  if (!tablesPromise) {
    tablesPromise = (async () => {
      const pool = getPool();
      await pool.query(`
        CREATE TABLE IF NOT EXISTS chat_sessions (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          alumni_user_id BIGINT UNSIGNED NOT NULL,
          mode ENUM('bot', 'agent') NOT NULL DEFAULT 'bot',
          status ENUM('open', 'resolved') NOT NULL DEFAULT 'open',
          unread_admin_count INT UNSIGNED NOT NULL DEFAULT 0,
          unread_alumni_count INT UNSIGNED NOT NULL DEFAULT 0,
          last_message_preview VARCHAR(255) NULL,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_chat_sessions_alumni (alumni_user_id, status, updated_at),
          KEY idx_chat_sessions_inbox (mode, status, updated_at),
          CONSTRAINT fk_chat_sessions_alumni FOREIGN KEY (alumni_user_id)
            REFERENCES users (id) ON DELETE CASCADE
        ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS chat_messages (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          session_id BIGINT UNSIGNED NOT NULL,
          sender_type ENUM('alumni', 'bot', 'admin') NOT NULL,
          sender_name VARCHAR(100) NULL,
          message TEXT NOT NULL,
          is_read TINYINT(1) NOT NULL DEFAULT 0,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_chat_messages_session (session_id, id),
          KEY idx_chat_messages_unread (session_id, sender_type, is_read),
          CONSTRAINT fk_chat_messages_session FOREIGN KEY (session_id)
            REFERENCES chat_sessions (id) ON DELETE CASCADE
        ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
      `);
    })().catch((error) => {
      tablesPromise = null;
      throw error;
    });
  }
  return tablesPromise;
}

type SessionRow = RowDataPacket & {
  id: number;
  alumni_user_id: number;
  mode: ChatMode;
  status: ChatStatus;
  unread_admin_count: number;
  unread_alumni_count: number;
  last_message_preview: string | null;
  updated_at: Date | string;
};

type MessageRow = RowDataPacket & {
  id: number;
  sender_type: ChatSender;
  sender_name: string | null;
  message: string;
  is_read: number | boolean;
  created_at: Date | string;
};

type InboxRow = SessionRow & {
  alumni_name: string | null;
  email: string;
  course: string | null;
  batch_year: number | null;
  batch_grad_year: number | string | null;
};

function asDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function toMessage(row: MessageRow): ChatMessage {
  const date = asDate(row.created_at);
  return {
    id: Number(row.id),
    senderType: row.sender_type,
    senderName: row.sender_name,
    message: row.message,
    isRead: row.is_read === 1 || row.is_read === true,
    createdAt: Number.isNaN(date.getTime()) ? "" : date.toISOString(),
    timeLabel: relativeTime(date),
  };
}

function conversationFromRow(row: InboxRow): AdminChatConversation {
  const date = asDate(row.updated_at);
  const yearValue = row.batch_grad_year ?? row.batch_year;
  const year = yearValue === null ? "—" : String(Number(yearValue));
  return {
    id: Number(row.id),
    alumniUserId: Number(row.alumni_user_id),
    alumniName: row.alumni_name?.trim() || row.email,
    course: row.course?.trim() || "Course not provided",
    batch: year,
    mode: row.mode,
    status: row.status,
    unreadAdminCount: Number(row.unread_admin_count ?? 0),
    lastMessagePreview: row.last_message_preview?.trim() || "No messages yet",
    updatedAt: Number.isNaN(date.getTime()) ? "" : date.toISOString(),
    updatedLabel: relativeTime(date),
  };
}

async function listMessages(sessionId: number): Promise<ChatMessage[]> {
  const [rows] = await getPool().execute<MessageRow[]>(
    `SELECT id, sender_type, sender_name, message, is_read, created_at
       FROM chat_messages
      WHERE session_id = ?
      ORDER BY id ASC
      LIMIT 500`,
    [sessionId],
  );
  return rows.map(toMessage);
}

async function getOrCreateOpenSession(alumniUserId: number): Promise<SessionRow> {
  const pool = getPool();
  const [rows] = await pool.execute<SessionRow[]>(
    `SELECT id, alumni_user_id, mode, status, unread_admin_count, unread_alumni_count,
            last_message_preview, updated_at
       FROM chat_sessions
      WHERE alumni_user_id = ? AND status = 'open'
      ORDER BY updated_at DESC, id DESC
      LIMIT 1`,
    [alumniUserId],
  );
  if (rows[0]) return rows[0];

  const [insert] = await pool.execute<ResultSetHeader>(
    `INSERT INTO chat_sessions (alumni_user_id, mode, status, last_message_preview)
     VALUES (?, 'bot', 'open', ?)`,
    [alumniUserId, INITIAL_GREETING],
  );
  const sessionId = Number(insert.insertId);
  await pool.execute(
    `INSERT INTO chat_messages (session_id, sender_type, sender_name, message, is_read)
     VALUES (?, 'bot', ?, ?, 1)`,
    [sessionId, BOT_NAME, INITIAL_GREETING],
  );
  const [created] = await pool.execute<SessionRow[]>(
    `SELECT id, alumni_user_id, mode, status, unread_admin_count, unread_alumni_count,
            last_message_preview, updated_at
       FROM chat_sessions WHERE id = ? LIMIT 1`,
    [sessionId],
  );
  if (!created[0]) throw new Error("Could not create a support chat session.");
  return created[0];
}

/** Initial thread fetch also marks admin replies as read by the alumnus. */
export async function getAlumniChatThread(): Promise<AlumniChatResult> {
  const user = await getSessionUser();
  if (!user || user.role !== "alumni")
    return { ok: false, message: "Sign in with an alumni account to use OARCC chat." };
  try {
    await ensureChatTables();
    const session = await getOrCreateOpenSession(user.id);
    await getPool().execute(
      `UPDATE chat_messages SET is_read = 1
        WHERE session_id = ? AND sender_type IN ('admin', 'bot')`,
      [session.id],
    );
    await getPool().execute(`UPDATE chat_sessions SET unread_alumni_count = 0 WHERE id = ?`, [
      session.id,
    ]);
    return {
      ok: true,
      session: {
        id: Number(session.id),
        mode: session.mode,
        status: session.status,
        messages: await listMessages(Number(session.id)),
      },
    };
  } catch (error) {
    console.error("[chat] Alumni thread load failed:", error);
    return { ok: false, message: "OARCC chat is unavailable right now. Please try again." };
  }
}

function botAnswer(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes("verified") || normalized.includes("verification")) {
    return "Register or sign in to your alumni account, complete your profile, and submit it for OARCC verification. You can check your verification status on your Dashboard.";
  }
  if (
    normalized.includes("employment") ||
    normalized.includes("map pin") ||
    normalized.includes("workplace")
  ) {
    return "Sign in and update your Employment History and Present Address. To manage whether your pin is visible, visit Privacy & Settings and save your GIS preferences.";
  }
  if (normalized.includes("id") || normalized.includes("certificate")) {
    return "For an Alumni ID or certificate request, please contact the OARCC office with your full name, course, and graduation year. An OARCC agent can help with the current requirements.";
  }
  if (
    normalized.includes("hours") ||
    normalized.includes("location") ||
    normalized.includes("office")
  ) {
    return "The Office of Alumni Relations and Career Center (OARCC) is on the MSU Main Campus in Marawi City. Please contact the office directly to confirm current office hours.";
  }
  return "I can help with profile verification, employment and map updates, Alumni ID or certificates, and OARCC office information. Choose a quick question or chat with an OARCC agent for more help.";
}

export async function sendAlumniChatMessage(messageInput: string): Promise<AlumniChatResult> {
  const user = await getSessionUser();
  if (!user || user.role !== "alumni")
    return { ok: false, message: "Sign in with an alumni account to use OARCC chat." };
  const message = (messageInput ?? "").trim().slice(0, MAX_MESSAGE_LENGTH);
  if (!message) return { ok: false, message: "Type a message first." };

  try {
    await ensureChatTables();
    const session = await getOrCreateOpenSession(user.id);
    const pool = getPool();
    await pool.execute(
      `INSERT INTO chat_messages (session_id, sender_type, sender_name, message, is_read)
       VALUES (?, 'alumni', ?, ?, 0)`,
      [session.id, user.fullName ?? user.email, message],
    );
    if (session.mode === "agent") {
      await pool.execute(
        `UPDATE chat_sessions
            SET unread_admin_count = unread_admin_count + 1,
                last_message_preview = ?
          WHERE id = ?`,
        [message.slice(0, 255), session.id],
      );
    } else {
      const answer = botAnswer(message);
      await pool.execute(
        `INSERT INTO chat_messages (session_id, sender_type, sender_name, message, is_read)
         VALUES (?, 'bot', ?, ?, 1)`,
        [session.id, BOT_NAME, answer],
      );
      await pool.execute(`UPDATE chat_sessions SET last_message_preview = ? WHERE id = ?`, [
        answer.slice(0, 255),
        session.id,
      ]);
    }
    return getAlumniChatThread();
  } catch (error) {
    console.error("[chat] Alumni message failed:", error);
    return { ok: false, message: "Your message could not be sent. Please try again." };
  }
}

export async function handoffAlumniChatToAgent(): Promise<AlumniChatResult> {
  const user = await getSessionUser();
  if (!user || user.role !== "alumni")
    return { ok: false, message: "Sign in with an alumni account to use OARCC chat." };
  try {
    await ensureChatTables();
    const session = await getOrCreateOpenSession(user.id);
    const pool = getPool();
    if (session.mode !== "agent") {
      await pool.execute(
        `UPDATE chat_sessions
            SET mode = 'agent', unread_admin_count = unread_admin_count + 1,
                last_message_preview = ?
          WHERE id = ?`,
        [HANDOFF_NOTICE, session.id],
      );
      await pool.execute(
        `INSERT INTO chat_messages (session_id, sender_type, sender_name, message, is_read)
         VALUES (?, 'bot', ?, ?, 1)`,
        [session.id, BOT_NAME, HANDOFF_NOTICE],
      );
    }
    return getAlumniChatThread();
  } catch (error) {
    console.error("[chat] Agent handoff failed:", error);
    return { ok: false, message: "We could not connect you to an OARCC agent. Please try again." };
  }
}

/** Head and Standard Admins may access inbox data; Viewer Admins are denied. */
export async function getAdminChatInbox(): Promise<AdminChatInboxResult> {
  const access = await requireAdmin("standard");
  if (!access.ok) return { ok: false, message: access.message };
  try {
    await ensureChatTables();
    const [rows] = await getPool().query<InboxRow[]>(`
      SELECT s.id, s.alumni_user_id, s.mode, s.status,
             s.unread_admin_count, s.unread_alumni_count,
             s.last_message_preview, s.updated_at,
             u.email, u.full_name AS alumni_name,
             p.course, p.batch_year,
             (SELECT YEAR(edu.graduated_on)
                FROM alumni_education edu
               WHERE edu.user_id = s.alumni_user_id
                 AND edu.level = 'Baccalaureate Degree'
                 AND edu.graduated_on IS NOT NULL
               ORDER BY edu.graduated_on DESC LIMIT 1) AS batch_grad_year
        FROM chat_sessions s
        JOIN users u ON u.id = s.alumni_user_id AND COALESCE(u.is_deleted, 0) = 0
        LEFT JOIN alumni_profiles p ON p.user_id = s.alumni_user_id
       WHERE s.mode = 'agent'
          OR EXISTS (
               SELECT 1 FROM chat_messages m
                WHERE m.session_id = s.id AND m.sender_type = 'alumni'
             )
       ORDER BY s.updated_at DESC, s.id DESC
       LIMIT 500
    `);
    const conversations = rows.map(conversationFromRow);
    return {
      ok: true,
      conversations,
      unreadTotal: conversations.reduce((total, item) => total + item.unreadAdminCount, 0),
    };
  } catch (error) {
    console.error("[chat] Admin inbox load failed:", error);
    return { ok: false, message: "Messages could not be loaded right now." };
  }
}

export async function getAdminChatUnreadCount(): Promise<number> {
  const access = await requireAdmin("standard");
  if (!access.ok) return 0;
  try {
    await ensureChatTables();
    const [[row]] = await getPool().query<Array<RowDataPacket & { total: number }>>(
      `SELECT COALESCE(SUM(unread_admin_count), 0) AS total
         FROM chat_sessions
        WHERE mode = 'agent' OR EXISTS (
          SELECT 1 FROM chat_messages m
           WHERE m.session_id = chat_sessions.id AND m.sender_type = 'alumni'
        )`,
    );
    return Number(row?.total ?? 0);
  } catch (error) {
    console.error("[chat] Unread count failed:", error);
    return 0;
  }
}

export async function getAdminChatThread(sessionId: number): Promise<AlumniChatResult> {
  const access = await requireAdmin("standard");
  if (!access.ok) return { ok: false, message: access.message };
  if (!Number.isInteger(sessionId) || sessionId <= 0)
    return { ok: false, message: "Invalid support conversation." };
  try {
    await ensureChatTables();
    const pool = getPool();
    const [rows] = await pool.execute<SessionRow[]>(
      `SELECT id, alumni_user_id, mode, status, unread_admin_count, unread_alumni_count,
              last_message_preview, updated_at
         FROM chat_sessions s
        WHERE id = ?
          AND (mode = 'agent' OR EXISTS (
            SELECT 1 FROM chat_messages m
             WHERE m.session_id = s.id AND m.sender_type = 'alumni'
          ))
        LIMIT 1`,
      [sessionId],
    );
    const session = rows[0];
    if (!session) return { ok: false, message: "That conversation could not be found." };
    await pool.execute(
      `UPDATE chat_messages SET is_read = 1
        WHERE session_id = ? AND sender_type = 'alumni'`,
      [sessionId],
    );
    await pool.execute(`UPDATE chat_sessions SET unread_admin_count = 0 WHERE id = ?`, [sessionId]);
    return {
      ok: true,
      session: {
        id: Number(session.id),
        mode: session.mode,
        status: session.status,
        messages: await listMessages(sessionId),
      },
    };
  } catch (error) {
    console.error("[chat] Admin thread load failed:", error);
    return { ok: false, message: "The conversation could not be loaded right now." };
  }
}

export async function sendAdminChatMessage(
  sessionId: number,
  messageInput: string,
): Promise<ChatActionResult> {
  const access = await requireAdmin("standard");
  if (!access.ok) return { ok: false, message: access.message };
  const message = (messageInput ?? "").trim().slice(0, MAX_MESSAGE_LENGTH);
  if (!Number.isInteger(sessionId) || sessionId <= 0 || !message)
    return { ok: false, message: "Choose a conversation and enter a message." };
  try {
    await ensureChatTables();
    const pool = getPool();
    const [sessionRows] = await pool.execute<SessionRow[]>(
      `SELECT id, alumni_user_id, mode, status, unread_admin_count, unread_alumni_count,
              last_message_preview, updated_at
         FROM chat_sessions WHERE id = ? LIMIT 1`,
      [sessionId],
    );
    if (!sessionRows[0]) return { ok: false, message: "That conversation could not be found." };
    await pool.execute(
      `INSERT INTO chat_messages (session_id, sender_type, sender_name, message, is_read)
       VALUES (?, 'admin', ?, ?, 0)`,
      [sessionId, access.admin.fullName ?? access.admin.email, message],
    );
    await pool.execute(
      `UPDATE chat_sessions
          SET mode = 'agent', status = 'open', unread_alumni_count = unread_alumni_count + 1,
              last_message_preview = ?
        WHERE id = ?`,
      [message.slice(0, 255), sessionId],
    );
    return { ok: true, message: "Reply sent." };
  } catch (error) {
    console.error("[chat] Admin reply failed:", error);
    return { ok: false, message: "Your reply could not be sent. Please try again." };
  }
}
