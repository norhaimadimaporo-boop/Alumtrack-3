import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Trash2, Undo2 } from "lucide-react";

import { AdminShell } from "@/components/admin-shell";
import { getRecycleBinData, purgeRecycle, restoreRecycle } from "@/lib/recycle.functions";

export const Route = createFileRoute("/admin/recycle-bin")({
  head: () => ({
    meta: [
      { title: "Recycle Bin - AlumTrack Admin" },
      { name: "description", content: "Restore soft-deleted alumni, posts, and admin accounts." },
    ],
  }),
  loader: async () => getRecycleBinData(),
  component: RecycleBinPage,
});

function RecycleBinPage() {
  const data = Route.useLoaderData();
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const items = data.ok && data.canViewRecycleBin ? data.items : [];

  const run = async (action: () => Promise<{ message: string; ok: boolean }>) => {
    setBusy(true);
    setMessage("");
    try {
      const result = await action();
      setMessage(result.message);
      if (result.ok) await router.invalidate();
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminShell
      title="Recycle bin"
      subtitle="Soft-deleted alumni, posts, and admin accounts - retained for 7 days."
    >
      <div className="rounded-lg border-l-4 border-highlight bg-muted/50 p-3 text-xs text-muted-foreground">
        Records stay here for 7 days. Restoring a record returns it to its original module; expired
        records are permanently removed automatically.
      </div>

      {message && (
        <p className="mt-3 rounded-lg border border-border bg-card p-3 text-xs text-foreground">
          {message}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{items.length} item(s) in the recycle bin</p>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              const result = await purgeRecycle();
              return { ok: result.ok, message: result.ok ? result.message : result.message };
            })
          }
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-semibold hover:border-brand disabled:opacity-50"
        >
          <Trash2 className="size-3.5" /> Purge expired records
        </button>
      </div>

      <div className="mt-3 rounded-lg border border-border bg-card">
        {items.length === 0 ? (
          <p className="px-4 py-10 text-center text-xs text-muted-foreground">
            Recycle bin is empty. Deleted records will appear here for 7 days.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li key={item.key} className="flex flex-wrap items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{item.detail}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {item.kind} · deleted {item.deletedAt}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void run(() =>
                      restoreRecycle({ data: { kind: item.kind, id: item.id } }).then((result) => ({
                        ok: result.ok,
                        message: result.message,
                      })),
                    )
                  }
                  className="inline-flex items-center gap-1.5 rounded-md border border-brand px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand/10 disabled:opacity-50"
                >
                  <Undo2 className="size-3.5" /> Restore
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AdminShell>
  );
}
