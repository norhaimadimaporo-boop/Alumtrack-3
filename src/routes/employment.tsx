import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, MapPin, Pencil } from "lucide-react";
import { AlumniShell } from "@/components/alumni-shell";
import { Modal, LabeledInput, PrimaryButton } from "@/components/modal";
import { EMPLOYMENT, type EmploymentRecord } from "@/data/me";

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
  component: EmploymentPage,
});

const SECTORS = [
  "Government",
  "Non-Government / Private Institution",
  "Freelance / Entrepreneurial",
] as const;

const ALIGNMENT = [
  "Closely aligned with my degree",
  "Somewhat aligned with my degree",
  "Not aligned with my degree",
] as const;

const SALARY_RANGES = [
  "Below ₱15,000",
  "₱15,000 – ₱25,000",
  "₱25,001 – ₱40,000",
  "₱40,001 – ₱60,000",
  "Above ₱60,000",
  "Prefer not to say",
] as const;

function EmploymentPage() {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<EmploymentRecord | null>(null);
  const [isCurrent, setIsCurrent] = useState(true);

  const openForm = (record: EmploymentRecord | null) => {
    setEditing(record);
    setIsCurrent(record ? record.current : true);
    setAdding(record === null);
  };

  const close = () => {
    setAdding(false);
    setEditing(null);
  };

  const open = adding || editing !== null;

  return (
    <AlumniShell
      title="Employment History"
      subtitle="Jobs cannot be deleted — mark a job as previous instead so your record stays complete."
    >
      <div className="rounded-lg border-l-4 border-highlight bg-card p-4">
        <p className="text-xs leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">Graduate Tracer Study.</span> Your
          employment sector, degree alignment, and salary range are aggregated anonymously
          into OARCC tracer analytics.
        </p>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          onClick={() => openForm(null)}
          className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-2 text-xs font-semibold text-brand-foreground hover:bg-brand-dark"
        >
          <Plus className="size-3.5" /> Add employment
        </button>
      </div>

      <ol className="mt-4 space-y-3">
        {EMPLOYMENT.map((e) => (
          <li
            key={e.id}
            className={`rounded-lg border bg-card p-5 transition-colors hover:border-brand ${
              e.current ? "border-l-4 border-l-success border-border" : "border-border"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-bold text-foreground">{e.position}</h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      e.current
                        ? "bg-success text-success-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {e.current ? "Current job" : "Previous job"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{e.company}</p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="size-3.5 text-brand" />
                  {e.location} · {e.workPlace}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">ID Number: {e.idNo}</p>
                {e.length && (
                  <p className="text-xs text-muted-foreground">
                    Length of employment: {e.length}
                    {e.yearsAssumed ? ` · Years assumed: ${e.yearsAssumed}` : ""}
                  </p>
                )}
                {e.otherInfo && (
                  <p className="mt-1 text-xs text-muted-foreground">{e.otherInfo}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-foreground">
                  {e.current ? `From ${e.from}` : `${e.from} — ${e.to}`}
                </p>
                <span className="mt-1 inline-flex rounded-sm bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {e.sector}
                </span>
                <button
                  onClick={() => openForm(e)}
                  className="mt-2 flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                >
                  <Pencil className="size-3" /> Edit
                </button>
              </div>
            </div>
          </li>
        ))}
      </ol>

      {open && (
        <Modal title={editing ? "Edit job" : "Add employment record"} onClose={close}>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              close();
            }}
          >
            <LabeledInput label="Job" defaultValue={editing?.position} />
            <LabeledInput label="ID Number" defaultValue={editing?.idNo} />
            <LabeledInput label="Company/Agency Name" defaultValue={editing?.company} />
            <LabeledInput label="Company/Agency Address" defaultValue={editing?.location} />

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Is your work:
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                {(["Local", "Abroad"] as const).map((o) => (
                  <label
                    key={o}
                    className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-foreground hover:border-brand"
                  >
                    <input
                      type="checkbox"
                      name="workplace"
                      defaultChecked={editing?.workPlace === o}
                      className="size-4 accent-brand"
                    />
                    {o}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Present employment sector
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                {SECTORS.map((s) => (
                  <label
                    key={s}
                    className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-foreground hover:border-brand"
                  >
                    <input
                      type="checkbox"
                      name="sector"
                      defaultChecked={editing?.sector === s}
                      className="size-4 accent-brand"
                    />
                    {s}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <LabeledInput
                label="Length of employment"
                placeholder="e.g. 1 year, 5 months"
                defaultValue={editing?.length}
              />
              <LabeledInput
                label="Years assumed in current office/agency"
                placeholder="e.g. 1 year"
                defaultValue={editing?.yearsAssumed}
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Is this occupation aligned with your degree?
              </label>
              <select className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand">
                {ALIGNMENT.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Monthly salary range
              </label>
              <select className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand">
                {SALARY_RANGES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
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
                      isCurrent === val
                        ? "border-brand bg-brand/5 text-brand"
                        : "border-border text-foreground hover:border-brand"
                    }`}
                  >
                    <input
                      type="radio"
                      name="jobstatus"
                      checked={isCurrent === val}
                      onChange={() => setIsCurrent(val)}
                      className="size-4 accent-brand"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <LabeledInput
                label="From"
                placeholder="DD-MM-YYYY"
                defaultValue={editing?.from}
              />
              {!isCurrent && (
                <LabeledInput
                  label="Until"
                  placeholder="DD-MM-YYYY"
                  defaultValue={editing?.to}
                />
              )}
            </div>

            <PrimaryButton type="submit">
              {editing ? "Save changes" : "Save record"}
            </PrimaryButton>
          </form>
        </Modal>
      )}
    </AlumniShell>
  );
}
