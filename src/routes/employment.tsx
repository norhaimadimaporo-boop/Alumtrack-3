import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, MapPin, Pencil, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AlumniShell } from "@/components/alumni-shell";
import { Modal, LabeledInput, PrimaryButton } from "@/components/modal";
import {
  deleteMyEmploymentData,
  getMyWorkspaceData,
  saveMyEmploymentData,
} from "@/lib/profile.functions";
import type { EmploymentRecordInput, WorkspaceEmployment } from "@/lib/profile.types";

export const Route = createFileRoute("/employment")({
  head: () => ({
    meta: [
      { title: "Employment History — AlumTrack MSU Main Campus" },
      {
        name: "description",
        content:
          "Add and edit your jobs, company details, and work location as an MSU Main Campus alumnus. Past jobs stay on record as previous.",
      },
      { property: "og:title", content: "Employment History — AlumTrack" },
      {
        property: "og:description",
        content: "Manage your current and previous jobs, sector, and work location.",
      },
    ],
  }),
  loader: async () => getMyWorkspaceData(),
  component: EmploymentPage,
});

const SECTORS = [
  "Government",
  "Non-Government / Private Institution",
  "Freelance / Entrepreneurial",
] as const;

function emptyRecord(): EmploymentRecordInput {
  return {
    isCurrent: true,
    position: "",
    company: "",
    companyAddress: "",
    lengthOfEmployment: "",
    yearsInOffice: "",
    workLocation: "",
    sector: "",
  };
}

function EmploymentFormModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: EmploymentRecordInput;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<EmploymentRecordInput>(initial);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof EmploymentRecordInput>(key: K, value: EmploymentRecordInput[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      const result = await saveMyEmploymentData({ data: form });
      if (result.ok) {
        toast.success(result.message);
        onSaved();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error("[employment] Save failed:", error);
      toast.error("We could not save this employment record. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={form.id ? "Edit job" : "Add employment record"} onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <LabeledInput
          label="Job / Position"
          value={form.position}
          onChange={(value) => set("position", value)}
          required
        />
        <LabeledInput
          label="Company/Agency Name"
          value={form.company}
          onChange={(value) => set("company", value)}
          required
        />
        <LabeledInput
          label="Company/Agency Address"
          value={form.companyAddress}
          onChange={(value) => set("companyAddress", value)}
        />

        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Is your work:
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            {(["Local", "Abroad"] as const).map((option) => (
              <label
                key={option}
                className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                  form.workLocation === option
                    ? "border-brand bg-brand/5 text-brand"
                    : "border-border text-foreground hover:border-brand"
                }`}
              >
                <input
                  type="radio"
                  name="workLocation"
                  checked={form.workLocation === option}
                  onChange={() => set("workLocation", option)}
                  className="size-4 accent-brand"
                />
                {option}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Present employment sector
          </label>
          <select
            value={form.sector}
            onChange={(event) =>
              set("sector", event.target.value as EmploymentRecordInput["sector"])
            }
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand"
          >
            <option value="">Select a sector</option>
            {SECTORS.map((sector) => (
              <option key={sector}>{sector}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <LabeledInput
            label="Length of employment"
            placeholder="e.g. 1 year, 5 months"
            value={form.lengthOfEmployment}
            onChange={(value) => set("lengthOfEmployment", value)}
          />
          <LabeledInput
            label="Years in current office"
            placeholder="e.g. 1 year"
            value={form.yearsInOffice}
            onChange={(value) => set("yearsInOffice", value)}
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Job status
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            {(
              [
                ["This is my current job", true],
                ["This is a previous job", false],
              ] as const
            ).map(([label, val]) => (
              <label
                key={label}
                className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                  form.isCurrent === val
                    ? "border-brand bg-brand/5 text-brand"
                    : "border-border text-foreground hover:border-brand"
                }`}
              >
                <input
                  type="radio"
                  name="isCurrent"
                  checked={form.isCurrent === val}
                  onChange={() => set("isCurrent", val)}
                  className="size-4 accent-brand"
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        <PrimaryButton type="submit" disabled={saving}>
          {saving ? "Saving…" : form.id ? "Save changes" : "Save record"}
        </PrimaryButton>
      </form>
    </Modal>
  );
}

function EmploymentPage() {
  const data = Route.useLoaderData();
  const router = useRouter();
  const [editing, setEditing] = useState<EmploymentRecordInput | null>(null);
  const [deleting, setDeleting] = useState<WorkspaceEmployment | null>(null);
  const [removing, setRemoving] = useState(false);

  if (!data.ok) {
    return (
      <AlumniShell title="Employment History">
        <div className="rounded-lg border-t-4 border-brand bg-card p-6">
          <p className="text-sm text-muted-foreground">{data.message}</p>
        </div>
      </AlumniShell>
    );
  }

  const { user, canEdit, employment } = data;

  const confirmDelete = async () => {
    if (!deleting) return;
    setRemoving(true);
    try {
      const result = await deleteMyEmploymentData({ data: { id: deleting.id } });
      if (result.ok) {
        toast.success(result.message);
        setDeleting(null);
        void router.invalidate();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error("[employment] Delete failed:", error);
      toast.error("We could not remove this employment record. Please try again.");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <AlumniShell
      title="Employment History"
      subtitle="Keep your current and previous jobs up to date for the OARCC tracer study."
      user={{ name: user.fullName, batch: user.batch, initials: user.initials }}
    >
      <div className="w-full min-w-0 max-w-full rounded-lg border-l-4 border-highlight bg-card p-4">
        <p className="text-xs leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">Graduate Tracer Study.</span> Your
          employment sector and work location are aggregated anonymously into OARCC tracer
          analytics.
        </p>
      </div>

      {canEdit ? (
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => setEditing(emptyRecord())}
            className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-2 text-xs font-semibold text-brand-foreground hover:bg-brand-dark"
          >
            <Plus className="size-3.5" /> Add employment
          </button>
        </div>
      ) : (
        <p className="mt-4 w-full min-w-0 max-w-full rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
          Adding or editing employment becomes available once the OARCC verifies your alumni record.
        </p>
      )}

      {employment.length === 0 ? (
        <p className="mt-4 w-full min-w-0 max-w-full rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
          No employment records on file yet.
        </p>
      ) : (
        <ol className="mt-4 w-full min-w-0 max-w-full space-y-3">
          {employment.map((record) => (
            <li
              key={record.id}
              className={`w-full min-w-0 rounded-lg border bg-card p-5 transition-colors hover:border-brand ${
                record.isCurrent ? "border-l-4 border-l-success border-border" : "border-border"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-foreground">
                      {record.position || "Position not provided"}
                    </h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        record.isCurrent
                          ? "bg-success text-success-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {record.isCurrent ? "Current job" : "Previous job"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {record.company || "Company not provided"}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="size-3.5 text-brand" />
                    {[record.companyAddress, record.workLocation].filter(Boolean).join(" · ") ||
                      "Location not provided"}
                  </p>
                  {record.lengthOfEmployment && (
                    <p className="text-xs text-muted-foreground">
                      Length of employment: {record.lengthOfEmployment}
                      {record.yearsInOffice ? ` · Years assumed: ${record.yearsInOffice}` : ""}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  {record.sector && (
                    <span className="inline-flex rounded-sm bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {record.sector}
                    </span>
                  )}
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
        <EmploymentFormModal
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void router.invalidate();
          }}
        />
      )}

      {deleting && (
        <Modal title="Remove employment record" onClose={() => setDeleting(null)}>
          <p className="text-sm text-muted-foreground">
            Remove{" "}
            <span className="font-semibold text-foreground">
              {deleting.position || "this employment record"}
            </span>
            ? This cannot be undone.
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
              {removing ? "Removing…" : "Remove record"}
            </button>
          </div>
        </Modal>
      )}
    </AlumniShell>
  );
}
