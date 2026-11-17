import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Bot, MessageCircle, Send, X } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { getAlumniChat, handoffAlumniChat, sendAlumniChat } from "@/lib/chat.functions";
import type { AlumniChatSession } from "@/lib/chat.types";

const FAQS = [
  "How do I get my alumni profile verified?",
  "How do I update my employment & map pin?",
  "How do I request an Alumni ID or certificate?",
  "What are OARCC office hours & location?",
];

export function AlumniChatWidget() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [thread, setThread] = useState<AlumniChatSession | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const refreshThread = useCallback(async () => {
    try {
      const result = await getAlumniChat();
      if (result.ok) {
        setThread(result.session);
        setError("");
      } else {
        setError(result.message);
      }
    } catch (loadError) {
      console.error("[alumni-chat] Thread refresh failed:", loadError);
      setError("OARCC chat could not be loaded. Please try again.");
    }
  }, []);

  useEffect(() => {
    if (!open || thread) return;
    let active = true;
    setLoading(true);
    void getAlumniChat()
      .then((result) => {
        if (!active) return;
        if (result.ok) setThread(result.session);
        else setError(result.message);
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        console.error("[alumni-chat] Initial load failed:", loadError);
        setError("OARCC chat could not be loaded. Please try again.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, thread]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setInterval(() => void refreshThread(), 3500);
    return () => window.clearInterval(timer);
  }, [open, refreshThread]);

  useEffect(() => {
    if (!open) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [open, thread?.messages.length]);

  const submitMessage = async (value: string) => {
    const message = value.trim();
    if (!message || sending) return;
    setSending(true);
    setError("");
    setDraft("");
    try {
      const result = await sendAlumniChat({ data: { message } });
      if (result.ok) setThread(result.session);
      else {
        setDraft(message);
        setError(result.message);
      }
    } catch (sendError) {
      console.error("[alumni-chat] Send failed:", sendError);
      setDraft(message);
      setError("Your message could not be sent. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const requestAgent = async () => {
    if (sending) return;
    setSending(true);
    setError("");
    try {
      const result = await handoffAlumniChat();
      if (result.ok) setThread(result.session);
      else setError(result.message);
    } catch (handoffError) {
      console.error("[alumni-chat] Agent handoff failed:", handoffError);
      setError("We could not connect you to an OARCC agent. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const submitForm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submitMessage(draft);
  };

  return (
    <div className="fixed bottom-4 right-4 z-[55] flex max-w-[calc(100vw-2rem)] flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {open && (
        <section
          aria-label="OARCC support chat"
          className="flex h-[min(72vh,620px)] max-h-[calc(100dvh-6rem)] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-[#E6DFD5] bg-[#FAF6F0] shadow-2xl"
        >
          <header className="flex shrink-0 items-center gap-3 bg-[#7A1315] px-4 py-3 text-white transition-colors duration-300">
            {thread?.mode === "agent" ? (
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#FAF6F0] p-1 transition-all duration-300">
                <BrandMark className="size-full" />
              </span>
            ) : (
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/15 transition-all duration-300">
                <Bot className="size-5" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">
                {thread?.mode === "agent" ? "OARCC Support Agent" : "OARCC Virtual Assistant"}
              </p>
              <p className="text-[10px] text-white/75">
                {thread?.mode === "agent" ? "Live support" : "Automated support"}
              </p>
            </div>
            <button
              type="button"
              aria-label="Close chat"
              onClick={() => setOpen(false)}
              className="flex size-8 shrink-0 items-center justify-center rounded-full text-white/80 hover:bg-white/10 hover:text-white"
            >
              <X className="size-4" />
            </button>
          </header>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-4 sm:px-4">
            {loading && !thread && (
              <p className="text-center text-xs text-[#6B625B]">Loading OARCC chat…</p>
            )}
            {thread?.messages.map((item) => {
              const isAlumni = item.senderType === "alumni";
              return (
                <div key={item.id} className={`flex ${isAlumni ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[88%] rounded-2xl px-3 py-2 text-xs leading-relaxed shadow-sm ${
                      isAlumni
                        ? "rounded-br-sm bg-[#7A1315] text-white"
                        : "rounded-bl-sm border border-[#E6DFD5] bg-white text-[#312B27]"
                    }`}
                  >
                    {item.senderType === "bot" && (
                      <p className="mb-1 text-[10px] font-semibold text-[#7A1315]/65">
                        Sent by chat bot
                      </p>
                    )}
                    {item.senderType === "admin" && item.senderName && (
                      <p className="mb-1 text-[10px] font-semibold text-[#7A1315]">
                        {item.senderName}
                      </p>
                    )}
                    <p className="whitespace-pre-wrap break-words">{item.message}</p>
                    <p
                      className={`mt-1 text-right text-[9px] ${isAlumni ? "text-white/65" : "text-[#6B625B]/65"}`}
                    >
                      {item.timeLabel}
                    </p>
                  </div>
                </div>
              );
            })}
            {thread?.mode === "bot" && (
              <div className="space-y-2 rounded-xl border border-[#E6DFD5] bg-white/70 p-3">
                <p className="text-[11px] font-semibold text-[#766C64]">
                  How can I help you today?
                </p>
                {FAQS.map((question) => (
                  <button
                    key={question}
                    type="button"
                    disabled={sending}
                    onClick={() => void submitMessage(question)}
                    className="block w-full rounded-xl border border-[#7A1315]/20 bg-white px-3 py-2 text-left text-[11px] leading-snug text-[#7A1315] transition-colors hover:bg-[#7A1315]/5 disabled:opacity-50"
                  >
                    {question}
                  </button>
                ))}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {error && (
            <p
              role="alert"
              className="mx-3 mb-2 rounded-lg bg-red-50 px-3 py-2 text-[11px] text-red-700 sm:mx-4"
            >
              {error}
            </p>
          )}

          <div className="shrink-0 border-t border-[#E6DFD5] bg-white/80 px-3 py-3 sm:px-4">
            {thread?.mode === "bot" && (
              <p className="mb-2 text-[11px] text-[#6B625B]">
                Need more help?{" "}
                <button
                  type="button"
                  onClick={() => void requestAgent()}
                  disabled={sending}
                  className="font-bold text-[#7A1315] underline underline-offset-2 disabled:opacity-50"
                >
                  Chat with OARCC agent
                </button>
              </p>
            )}
            <form onSubmit={submitForm} className="flex items-center gap-2">
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                maxLength={4000}
                placeholder={thread?.mode === "agent" ? "Message OARCC…" : "Ask a question…"}
                aria-label="Type a support message"
                className="min-w-0 flex-1 rounded-full border border-[#E6DFD5] bg-[#FAF6F0] px-4 py-2.5 text-xs text-[#312B27] outline-none focus:border-[#7A1315]"
              />
              <button
                type="submit"
                aria-label="Send message"
                disabled={!draft.trim() || sending}
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#7A1315] text-white transition-colors hover:bg-[#5A0012] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send className="size-4" />
              </button>
            </form>
          </div>
        </section>
      )}

      <button
        type="button"
        aria-label={open ? "Close OARCC support chat" : "Open OARCC support chat"}
        onClick={() => setOpen((value) => !value)}
        className="flex size-14 items-center justify-center rounded-full bg-[#7A1315] text-white shadow-lg ring-2 ring-white/80 transition-transform hover:scale-105 hover:bg-[#5A0012]"
      >
        {open ? <X className="size-6" /> : <MessageCircle className="size-6" />}
      </button>
    </div>
  );
}
