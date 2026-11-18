import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";

import type { ChatMessage } from "@/lib/chat.types";

/** Only one message action menu may be open at a time across both chat surfaces. */
let closeCurrentMenu: (() => void) | null = null;

type ChatMessageItemProps = {
  message: ChatMessage;
  /** True when the current viewer is the sender of this message. */
  own: boolean;
  theme: "alumni" | "admin";
  onEdit: (messageId: number, text: string) => Promise<boolean>;
  onDelete: (messageId: number) => Promise<boolean>;
};

const themeStyles = {
  alumni: {
    bubbleOwn: "bg-[#7A1315] text-white rounded-br-sm",
    bubbleOther: "border border-[#E6DFD5] bg-white text-[#312B27] rounded-bl-sm",
    timeOwn: "text-white/65",
    timeOther: "text-[#6B625B]/65",
    botLabel: "text-[#7A1315]/65",
    nameOwn: "text-white/80",
    nameOther: "text-[#7A1315]",
    link: "text-[#7A1315] hover:text-[#5A0012]",
    historyBubble: "border-[#E6DFD5] bg-white/80 text-[#6B625B]",
    editBg: "bg-white text-[#312B27] border-[#E6DFD5]",
  },
  admin: {
    bubbleOwn: "bg-brand text-brand-foreground rounded-br-sm",
    bubbleOther: "border border-border bg-card text-foreground rounded-bl-sm",
    timeOwn: "text-white/65",
    timeOther: "text-muted-foreground",
    botLabel: "text-brand",
    nameOwn: "text-white/80",
    nameOther: "text-brand",
    link: "text-brand hover:underline",
    historyBubble: "border-border bg-card text-muted-foreground",
    editBg: "bg-background text-foreground border-border",
  },
} as const;

export function ChatMessageItem({ message, own, theme, onEdit, onDelete }: ChatMessageItemProps) {
  const styles = themeStyles[theme];
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.message);
  const [busy, setBusy] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState("");
  const dotsRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const closeMenu = () => {
    setMenuOpen(false);
    setMenuPosition(null);
    if (closeCurrentMenu === closeMenuRef.current) closeCurrentMenu = null;
  };
  const closeMenuRef = useRef(closeMenu);
  closeMenuRef.current = closeMenu;

  const openMenu = () => {
    closeCurrentMenu?.();
    const rect = dotsRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = 128;
    const menuHeight = 84;
    const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
    const top =
      rect.bottom + menuHeight + 8 <= window.innerHeight
        ? rect.bottom + 6
        : Math.max(8, rect.top - menuHeight - 6);
    setMenuPosition({ top, left });
    setMenuOpen(true);
    closeCurrentMenu = () => closeMenuRef.current();
  };

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (dotsRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      closeMenuRef.current();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenuRef.current();
    };
    const onScroll = () => closeMenuRef.current();
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [menuOpen]);

  useEffect(() => () => closeMenuRef.current(), []);

  const canManage = own && !message.isDeleted;

  const handleEdit = async (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    setBusy(true);
    setError("");
    const ok = await onEdit(message.id, text);
    setBusy(false);
    if (ok) {
      setEditing(false);
    } else {
      setError("Could not save this edit. Try again.");
    }
  };

  const handleDelete = async () => {
    closeMenu();
    if (busy) return;
    setBusy(true);
    setError("");
    const ok = await onDelete(message.id);
    setBusy(false);
    if (!ok) setError("Could not delete this message. Try again.");
  };

  const hasHistory = message.isEdited && !message.isDeleted && message.editHistory.length > 0;

  return (
    <div className={`flex items-end gap-1.5 ${own ? "justify-end" : "justify-start"}`}>
      {canManage && (
        <button
          ref={dotsRef}
          type="button"
          aria-label="Message options"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          disabled={busy || editing}
          onClick={menuOpen ? closeMenu : openMenu}
          className={`mb-0.5 flex size-6 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-40 ${styles.link} hover:bg-black/5`}
        >
          <MoreVertical className="size-4" />
        </button>
      )}

      <div className="max-w-[88%] min-w-0">
        {hasHistory && (
          <div className="mb-1 flex flex-col items-start gap-1">
            <button
              type="button"
              onClick={() => setShowHistory((value) => !value)}
              className={`text-[9px] font-semibold ${styles.link}`}
            >
              {showHistory ? "Hide edits" : "Edited"}
            </button>
            {showHistory && (
              <div className="flex w-full flex-col gap-1">
                {message.editHistory.map((version, index) => (
                  <div
                    key={`${message.id}-history-${index}`}
                    className={`rounded-lg border px-2 py-1 text-[10px] leading-snug italic ${styles.historyBubble}`}
                  >
                    <span className="whitespace-pre-wrap break-words">{version.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {editing ? (
          <form
            onSubmit={(event) => void handleEdit(event)}
            className={`w-56 rounded-xl border p-2 shadow-sm sm:w-64 ${styles.editBg}`}
          >
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={4000}
              rows={3}
              autoFocus
              aria-label="Edit message"
              className="w-full resize-none rounded-md border border-border bg-background/60 p-2 text-xs outline-none focus:border-brand"
            />
            <div className="mt-1 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setDraft(message.message);
                  setError("");
                }}
                className="rounded-md px-2 py-1 text-[10px] font-semibold text-muted-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!draft.trim() || busy}
                className="rounded-md bg-brand px-2 py-1 text-[10px] font-bold text-brand-foreground disabled:opacity-50"
              >
                {busy ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        ) : (
          <div
            className={`rounded-2xl px-3 py-2 text-xs leading-relaxed shadow-sm ${own ? styles.bubbleOwn : styles.bubbleOther}`}
          >
            {message.isDeleted ? (
              <p className="italic opacity-70">
                {own ? "You deleted a message" : "This message was deleted"}
              </p>
            ) : (
              <>
                {message.senderType === "bot" && (
                  <p className={`mb-1 text-[10px] font-semibold ${styles.botLabel}`}>
                    Sent by chat bot
                  </p>
                )}
                {message.senderName && message.senderType !== "alumni" && (
                  <p
                    className={`mb-1 text-[10px] font-semibold ${own ? styles.nameOwn : styles.nameOther}`}
                  >
                    {message.senderName}
                  </p>
                )}
                <p className="whitespace-pre-wrap break-words">{message.message}</p>
              </>
            )}
            <p className={`mt-1 text-right text-[9px] ${own ? styles.timeOwn : styles.timeOther}`}>
              {message.timeLabel}
            </p>
          </div>
        )}
        {error && <p className="mt-1 text-[9px] text-red-600">{error}</p>}
      </div>

      {menuOpen &&
        menuPosition &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            className="fixed z-[9999] w-32 rounded-xl border border-border bg-card p-1 shadow-xl"
            style={{ top: menuPosition.top, left: menuPosition.left }}
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                closeMenu();
                setDraft(message.message);
                setError("");
                setEditing(true);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-foreground hover:bg-muted"
            >
              <Pencil className="size-3.5 text-brand" /> Edit
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => void handleDelete()}
              disabled={busy}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              <Trash2 className="size-3.5" /> Delete
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
}
