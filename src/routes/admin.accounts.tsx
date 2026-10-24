import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, ShieldCheck, Pencil, Mail, User, Clock } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { Modal, LabeledInput, PrimaryButton } from "@/components/modal";

export const Route = createFileRoute("/admin/accounts")({
  head: () => ({
    meta: [
      { title: "Manage Admin Accounts — AlumTrack Admin" },
      {
        name: "description",
        content:
          "Add new administrators, assign admin roles, and deactivate or delete admin accounts of the OARCC.",
      },
      { property: "og:title", content: "Manage Admin Accounts — AlumTrack Admin" },
      {
        property: "og:description",
        content: "Add admins, assign roles, deactivate or delete accounts.",
      },
    ],
  }),
  component: AdminAccounts,
});

const ROLES = [
  {
    name: "Head Admin",
    description:
      "Can do all kinds of admin work and is the only one who can add, edit, and delete an admin account.",
  },
  {
    name: "Admin",
    description: "Can do all admin work, but has no access to the Admin Accounts page.",
  },
  {
    name: "Viewer Admin",
    description:
      "Can only view everything (except Admin Accounts) — cannot create, edit, or delete anything.",
  },
] as const;


type Account = {
  id: number;
  name: string;
  user: string;
  role: string;
  active: boolean;
  email: string;
  office: string;
  created: string;
  lastLogin: string;
};

const ACCOUNTS: Account[] = [
  {
    id: 1,
    name: "Norhaima Dimaporo",
    user: "oarcc.head",
    role: "Head Admin",
    active: true,
    email: "oarcc.head@msumain.edu.ph",
    office: "OARCC Main Office",
    created: "12-01-2025",
    lastLogin: "12-08-2026 · 08:41 AM",
  },
  {
    id: 2,
    name: "Alimah Macarambon",
    user: "records.staff01",
    role: "Admin",
    active: true,
    email: "a.macarambon@msumain.edu.ph",
    office: "OARCC Records Section",
    created: "03-02-2025",
    lastLogin: "11-08-2026 · 04:12 PM",
  },
  {
    id: 3,
    name: "Jomar Ledesma",
    user: "content.staff01",
    role: "Admin",
    active: true,
    email: "j.ledesma@msumain.edu.ph",
    office: "OARCC Career Center",
    created: "18-03-2025",
    lastLogin: "12-08-2026 · 09:05 AM",
  },
  {
    id: 4,
    name: "Sarah Pangcoga",
    user: "records.staff02",
    role: "Viewer Admin",
    active: false,
    email: "s.pangcoga@msumain.edu.ph",
    office: "OARCC Records Section",
    created: "22-06-2025",
    lastLogin: "02-05-2026 · 10:20 AM",
  },
];

function AdminAccounts() {
  const [adding, setAdding] = useState(false);
  const [viewing, setViewing] = useState<Account | null>(null);
  const [editing, setEditing] = useState<Account | null>(null);

  return (
    <AdminShell
      title="Manage Admin Accounts"
      subtitle="Add new admins, assign roles, and deactivate or delete accounts."
      action={
        <button
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-2 text-xs font-semibold text-brand-foreground hover:bg-brand-dark"
        >
          <Plus className="size-3.5" /> Add new admin
        </button>
      }
    >
      <ul className="grid gap-3 md:grid-cols-2">
        {ACCOUNTS.map((a) => (
          <li
            key={a.id}
            role="button"
            tabIndex={0}
            onClick={() => setViewing(a)}
            onKeyDown={(e) => e.key === "Enter" && setViewing(a)}
            className="cursor-pointer rounded-lg border border-border bg-card p-5 transition-colors hover:border-brand"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground">{a.name}</p>
                <p className="text-xs text-muted-foreground">@{a.user}</p>
              </div>
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                  a.active
                    ? "bg-success text-success-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {a.active ? "Active" : "Deactivated"}
              </span>
            </div>
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-sm bg-brand/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand">
              <ShieldCheck className="size-3" /> {a.role}
            </p>
            <div className="mt-4 flex flex-wrap gap-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setViewing(a);
                }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
              >
                <Pencil className="size-3" /> Edit
              </button>
              <button
                onClick={(e) => e.stopPropagation()}
                className="text-xs font-semibold text-muted-foreground hover:text-brand hover:underline"
              >
                {a.active ? "Deactivate" : "Reactivate"}
              </button>
              <button
                onClick={(e) => e.stopPropagation()}
                className="text-xs font-semibold text-muted-foreground hover:text-brand hover:underline"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>

      {viewing && (
        <Modal title={viewing.name} onClose={() => setViewing(null)}>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wide">
              <span className="inline-flex items-center gap-1 rounded-sm bg-brand/10 px-2 py-0.5 text-brand">
                <ShieldCheck className="size-3" /> {viewing.role}
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 ${
                  viewing.active
                    ? "bg-success text-success-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {viewing.active ? "Active" : "Deactivated"}
              </span>
            </div>

            <dl className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
              <div className="flex items-center gap-1.5">
                <User className="size-3.5 text-brand" /> @{viewing.user}
              </div>
              <div className="flex items-center gap-1.5 break-all">
                <Mail className="size-3.5 text-brand" /> {viewing.email}
              </div>
              <div>Office / section: {viewing.office}</div>
              <div>Account created: {viewing.created}</div>
              <div className="flex items-center gap-1.5">
                <Clock className="size-3.5 text-brand" /> Last login: {viewing.lastLogin}
              </div>
            </dl>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setViewing(null)}
                className="rounded-md border border-border py-2.5 text-sm font-semibold text-foreground hover:border-brand"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setEditing(viewing);
                  setViewing(null);
                }}
                className="inline-flex items-center justify-center gap-1.5 rounded-md bg-brand py-2.5 text-sm font-semibold text-brand-foreground hover:bg-brand-dark"
              >
                <Pencil className="size-3.5" /> Edit account
              </button>

            </div>
          </div>
        </Modal>
      )}

      {editing && (
        <Modal title={`Edit ${editing.name}`} onClose={() => setEditing(null)}>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setEditing(null);
            }}
          >
            <LabeledInput label="Full name" defaultValue={editing.name} />
            <LabeledInput label="Email address" type="email" defaultValue={editing.email} />
            <LabeledInput label="Office / section" defaultValue={editing.office} />

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                What the admin roles mean
              </p>
              <ul className="mt-1 space-y-1.5 rounded-lg border-l-4 border-highlight bg-muted/50 px-3 py-2 text-[11px] leading-snug text-muted-foreground">
                {ROLES.map((r) => (
                  <li key={r.name}>
                    <span className="font-bold text-foreground">{r.name}:</span> {r.description}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Admin role
              </label>
              <select
                defaultValue={editing.role}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
              >
                {ROLES.map((r) => (
                  <option key={r.name}>{r.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-md border border-border py-2.5 text-sm font-semibold text-foreground hover:border-brand"
              >
                Cancel
              </button>
              <PrimaryButton type="submit">Save changes</PrimaryButton>
            </div>
          </form>
        </Modal>
      )}

      {adding && (
        <Modal title="Add new admin" onClose={() => setAdding(false)}>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setAdding(false);
            }}
          >
            <LabeledInput label="Full name" />
            <LabeledInput label="Email address" type="email" />
            <LabeledInput label="Password" type="password" placeholder="••••••••" />
            <LabeledInput label="Confirm password" type="password" placeholder="••••••••" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                What the admin roles mean
              </p>
              <ul className="mt-1 space-y-1.5 rounded-lg border-l-4 border-highlight bg-muted/50 px-3 py-2 text-[11px] leading-snug text-muted-foreground">
                {ROLES.map((r) => (
                  <li key={r.name}>
                    <span className="font-bold text-foreground">{r.name}:</span> {r.description}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Admin role
              </label>
              <select className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand">
                {ROLES.map((r) => (
                  <option key={r.name}>{r.name}</option>
                ))}
              </select>
            </div>

            <PrimaryButton type="submit">Create admin account</PrimaryButton>
          </form>
        </Modal>
      )}
    </AdminShell>
  );
}
