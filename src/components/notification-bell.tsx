import { useState } from "react";
import { Bell } from "lucide-react";

type Note = { title: string; body: string; time: string };

export function NotificationBell({ items }: { items: Note[] }) {
  const [open, setOpen] = useState(false);
  const [read, setRead] = useState(false);
  const unread = read ? 0 : items.length;

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => setOpen((o) => !o)}
        className="relative inline-flex size-9 items-center justify-center rounded-md border border-border bg-card text-foreground transition-colors hover:border-brand hover:text-brand"
      >
        <Bell className="size-4" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-brand-foreground">
            {unread}
          </span>
        )}

      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close notifications"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div className="absolute right-0 z-20 mt-2 w-72 overflow-hidden rounded-lg border border-border bg-card shadow-lg">
            <p className="border-b border-border px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Notifications
            </p>
            <ul className="max-h-72 divide-y divide-border overflow-y-auto">
              {items.map((n) => (
                <li key={n.title} className="flex gap-2 px-4 py-3">
                  <span
                    aria-hidden
                    className={`mt-1 size-2 shrink-0 rounded-full ${read ? "bg-transparent" : "bg-brand"}`}
                  />
                  <div>
                  <p className="text-xs font-semibold text-foreground">{n.title}</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                    {n.body}
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{n.time}</p>
                  </div>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setRead(true)}
              className="w-full border-t border-border px-4 py-2 text-[11px] font-semibold text-brand hover:bg-muted"
            >
              Mark all as read
            </button>
          </div>
        </>
      )}
    </div>
  );
}
