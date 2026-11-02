import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Pencil, GraduationCap, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AlumniShell } from "@/components/alumni-shell";
import { Modal, LabeledInput, PrimaryButton } from "@/components/modal";
import {
  deleteMyEducationData,
  getMyWorkspaceData,
  saveMyEducationData,
} from "@/lib/profile.functions";
import { formatDate } from "@/lib/profile-format";
import { EDUCATION_LEVELS, type EducationLevel } from "@/lib/registration.types";
import type { EducationRecordInput, WorkspaceEducation } from "@/lib/profile.types";

export const Route = createFileRoute("/education")({
  head: () => ({
    meta: [
      { title: "Education Details — AlumTrack MSU Main Campus" },
      {
        name: "description",
        content:
          "Review the degrees you entered at registration and add or edit post graduate, graduate, and baccalaureate records.",
      },
      { property: "og:title", content: "Education Details — AlumTrack" },
      {
        property: "og:description",
        content: "Add or edit your post graduate, graduate, and baccalaureate degrees.",
      },
    ],
  }),
  loader: async () => getMyWorkspaceData(),
  component: EducationPage,
});

function emptyRecord(): EducationRecordInput {
  return {
    level: "Baccalaureate Degree",
    schoolIdNo: "",
    degree: "",
    major: "",
    college: "",
    school: "",
    schoolAddress: "",
    graduatedOn: "",
  };
}

function EducationFormModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: EducationRecordInput;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<EducationRecordInput>(initial);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof EducationRecordInput>(key: K, value: EducationRecordInput[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      const result = await saveMyEducationData({ data: form });
      if (result.ok) {
        toast.success(result.message);
        onSaved();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error("[education] Save failed:", error);
      toast.error("We could not save this degree. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={form.id ? "Edit degree" : "Add degree"} onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Degree level
          </label>
          <select
            value={form.level}
            onChange={(event) => set("level", event.target.value as EducationLevel)}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand"
          >
            {EDUCATION_LEVELS.map((level) => (
              <option key={level}>{level}</option>
            ))}
          </select>
        </div>
        <LabeledInput
          label="Degree"
          value={form.degree}
          onChange={(value) => set("degree", value)}
          required
        />
        <LabeledInput
          label="ID Number"
          value={form.schoolIdNo}
          onChange={(value) => set("schoolIdNo", value)}
        />
        <LabeledInput label="Major" value={form.major} onChange={(value) => set("major", value)} />
        <LabeledInput
          label="Name of College"
          value={form.college}
          onChange={(value) => set("college", value)}
        />
        <LabeledInput
          label="University / School Attended"
          value={form.school}
          onChange={(value) => set("school", value)}
          required
        />
        <LabeledInput
          label="University / School Address"
          value={form.schoolAddress}
          onChange={(value) => set("schoolAddress", value)}
        />
        <LabeledInput
          label="Date Graduated"
          type="date"
          value={form.graduatedOn}
          onChange={(value) => set("graduatedOn", value)}
        />
        <PrimaryButton type="submit" disabled={saving}>
          {saving ? "Saving…" : form.id ? "Save changes" : "Add degree"}
        </PrimaryButton>
      </form>
    </Modal>
  );
}

function EducationPage() {
  const data = Route.useLoaderData();
  const router = useRouter();
  const [editing, setEditing] = useState<EducationRecordInput | null>(null);
  const [deleting, setDeleting] = useState<WorkspaceEducation | null>(null);
  const [removing, setRemoving] = useState(false);

  if (!data.ok) {
    return (
      <AlumniShell title="Education Details">
        <div className="rounded-lg border-t-4 border-brand bg-card p-6">
          <p className="text-sm text-muted-foreground">{data.message}</p>
        </div>
      </AlumniShell>
    );
  }

  const { user, canEdit, education } = data;

  const confirmDelete = async () => {
    if (!deleting) return;
    setRemoving(true);
    try {
      const result = await deleteMyEducationData({ data: { id: deleting.id } });
      if (result.ok) {
        toast.success(result.message);
        setDeleting(null);
        void router.invalidate();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error("[education] Delete failed:", error);
      toast.error("We could not remove this degree. Please try again.");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <AlumniShell
      title="Education Details"
      subtitle="The degrees you registered with OARCC. You may add or edit a degree anytime."
      user={{ name: user.fullName, batch: user.batch, initials: user.initials }}
    >
      {canEdit ? (
        <div className="flex justify-end">
          <button
            onClick={() => setEditing(emptyRecord())}
            className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-2 text-xs font-semibold text-brand-foreground hover:bg-brand-dark"
          >
            <Plus className="size-3.5" /> Add degree
          </button>
        </div>
      ) : (
        <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
          Adding or editing degrees becomes available once the OARCC verifies your alumni record.
        </p>
      )}

      {education.length === 0 ? (
        <p className="mt-4 rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
          No education records on file yet.
        </p>
      ) : (
        <ol className="mt-4 space-y-3">
          {education.map((record) => (
            <li
              key={record.id}
              className="rounded-lg border border-border bg-card p-5 transition-colors hover:border-brand"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand">
                    <GraduationCap className="size-3" /> {record.level}
                  </span>
                  <h3 className="mt-2 text-sm font-bold text-foreground">{record.degree}</h3>
                  {record.major && (
                    <p className="text-xs text-muted-foreground">Major in {record.major}</p>
                  )}
                  {record.schoolIdNo && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      ID Number: {record.schoolIdNo}
                    </p>
                  )}
                  {record.college && (
                    <p className="mt-2 text-xs text-muted-foreground">{record.college}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {[record.school, record.schoolAddress].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Graduated
                  </p>
                  <p className="text-xs font-semibold text-foreground">
                    {record.graduatedOn ? formatDate(record.graduatedOn) : "—"}
                  </p>
                  {canEdit && (
                    <div className="mt-2 flex flex-col items-end gap-1">
                      <button
                        onClick={() => setEditing(record)}
                        className="flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                      >
                        <Pencil className="size-3" /> Edit
                      </button>
                      <button
                        onClick={() => setDeleting(record)}
                        className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-red-600 hover:underline"
                      >
                        <Trash2 className="size-3" /> Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      {editing && (
        <EducationFormModal
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void router.invalidate();
          }}
        />
      )}

      {deleting && (
        <Modal title="Remove degree" onClose={() => setDeleting(null)}>
          <p className="text-sm text-muted-foreground">
            Remove <span className="font-semibold text-foreground">{deleting.degree}</span> from
            your education records? This cannot be undone.
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
              className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {removing && <Loader2 className="size-3.5 animate-spin" />}
              {removing ? "Removing…" : "Remove degree"}
            </button>
          </div>
        </Modal>
      )}
    </AlumniShell>
  );
}
