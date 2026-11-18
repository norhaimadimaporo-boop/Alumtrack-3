import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Loader2, MessageCircle, Send } from "lucide-react";

import { AdminShell } from "@/components/admin-shell";
import { ChatMessageItem } from "@/components/chat-message-item";
import { deleteMessage, editMessage } from "@/lib/chat-message-client";
import { AvatarImage } from "@/components/profile-avatar";
import {
  getAdminChatConversations,
  getAdminChatMessages,
  sendAdminChat,
} from "@/lib/chat.functions";
import type { AdminChatConversation, ChatMessage } from "@/lib/chat.types";

export const Route = createFileRoute("/admin/messages")({
  head: () => ({
    meta: [
      { title: "Messages — AlumTrack Admin" },
      {
        name: "description",
        content: "Read and reply to alumni support conversations in the OARCC admin inbox.",
      },
    ],
  }),
  loader: async () => getAdminChatConversations(),
  component: AdminMessagesPage,
});

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return `${parts[0]?.[0] ?? "A"}${parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : ""}`.toUpperCase();
}

function AdminMessagesPage() {
  const initialData = Route.useLoaderData();
  const [conversations, setConversations] = useState<AdminChatConversation[]>(
    initialData.ok ? initialData.conversations : [],
  );
  const [unreadTotal, setUnreadTotal] = useState(initialData.ok ? initialData.unreadTotal : 0);
  const [activeId, setActiveId] = useState<number | null>(
    initialData.ok ? (initialData.conversations[0]?.id ?? null) : null,
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(initialData.ok ? "" : initialData.message);

  const activeConversation = useMemo(
    () => conversations.find((item) => item.id === activeId) ?? null,
    [conversations, activeId],
  );

  const refreshInbox = useCallback(async () => {
    try {
      const result = await getAdminChatConversations();
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setConversations(result.conversations);
      setUnreadTotal(result.unreadTotal);
      setError("");
      setActiveId((current) => {
        if (current && result.conversations.some((item) => item.id === current)) return current;
        return result.conversations[0]?.id ?? null;
      });
    } catch (refreshError) {
      console.error("[admin-chat] Inbox refresh failed:", refreshError);
    }
  }, []);

  const refreshThread = useCallback(async (sessionId: number) => {
    try {
      const result = await getAdminChatMessages({ data: { sessionId } });
      if (result.ok) setMessages(result.session.messages);
      else setError(result.message);
    } catch (threadError) {
      console.error("[admin-chat] Thread refresh failed:", threadError);
    }
  }, []);

  useEffect(() => {
    if (activeId === null) {
      setMessages([]);
      return;
    }
    let active = true;
    setLoadingThread(true);
    void getAdminChatMessages({ data: { sessionId: activeId } })
      .then((result) => {
        if (!active) return;
        if (result.ok) setMessages(result.session.messages);
        else setError(result.message);
      })
      .catch((threadError: unknown) => {
        if (!active) return;
        console.error("[admin-chat] Thread load failed:", threadError);
        setError("The conversation could not be loaded right now.");
      })
      .finally(() => {
        if (active) setLoadingThread(false);
      });
    return () => {
      active = false;
    };
  }, [activeId]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void refreshInbox();
      if (activeId !== null) void refreshThread(activeId);
    }, 3500);
    return () => window.clearInterval(timer);
  }, [activeId, refreshInbox, refreshThread]);

  const submitReply = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = draft.trim();
    if (!activeId || !message || sending) return;
    setSending(true);
    setError("");
    setDraft("");
    try {
      const result = await sendAdminChat({ data: { sessionId: activeId, message } });
      if (!result.ok) {
        setDraft(message);
        setError(result.message);
      } else {
        await Promise.all([refreshThread(activeId), refreshInbox()]);
      }
    } catch (sendError) {
      console.error("[admin-chat] Reply failed:", sendError);
      setDraft(message);
      setError("Your reply could not be sent. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <AdminShell title="Messages" subtitle="OARCC support conversations with alumni.">
      {error && conversations.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-6">
          <p className="text-sm font-semibold text-foreground">Messages unavailable</p>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        </div>
      ) : (
        <div className="grid h-[min(680px,calc(100dvh-220px))] min-h-[480px] w-full min-w-0 overflow-hidden rounded-2xl border border-border bg-card shadow-sm md:grid-cols-[280px_minmax(0,1fr)] lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="flex min-h-0 min-w-0 flex-col border-b border-border md:border-b-0 md:border-r">
            <div className="border-b border-border px-4 py-3">
              <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
                <MessageCircle className="size-4 text-brand" /> Conversations
              </h2>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {conversations.length} conversation{conversations.length === 1 ? "" : "s"} ·{" "}
                {unreadTotal} unread
              </p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <p className="px-4 py-10 text-center text-xs text-muted-foreground">
                  No alumni conversations yet. Agent handoffs and alumni messages will appear here.
                </p>
              ) : (
                conversations.map((conversation) => {
                  const selected = conversation.id === activeId;
                  const unread = conversation.unreadAdminCount > 0;
                  return (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => setActiveId(conversation.id)}
                      className={`flex w-full min-w-0 items-center gap-3 border-b border-border px-3 py-3 text-left transition-colors hover:bg-muted/60 ${selected ? "bg-brand/5" : ""}`}
                    >
                      <AvatarImage
                        userId={conversation.alumniUserId}
                        name={conversation.alumniName}
                        initials={initials(conversation.alumniName)}
                        avatarUrl={conversation.avatarUrl}
                        sizeClassName="size-11 ring-2 ring-highlight/60"
                        textClassName="text-xs"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex min-w-0 items-center justify-between gap-2">
                          <span
                            className={`truncate text-xs ${unread ? "font-bold text-foreground" : "font-semibold text-foreground/90"}`}
                          >
                            {conversation.alumniName}
                          </span>
                          <span className="shrink-0 text-[9px] text-muted-foreground">
                            {conversation.updatedLabel}
                          </span>
                        </span>
                        <span className="mt-0.5 flex min-w-0 items-center gap-1.5">
                          <span className="min-w-0 truncate text-[10px] text-muted-foreground">
                            {conversation.course} · Batch {conversation.batch}
                          </span>
                          <span
                            className={`shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-semibold leading-none ${
                              conversation.mode === "agent"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {conversation.mode === "agent"
                              ? "Agent Requested"
                              : "Bot Active / Replied"}
                          </span>
                        </span>
                        <span
                          className={`mt-1 block truncate text-[11px] ${unread ? "font-bold text-foreground" : "text-muted-foreground"}`}
                        >
                          {conversation.lastMessagePreview}
                        </span>
                      </span>
                      {unread && (
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand text-[9px] font-bold text-brand-foreground">
                          {conversation.unreadAdminCount > 99
                            ? "99+"
                            : conversation.unreadAdminCount}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          <section className="flex min-h-0 min-w-0 flex-col bg-[#FAF6F0]/50">
            {activeConversation ? (
              <>
                <header className="flex shrink-0 items-center gap-3 border-b border-border bg-card px-4 py-3">
                  <AvatarImage
                    userId={activeConversation.alumniUserId}
                    name={activeConversation.alumniName}
                    initials={initials(activeConversation.alumniName)}
                    avatarUrl={activeConversation.avatarUrl}
                    sizeClassName="size-10 ring-2 ring-highlight/60"
                    textClassName="text-xs"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-foreground">
                      {activeConversation.alumniName}
                    </span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {activeConversation.course} · Batch {activeConversation.batch}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-semibold ${
                      activeConversation.mode === "agent"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {activeConversation.mode === "agent"
                      ? "Agent Requested"
                      : "Bot Active / Replied"}
                  </span>
                </header>

                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-4 sm:px-5">
                  {loadingThread && messages.length === 0 && (
                    <div className="flex justify-center py-8 text-xs text-muted-foreground">
                      <Loader2 className="mr-2 size-4 animate-spin" /> Loading conversation…
                    </div>
                  )}
                  {messages.map((item) => (
                    <ChatMessageItem
                      key={item.id}
                      message={item}
                      own={item.senderType === "admin"}
                      theme="admin"
                      onEdit={async (id, text) => {
                        const ok = await editMessage(id, text);
                        if (ok && activeId !== null) await refreshThread(activeId);
                        return ok;
                      }}
                      onDelete={async (id) => {
                        const ok = await deleteMessage(id);
                        if (ok && activeId !== null) await refreshThread(activeId);
                        return ok;
                      }}
                    />
                  ))}
                </div>

                {error && (
                  <p
                    role="alert"
                    className="mx-4 mb-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700"
                  >
                    {error}
                  </p>
                )}
                <form
                  onSubmit={submitReply}
                  className="flex shrink-0 items-center gap-2 border-t border-border bg-card p-3 sm:p-4"
                >
                  <input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    maxLength={4000}
                    aria-label="Reply to alumni"
                    placeholder="Write a reply…"
                    className="min-w-0 flex-1 rounded-full border border-border bg-background px-4 py-2.5 text-xs text-foreground outline-none focus:border-brand"
                  />
                  <button
                    type="submit"
                    disabled={!draft.trim() || sending}
                    className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand text-brand-foreground hover:bg-brand-dark disabled:opacity-40"
                    aria-label="Send reply"
                  >
                    {sending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Send className="size-4" />
                    )}
                  </button>
                </form>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                <MessageCircle className="size-10 text-brand/50" />
                <p className="mt-3 text-sm font-semibold text-foreground">Select a conversation</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Choose an alumni message from the list to read and reply.
                </p>
              </div>
            )}
          </section>
        </div>
      )}
    </AdminShell>
  );
}
