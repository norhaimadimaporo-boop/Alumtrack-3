import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import {
  Clock,
  KeyRound,
  Mail,
  Pencil,
  Plus,
  Power,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { Modal, LabeledInput, PrimaryButton } from "@/components/modal";
import { createAdmin, deleteAdmin, getAdminAccounts, updateAdmin } from "@/lib/admin.functions";
import type { AdminAccount, AdminAccountRole } from "@/lib/admin.types";

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
  loader: async () => getAdminAccounts(),
  component: AdminAccounts,
});

const ROLES: Array<{ value: AdminAccountRole; name: string; description: string }> = [
  {
    value: "head",
    name: "Head Admin",
    description:
      "Full rights. The only tier that can add, edit, or delete an admin account and reset admin passwords.",
  },
  {
    value: "standard",
    name: "Standard Admin",
    description:
      "Full alumni management — import, export, verify, add, and edit records — but no access to Admin Accounts.",
  },
  {
    value: "viewer",
    name: "Viewer Admin",
    description:
      "Read-only access to the alumni directory, GIS map, and tracer reports. Cannot change any record.",
  },
];

const ROLE_LABEL: Record<AdminAccountRole, string> = {
  head: "Head Admin",
  standard: "Standard Admin",
  viewer: "Viewer Admin",
};

const ROLE_BADGE: Record<AdminAccountRole, string> = {
  head: "bg-brand text-brand-foreground",
  standard: "bg-brand/10 text-brand",
  viewer: "bg-muted text-muted-foreground",
};

type Message = { tone: "success" | "error"; text: string };

type CreateForm = {
  fullName: string;
  email: string;
  password: string;
  role: AdminAccountRole;
};

type EditForm = CreateForm & {
  id: number;
  active: boolean;
};

const EMPTY_CREATE: CreateForm = {
  fullName: "",
  email: "",
  password: "",
  role: "standard",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function AdminAccounts() {
  const data = Route.useLoaderData();
  const router = useRouter();

  const [adding, setAdding] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(EMPTY_CREATE);
  const [editing, setEditing] = useState<EditForm | null>(null);
  const [deleting, setDeleting] = useState<AdminAccount | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  const startEditing = (account: AdminAccount) => {
    setMessage(null);
    setEditing({
      id: account.id,
      fullName: account.fullName,
      email: account.email,
      password: "",
      role: account.role,
      active: account.active,
    });
  };

  const handleCreate = async () => {
    setMessage(null);

    if (!createForm.fullName.trim()) {
      setMessage({ tone: "error", text: "Enter the administrator's full name." });
      return;
    }
    if (!EMAIL_PATTERN.test(createForm.email.trim())) {
      setMessage({ tone: "error", text: "Enter a valid email address." });
      return;
    }
    if (createForm.password.length < 8) {
      setMessage({ tone: "error", text: "The password must be at least 8 characters long." });
      return;
    }

    setBusy(true);
    try {
      const result = await createAdmin({
        data: {
          fullName: createForm.fullName.trim(),
          email: createForm.email.trim(),
          password: createForm.password,
          role: createForm.role,
        },
      });
      setMessage({ tone: result.ok ? "success" : "error", text: result.message });
      if (result.ok) {
        setAdding(false);
        setCreateForm(EMPTY_CREATE);
        await router.invalidate();
      }
    } catch (error) {
      console.error(error);
      setMessage({ tone: "error", text: "We could not create that admin account right now." });
    } finally {
      setBusy(false);
    }
  };

  const handleUpdate = async () => {
    if (!editing) return;
    setMessage(null);

    if (!editing.fullName.trim() || !EMAIL_PATTERN.test(editing.email.trim())) {
      setMessage({ tone: "error", text: "Enter a full name and a valid email address." });
      return;
    }
    if (editing.password !== "" && editing.password.length < 8) {
      setMessage({ tone: "error", text: "The new password must be at least 8 characters long." });
      return;
    }

    setBusy(true);
    try {
      const result = await updateAdmin({
        data: {
          id: editing.id,
          fullName: editing.fullName.trim(),
          email: editing.email.trim(),
          role: editing.role,
          active: editing.active,
          ...(editing.password ? { password: editing.password } : {}),
        },
      });
      setMessage({ tone: result.ok ? "success" : "error", text: result.message });
      if (result.ok) {
        setEditing(null);
        await router.invalidate();
      }
    } catch (error) {
      console.error(error);
      setMessage({ tone: "error", text: "We could not update that admin account right now." });
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (account: AdminAccount) => {
    setMessage(null);
    setBusy(true);
    try {
      const result = await updateAdmin({
        data: {
          id: account.id,
          fullName: account.fullName,
          email: account.email,
          role: account.role,
          active: !account.active,
        },
      });
      setMessage({ tone: result.ok ? "success" : "error", text: result.message });
      if (result.ok) await router.invalidate();
    } catch (error) {
      console.error(error);
      setMessage({ tone: "error", text: "We could not update that admin account right now." });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setMessage(null);
    setBusy(true);
    try {
      const result = await deleteAdmin({ data: { id: deleting.id } });
      setMessage({ tone: result.ok ? "success" : "error", text: result.message });
      if (result.ok) {
        setDeleting(null);
        await router.invalidate();
      }
    } catch (error) {
      console.error(error);
      setMessage({ tone: "error", text: "We could not delete that admin account right now." });
    } finally {
      setBusy(false);
    }
  };

  if (!data.ok) {
    return (
      <AdminShell title="Manage Admin Accounts" subtitle="Restricted to the Head Admin.">
        <div className="rounded-lg border-t-4 border-brand bg-card p-6">
          <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <ShieldCheck className="size-4 text-brand" /> Head Admin access required
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{data.message}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Standard and Viewer admins cannot open this page. Sign in with a Head Admin account to
            add, edit, deactivate, or delete administrators.
          </p>
        </div>
      </AdminShell>
    );
  }

  const { accounts } = data;
  const activeCount = accounts.filter((account) => account.active).length;

  return (
    <AdminShell
      title="Manage Admin Accounts"
      subtitle="Head Admin only — add admins, assign tiers, and deactivate or delete accounts."
      action={
        <button
          onClick={() => {
            setMessage(null);
            setCreateForm(EMPTY_CREATE);
            setAdding(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-2 text-xs font-semibold text-brand-foreground hover:bg-brand-dark"
        >
          <Plus className="size-3.5" /> Add new admin
        </button>
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-[11px] font-semibold text-muted-foreground">
          <ShieldCheck className="size-3.5 text-brand" /> {accounts.length} admin account
          {accounts.length === 1 ? "" : "s"} · {activeCount} active
        </p>
        <p className="text-[11px] text-muted-foreground">
          Passwords are stored as scrypt hashes and never shown.
        </p>
      </div>

      {message && (
        <p
          role="status"
          className={`mt-3 rounded-lg border px-3 py-2 text-sm ${
            message.tone === "success"
              ? "border-success/40 bg-success/10 text-foreground"
              : "border-red-300 bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </p>
      )}

      <ul className="mt-4 grid gap-3 md:grid-cols-2">
        {accounts.map((account) => (
          <li key={account.id} className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-1.5 text-sm font-bold text-foreground">
                  {account.fullName}
                  {account.isSelf && (
                    <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                      You
                    </span>
                  )}
                </p>
                <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                  <Mail className="size-3" /> {account.email}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                  account.active
                    ? "bg-success text-success-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {account.active ? "Active" : "Deactivated"}
              </span>
            </div>

            <p
              className={`mt-3 inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${ROLE_BADGE[account.role]}`}
            >
              <ShieldCheck className="size-3" /> {ROLE_LABEL[account.role]}
            </p>

            <dl className="mt-3 grid gap-1 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Clock className="size-3 text-brand" /> Last login: {account.lastLogin}
              </div>
              <div className="flex items-center gap-1.5">
                <UserRound className="size-3 text-brand" /> Created: {account.createdAt || "—"}
              </div>
            </dl>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                onClick={() => startEditing(account)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
              >
                <Pencil className="size-3" /> Edit
              </button>
              <button
                onClick={() => void toggleActive(account)}
                disabled={busy || account.isSelf}
                title={account.isSelf ? "You cannot deactivate your own account." : undefined}
                className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-brand hover:underline disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Power className="size-3" /> {account.active ? "Deactivate" : "Reactivate"}
              </button>
              <button
                onClick={() => {
                  setMessage(null);
                  setDeleting(account);
                }}
                disabled={account.isSelf}
                title={account.isSelf ? "You cannot delete your own account." : undefined}
                className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Trash2 className="size-3" /> Delete
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6 rounded-lg border-l-4 border-highlight bg-muted/50 px-4 py-3">
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          What each admin role can do
        </p>
        <ul className="mt-1.5 space-y-1.5 text-[11px] leading-snug text-muted-foreground">
          {ROLES.map((role) => (
            <li key={role.value}>
              <span className="font-bold text-foreground">{role.name}:</span> {role.description}
            </li>
          ))}
        </ul>
      </div>

      {adding && (
        <Modal title="Add new admin" onClose={() => setAdding(false)}>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void handleCreate();
            }}
          >
            <LabeledInput
              label="Full name"
              value={createForm.fullName}
              onChange={(value) => setCreateForm((form) => ({ ...form, fullName: value }))}
              required
            />
            <LabeledInput
              label="Email address"
              type="email"
              value={createForm.email}
              onChange={(value) => setCreateForm((form) => ({ ...form, email: value }))}
              placeholder="admin@msumain.edu.ph"
              required
            />
            <LabeledInput
              label="Password"
              type="password"
              value={createForm.password}
              onChange={(value) => setCreateForm((form) => ({ ...form, password: value }))}
              placeholder="At least 8 characters"
              required
            />
            <div>
              <label
                htmlFor="new-admin-role"
                className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Admin role
              </label>
              <select
                id="new-admin-role"
                value={createForm.role}
                onChange={(e) =>
                  setCreateForm((form) => ({
                    ...form,
                    role: e.target.value as AdminAccountRole,
                  }))
                }
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
              >
                {ROLES.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                {ROLES.find((role) => role.value === createForm.role)?.description}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAdding(false)}
                className="rounded-md border border-border py-2.5 text-sm font-semibold text-foreground hover:border-brand"
              >
                Cancel
              </button>
              <PrimaryButton type="submit" disabled={busy}>
                {busy ? "Creating…" : "Create admin account"}
              </PrimaryButton>
            </div>
          </form>
        </Modal>
      )}

      {editing && (
        <Modal
          title={`Edit ${editing.fullName || "admin account"}`}
          onClose={() => setEditing(null)}
        >
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void handleUpdate();
            }}
          >
            <LabeledInput
              label="Full name"
              value={editing.fullName}
              onChange={(value) =>
                setEditing((form) => (form ? { ...form, fullName: value } : form))
              }
              required
            />
            <LabeledInput
              label="Email address"
              type="email"
              value={editing.email}
              onChange={(value) => setEditing((form) => (form ? { ...form, email: value } : form))}
              required
            />
            <LabeledInput
              label="New password (optional)"
              type="password"
              value={editing.password}
              onChange={(value) =>
                setEditing((form) => (form ? { ...form, password: value } : form))
              }
              placeholder="Leave blank to keep the current password"
            />
            <div>
              <label
                htmlFor="edit-admin-role"
                className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Admin role
              </label>
              <select
                id="edit-admin-role"
                value={editing.role}
                onChange={(e) =>
                  setEditing((form) =>
                    form ? { ...form, role: e.target.value as AdminAccountRole } : form,
                  )
                }
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
              >
                {ROLES.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                {ROLES.find((role) => role.value === editing.role)?.description}
              </p>
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <input
                type="checkbox"
                checked={editing.active}
                disabled={editing.id === data.currentUserId}
                onChange={(e) =>
                  setEditing((form) => (form ? { ...form, active: e.target.checked } : form))
                }
                className="size-4 accent-[var(--brand)]"
              />
              Account is active
              {editing.id === data.currentUserId && (
                <span className="font-normal text-muted-foreground">
                  (you cannot deactivate yourself)
                </span>
              )}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-md border border-border py-2.5 text-sm font-semibold text-foreground hover:border-brand"
              >
                Cancel
              </button>
              <PrimaryButton type="submit" disabled={busy}>
                {busy ? "Saving…" : "Save changes"}
              </PrimaryButton>
            </div>
          </form>
        </Modal>
      )}

      {deleting && (
        <Modal title="Delete admin account" onClose={() => setDeleting(null)}>
          <p className="text-sm text-muted-foreground">
            Delete the administrator account of{" "}
            <span className="font-semibold text-foreground">{deleting.fullName}</span> (
            {deleting.email})? They will lose access to the OARCC console immediately. Their past
            activity stays in the audit log.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              onClick={() => setDeleting(null)}
              disabled={busy}
              className="rounded-md border border-border py-2.5 text-sm font-semibold text-foreground hover:border-brand disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={() => void handleDelete()}
              disabled={busy}
              className="rounded-md bg-brand py-2.5 text-sm font-semibold text-brand-foreground hover:bg-brand-dark disabled:opacity-60"
            >
              {busy ? "Deleting…" : "Delete account"}
            </button>
          </div>
        </Modal>
      )}

      <p className="mt-4 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <KeyRound className="size-3 text-brand" /> Only the Head Admin can reset another admin's
        password. At least one active Head Admin must always remain.
      </p>
    </AdminShell>
  );
}
