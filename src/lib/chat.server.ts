import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";

import { requireAdmin } from "./admin.server";
import { getSessionUser } from "./auth.server";
import { getPool } from "./db.server";
import { relativeTime } from "./profile-format";
import { avatarUrlForUser, ensureAvatarSchema } from "./avatar.server";
import type {
  AdminChatConversation,
  AdminChatInboxResult,
  AlumniChatResult,
  ChatActionResult,
  ChatEditVersion,
  ChatMessage,
  ChatMutationResult,
  ChatMode,
  ChatSender,
  ChatStatus,
} from "./chat.types";

const BOT_NAME = "OARCC Virtual Assistant";
const INITIAL_GREETING = "Thank you for getting in touch with OARCC. How may I help you today?";
const HANDOFF_NOTICE =
  "Connecting you to an OARCC Admin agent... Please send a message to get started.";
const ADMIN_REPLY_FOLLOW_UP = "Our OARCC agent has responded above. How else can I help you today?";
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
          is_deleted TINYINT(1) NOT NULL DEFAULT 0,
          is_edited TINYINT(1) NOT NULL DEFAULT 0,
          edit_history JSON NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_chat_messages_session (session_id, id),
          KEY idx_chat_messages_unread (session_id, sender_type, is_read),
          CONSTRAINT fk_chat_messages_session FOREIGN KEY (session_id)
            REFERENCES chat_sessions (id) ON DELETE CASCADE
        ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
      `);
      const [columns] = await pool.query<Array<RowDataPacket & { COLUMN_NAME: string }>>(
        `SELECT COLUMN_NAME
           FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'chat_messages'
            AND COLUMN_NAME IN ('is_deleted', 'is_edited', 'edit_history')`,
      );
      const existingColumns = new Set(columns.map((column) => column.COLUMN_NAME));
      const editColumns = [
        ["is_deleted", "TINYINT(1) NOT NULL DEFAULT 0"],
        ["is_edited", "TINYINT(1) NOT NULL DEFAULT 0"],
        ["edit_history", "JSON NULL"],
      ] as const;
      for (const [name, definition] of editColumns) {
        if (existingColumns.has(name)) continue;
        try {
          await pool.query(`ALTER TABLE chat_messages ADD COLUMN ${name} ${definition}`);
        } catch (error) {
          if ((error as { code?: string }).code !== "ER_DUP_FIELDNAME") throw error;
        }
      }
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
  is_deleted: number | boolean;
  is_edited: number | boolean;
  edit_history: string | ChatEditVersion[] | null;
  created_at: Date | string;
};

type EditableMessageRow = MessageRow & {
  session_id: number;
  alumni_user_id: number;
};

type InboxRow = SessionRow & {
  alumni_name: string | null;
  email: string;
  course: string | null;
  batch_year: number | null;
  batch_grad_year: number | string | null;
  has_avatar: number | boolean;
  avatar_updated_at: Date | string | null;
};

function asDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function parseEditHistory(value: MessageRow["edit_history"]): ChatEditVersion[] {
  if (!value) return [];
  let history: unknown = value;
  if (typeof value === "string") {
    try {
      history = JSON.parse(value) as unknown;
    } catch {
      return [];
    }
  }
  if (!Array.isArray(history)) return [];
  return history.flatMap((entry): ChatEditVersion[] => {
    if (typeof entry === "string") return [{ message: entry, editedAt: "" }];
    if (
      entry &&
      typeof entry === "object" &&
      "message" in entry &&
      typeof entry.message === "string"
    ) {
      return [
        {
          message: entry.message,
          editedAt: "editedAt" in entry && typeof entry.editedAt === "string" ? entry.editedAt : "",
        },
      ];
    }
    return [];
  });
}

function toMessage(row: MessageRow): ChatMessage {
  const date = asDate(row.created_at);
  return {
    id: Number(row.id),
    senderType: row.sender_type,
    senderName: row.sender_name,
    message: row.message,
    isRead: row.is_read === 1 || row.is_read === true,
    isEdited: row.is_edited === 1 || row.is_edited === true,
    isDeleted: row.is_deleted === 1 || row.is_deleted === true,
    editHistory: parseEditHistory(row.edit_history),
    createdAt: Number.isNaN(date.getTime()) ? "" : date.toISOString(),
    timeLabel: relativeTime(date),
  };
}

function conversationFromRow(row: InboxRow): AdminChatConversation {
  const date = asDate(row.updated_at);
  const yearValue = row.batch_grad_year ?? row.batch_year;
  const year = yearValue === null ? "-" : String(Number(yearValue));
  return {
    id: Number(row.id),
    alumniUserId: Number(row.alumni_user_id),
    alumniName: row.alumni_name?.trim() || row.email,
    avatarUrl: avatarUrlForUser(row.alumni_user_id, row.has_avatar, row.avatar_updated_at),
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
    `SELECT id, sender_type, sender_name, message, is_read,
            is_deleted, is_edited, edit_history, created_at
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
  if (
    normalized.includes("job") ||
    normalized.includes("career") ||
    normalized.includes("hiring") ||
    normalized.includes("opportunit") ||
    normalized.includes("vacanc") ||
    normalized.includes("work")
  ) {
    return 'You can browse verified career opportunities and hiring announcements from OARCC partner employers in the Job Offerings tab on your Alumni Dashboard or under Latest Posts. To get notified when roles match your degree, go to Privacy & Settings and turn on "New job offerings matching my course".';
  }
  if (
    normalized.includes("organization") ||
    normalized.includes("chapter") ||
    normalized.includes("affiliation") ||
    normalized.includes("group")
  ) {
    return "To add or update your alumni chapter, batch group, or professional affiliation, open the Organization tab in your Alumni Dashboard sidebar. Enter your organization name, role/position, and chapter details, then click Save so your profile stays connected with fellow MSU graduates.";
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
  return "I can help with job postings and career opportunities, alumni organizations and chapters, Alumni ID or certificates, and OARCC office information. Choose a quick question or chat with an OARCC agent for more help.";
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
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [sessionRows] = await connection.execute<SessionRow[]>(
        `SELECT id, alumni_user_id, mode, status, unread_admin_count, unread_alumni_count,
                last_message_preview, updated_at
           FROM chat_sessions WHERE id = ? FOR UPDATE`,
        [session.id],
      );
      const currentSession = sessionRows[0];
      if (!currentSession) {
        await connection.rollback();
        return { ok: false, message: "That conversation could not be found." };
      }
      if (currentSession.mode !== "agent") {
        await connection.execute(
          `UPDATE chat_sessions
              SET mode = 'agent', status = 'open', last_message_preview = ?
            WHERE id = ?`,
          [HANDOFF_NOTICE, session.id],
        );
        await connection.execute(
          `INSERT INTO chat_messages (session_id, sender_type, sender_name, message, is_read)
           VALUES (?, 'bot', ?, ?, 1)`,
          [session.id, BOT_NAME, HANDOFF_NOTICE],
        );
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
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
    await ensureAvatarSchema();
    const [rows] = await getPool().query<InboxRow[]>(`
      SELECT s.id, s.alumni_user_id, s.mode, s.status,
             s.unread_admin_count, s.unread_alumni_count,
             s.last_message_preview, s.updated_at,
             u.email, u.full_name AS alumni_name,
              p.course, p.batch_year,
              (p.avatar_data IS NOT NULL) AS has_avatar, p.avatar_updated_at,
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
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [sessionRows] = await connection.execute<SessionRow[]>(
        `SELECT id, alumni_user_id, mode, status, unread_admin_count, unread_alumni_count,
                last_message_preview, updated_at
           FROM chat_sessions WHERE id = ? FOR UPDATE`,
        [sessionId],
      );
      if (!sessionRows[0]) {
        await connection.rollback();
        return { ok: false, message: "That conversation could not be found." };
      }

      await connection.execute(
        `INSERT INTO chat_messages (session_id, sender_type, sender_name, message, is_read)
         VALUES (?, 'admin', ?, ?, 0)`,
        [sessionId, access.admin.fullName ?? access.admin.email, message],
      );
      await connection.execute(
        `UPDATE chat_sessions
            SET mode = 'bot', status = 'open', unread_alumni_count = unread_alumni_count + 1,
                last_message_preview = ?
          WHERE id = ?`,
        [message.slice(0, 255), sessionId],
      );
      await connection.execute(
        `INSERT INTO chat_messages (session_id, sender_type, sender_name, message, is_read)
         VALUES (?, 'bot', ?, ?, 1)`,
        [sessionId, BOT_NAME, ADMIN_REPLY_FOLLOW_UP],
      );
      await connection.execute(`UPDATE chat_sessions SET last_message_preview = ? WHERE id = ?`, [
        ADMIN_REPLY_FOLLOW_UP.slice(0, 255),
        sessionId,
      ]);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    return { ok: true, message: "Reply sent." };
  } catch (error) {
    console.error("[chat] Admin reply failed:", error);
    return { ok: false, message: "Your reply could not be sent. Please try again." };
  }
}

type ChatMessageActor = { senderType: "alumni"; alumniUserId: number } | { senderType: "admin" };

async function getChatMessageActor(): Promise<
  { ok: true; actor: ChatMessageActor } | { ok: false; message: string; status: 401 | 403 }
> {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, status: 401, message: "Sign in to manage your chat messages." };
  }
  if (user.role === "alumni") {
    return { ok: true, actor: { senderType: "alumni", alumniUserId: user.id } };
  }
  const access = await requireAdmin("standard");
  if (!access.ok) return { ok: false, status: 403, message: access.message };
  return { ok: true, actor: { senderType: "admin" } };
}

async function mutateChatMessage(
  messageId: number,
  action: "edit" | "delete",
  messageInput?: string,
): Promise<ChatMutationResult> {
  const authorization = await getChatMessageActor();
  if (!authorization.ok) return authorization;
  if (!Number.isSafeInteger(messageId) || messageId <= 0) {
    return { ok: false, status: 400, message: "Invalid chat message." };
  }

  const message = (messageInput ?? "").trim().slice(0, MAX_MESSAGE_LENGTH);
  if (action === "edit" && !message) {
    return { ok: false, status: 400, message: "A message cannot be empty." };
  }

  let connection: PoolConnection | null = null;
  try {
    await ensureChatTables();
    connection = await getPool().getConnection();
    await connection.beginTransaction();
    const [rows] = await connection.execute<EditableMessageRow[]>(
      `SELECT m.id, m.session_id, m.sender_type, m.sender_name, m.message,
              m.is_read, m.is_deleted, m.is_edited, m.edit_history, m.created_at,
              s.alumni_user_id
         FROM chat_messages m
         JOIN chat_sessions s ON s.id = m.session_id
        WHERE m.id = ?
        LIMIT 1
        FOR UPDATE`,
      [messageId],
    );
    const row = rows[0];
    if (!row || row.is_deleted === 1 || row.is_deleted === true) {
      await connection.rollback();
      return { ok: false, status: 404, message: "That message could not be found." };
    }
    const actor = authorization.actor;
    const isOwner =
      row.sender_type === actor.senderType &&
      (actor.senderType !== "alumni" || Number(row.alumni_user_id) === actor.alumniUserId);
    if (!isOwner || row.sender_type === "bot") {
      await connection.rollback();
      return { ok: false, status: 404, message: "That message could not be found." };
    }

    if (action === "edit") {
      const history = parseEditHistory(row.edit_history);
      history.push({ message: row.message, editedAt: new Date().toISOString() });
      await connection.execute(
        `UPDATE chat_messages
            SET message = ?, is_edited = 1, edit_history = ?
          WHERE id = ?`,
        [message, JSON.stringify(history), messageId],
      );
    } else {
      await connection.execute(
        `UPDATE chat_messages
            SET message = '', is_deleted = 1, is_edited = 0, edit_history = NULL
          WHERE id = ?`,
        [messageId],
      );
    }

    const [[latest]] = await connection.execute<
      Array<RowDataPacket & { latest_id: number | null }>
    >(`SELECT MAX(id) AS latest_id FROM chat_messages WHERE session_id = ?`, [row.session_id]);
    if (Number(latest?.latest_id) === Number(row.id)) {
      await connection.execute(
        `UPDATE chat_sessions
            SET last_message_preview = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`,
        [action === "delete" ? "Message deleted" : message.slice(0, 255), row.session_id],
      );
    } else {
      await connection.execute(
        `UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [row.session_id],
      );
    }
    await connection.commit();
    return {
      ok: true,
      message: action === "edit" ? "Message edited." : "Message deleted.",
    };
  } catch (error) {
    if (connection) await connection.rollback();
    console.error(`[chat] Message ${action} failed:`, error);
    return {
      ok: false,
      status: 500,
      message:
        action === "edit"
          ? "The message could not be updated."
          : "The message could not be deleted.",
    };
  } finally {
    connection?.release();
  }
}

export function editChatMessage(messageId: number, message: string): Promise<ChatMutationResult> {
  return mutateChatMessage(messageId, "edit", message);
}

export function deleteChatMessage(messageId: number): Promise<ChatMutationResult> {
  return mutateChatMessage(messageId, "delete");
}
