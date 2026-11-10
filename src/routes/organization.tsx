import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Pencil, Users, MapPin, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AlumniShell } from "@/components/alumni-shell";
import { Modal, LabeledInput, PrimaryButton } from "@/components/modal";
import {
  deleteMyOrganizationData,
  getMyWorkspaceData,
  saveMyOrganizationData,
} from "@/lib/profile.functions";
import { formatDate } from "@/lib/profile-format";
import type { OrganizationRecordInput, WorkspaceOrganization } from "@/lib/profile.types";

export const Route = createFileRoute("/organization")({
  head: () => ({
    meta: [
      { title: "Organization Affiliation — AlumTrack MSU Main Campus" },
      {
        name: "description",
        content:
          "View the organizations and groups you registered with, and add or edit your affiliation details on AlumTrack.",
      },
      { property: "og:title", content: "Organization Affiliation — AlumTrack" },
      {
        property: "og:description",
        content: "Manage the groups and organizations you are affiliated with.",
      },
    ],
  }),
  loader: async () => getMyWorkspaceData(),
  component: OrganizationPage,
});

function emptyRecord(): OrganizationRecordInput {
  return { name: "", address: "", position: "", contactNo: "", email: "", memberSince: "" };
}

function OrganizationFormModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: OrganizationRecordInput;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<OrganizationRecordInput>(initial);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof OrganizationRecordInput>(
    key: K,
    value: OrganizationRecordInput[K],
  ) => setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      const result = await saveMyOrganizationData({ data: form });
      if (result.ok) {
        toast.success(result.message);
        onSaved();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error("[organization] Save failed:", error);
      toast.error("We could not save this organization. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={form.id ? "Edit organization" : "Add organization"} onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <LabeledInput
          label="Group / Organization Name"
          value={form.name}
          onChange={(value) => set("name", value)}
          required
        />
        <LabeledInput
          label="Group / Organization Address"
          value={form.address}
          onChange={(value) => set("address", value)}
        />
        <LabeledInput
          label="Position"
          value={form.position}
          onChange={(value) => set("position", value)}
        />
        <LabeledInput
          label="Contact No."
          value={form.contactNo}
          onChange={(value) => set("contactNo", value)}
        />
        <LabeledInput
          label="Email Address"
          type="email"
          value={form.email}
          onChange={(value) => set("email", value)}
        />
        <LabeledInput
          label="Membership Since"
          type="date"
          value={form.memberSince}
          onChange={(value) => set("memberSince", value)}
        />
        <PrimaryButton type="submit" disabled={saving}>
          {saving ? "Saving…" : form.id ? "Save changes" : "Add organization"}
        </PrimaryButton>
      </form>
    </Modal>
  );
}

function OrganizationPage() {
  const data = Route.useLoaderData();
  const router = useRouter();
  const [editing, setEditing] = useState<OrganizationRecordInput | null>(null);
  const [deleting, setDeleting] = useState<WorkspaceOrganization | null>(null);
  const [removing, setRemoving] = useState(false);

  if (!data.ok) {
    return (
      <AlumniShell title="Organization">
        <div className="rounded-lg border-t-4 border-brand bg-card p-6">
          <p className="text-sm text-muted-foreground">{data.message}</p>
        </div>
      </AlumniShell>
    );
  }

  const { user, canEdit, organizations } = data;

  const confirmDelete = async () => {
    if (!deleting) return;
    setRemoving(true);
    try {
      const result = await deleteMyOrganizationData({ data: { id: deleting.id } });
      if (result.ok) {
        toast.success(result.message);
        setDeleting(null);
        void router.invalidate();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error("[organization] Delete failed:", error);
      toast.error("We could not remove this organization. Please try again.");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <AlumniShell
      title="Organization"
      subtitle="Groups and organizations you are involved in, as registered with OARCC."
      user={{ name: user.fullName, batch: user.batch, initials: user.initials }}
    >
      {canEdit ? (
        <div className="flex justify-end">
          <button
            onClick={() => setEditing(emptyRecord())}
            className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-2 text-xs font-semibold text-brand-foreground hover:bg-brand-dark"
          >
            <Plus className="size-3.5" /> Add organization
          </button>
        </div>
      ) : (
        <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
          Adding or editing organizations becomes available once the OARCC verifies your alumni
          record.
        </p>
      )}

      {organizations.length === 0 ? (
        <p className="mt-4 rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
          No organization or group affiliation on file yet.
        </p>
      ) : (
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {organizations.map((record) => (
            <li
              key={record.id}
              className="rounded-lg border border-border bg-card p-5 transition-colors hover:border-brand"
            >
              <span className="inline-flex items-center gap-1.5 rounded-full bg-highlight px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-highlight-foreground">
                <Users className="size-3" /> {record.position || "Member"}
              </span>
              <h3 className="mt-3 text-sm font-bold leading-snug text-foreground">{record.name}</h3>
              {record.address && (
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="size-3.5 text-brand" /> {record.address}
                </p>
              )}
              <dl className="mt-3 space-y-1 text-xs text-muted-foreground">
                {record.contactNo && <div>Contact no.: {record.contactNo}</div>}
                {record.email && <div>Email: {record.email}</div>}
                {record.memberSince && (
                  <div>Membership since: {formatDate(record.memberSince)}</div>
                )}
              </dl>
              {canEdit && (
                <div className="mt-4 flex flex-wrap items-center gap-4">
                  <button
                    onClick={() => setEditing(record)}
                    className="flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                  >
                    <Pencil className="size-3" /> View and Edit
                  </button>
                  <button
                    onClick={() => setDeleting(record)}
                    className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-red-600 hover:underline"
                  >
                    <Trash2 className="size-3" /> Remove
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <OrganizationFormModal
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void router.invalidate();
          }}
        />
      )}

      {deleting && (
        <Modal title="Remove organization" onClose={() => setDeleting(null)}>
          <p className="text-sm text-muted-foreground">
            Remove <span className="font-semibold text-foreground">{deleting.name}</span> from your
            organization affiliations? This cannot be undone.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDeleting(null)}
              className="rounded-md border border-border px-3 py-2 text-xs font-semibold text-foreground hover:border-brand"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              disabled={removing}
              className="inline-flex items-center gap-1.5 rounded-xl bg-destructive px-3 py-2 text-xs font-semibold text-destructive-foreground shadow-sm hover:bg-destructive/90 disabled:opacity-60"
            >
              {removing && <Loader2 className="size-3.5 animate-spin" />}
              {removing ? "Removing…" : "Remove organization"}
            </button>
          </div>
        </Modal>
      )}
    </AlumniShell>
  );
}
