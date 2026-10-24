import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Pencil, Users, MapPin, LogOut } from "lucide-react";
import { AlumniShell } from "@/components/alumni-shell";
import { Modal, LabeledInput, PrimaryButton } from "@/components/modal";
import { ORGANIZATIONS, type OrganizationRecord } from "@/data/me";

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
  component: OrganizationPage,
});

function OrganizationPage() {
  const [editing, setEditing] = useState<OrganizationRecord | null>(null);
  const [adding, setAdding] = useState(false);
  const [isCurrent, setIsCurrent] = useState(true);
  const [ending, setEnding] = useState<OrganizationRecord | null>(null);
  const open = adding || editing !== null;

  const openForm = (record: OrganizationRecord | null) => {
    setEditing(record);
    setAdding(record === null);
    setIsCurrent(record ? record.current : true);
  };

  return (
    <AlumniShell
      title="Organization"
      subtitle="Groups and organizations you are involved in, as registered with OARCC."
    >
      <div className="flex justify-end">
        <button
          onClick={() => openForm(null)}
          className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-2 text-xs font-semibold text-brand-foreground hover:bg-brand-dark"
        >
          <Plus className="size-3.5" /> Add organization
        </button>
      </div>

      <ul className="mt-4 grid gap-3 md:grid-cols-2">
        {ORGANIZATIONS.map((o) => (
          <li
            key={o.id}
            className="rounded-lg border border-border bg-card p-5 transition-colors hover:border-brand"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full bg-highlight px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-highlight-foreground">
              <Users className="size-3" /> {o.position}
            </span>
            <span
              className={`ml-2 inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                o.current ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {o.current ? "Current" : "Previous"}
            </span>
            <h3 className="mt-3 text-sm font-bold leading-snug text-foreground">{o.name}</h3>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="size-3.5 text-brand" /> {o.address}
            </p>
            <dl className="mt-3 space-y-1 text-xs text-muted-foreground">
              <div>ID Number: {o.idNo}</div>
              <div>Contact no.: {o.contact}</div>
              <div>Email: {o.email}</div>
              <div>Membership since: {o.since}</div>
              {!o.current && <div>Membership ended: {o.until}</div>}
            </dl>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <button
                onClick={() => openForm(o)}
                className="flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
              >
                <Pencil className="size-3" /> View and Edit
              </button>
              {o.current && (
                <button
                  onClick={() => setEnding(o)}
                  className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-brand hover:underline"
                >
                  <LogOut className="size-3" /> Membership end
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {open && (
        <Modal
          title={editing ? "Edit organization" : "Add organization"}
          onClose={() => {
            setAdding(false);
            setEditing(null);
          }}
        >
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setAdding(false);
              setEditing(null);
            }}
          >
            <LabeledInput label="Group / Organization Name" defaultValue={editing?.name} />
            <LabeledInput label="ID Number" defaultValue={editing?.idNo} />
            <LabeledInput label="Group / Organization Address" defaultValue={editing?.address} />
            <LabeledInput label="Position" defaultValue={editing?.position} />
            <LabeledInput label="Contact No." defaultValue={editing?.contact} />
            <LabeledInput label="Email Address" type="email" defaultValue={editing?.email} />
            <LabeledInput
              label="Membership Since"
              placeholder="DD-MM-YYYY"
              defaultValue={editing?.since}
            />
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Is this organization current or previous?
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                {(
                  [
                    ["Current organization", true],
                    ["Previous organization", false],
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
                      type="checkbox"
                      checked={isCurrent === val}
                      onChange={() => setIsCurrent(val)}
                      className="size-4 accent-brand"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            {!isCurrent && (
              <LabeledInput
                label="Membership Ended"
                placeholder="DD-MM-YYYY"
                defaultValue={editing?.until}
              />
            )}
            <PrimaryButton type="submit">
              {editing ? "Save changes" : "Add organization"}
            </PrimaryButton>
          </form>
        </Modal>
      )}

      {ending && (
        <Modal title="End membership" onClose={() => setEnding(null)}>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setEnding(null);
            }}
          >
            <p className="text-sm text-muted-foreground">
              Mark your membership in{" "}
              <span className="font-semibold text-foreground">{ending.name}</span> as ended.
              The record stays in your profile as a previous organization.
            </p>
            <LabeledInput label="Membership Ended" placeholder="DD-MM-YYYY" />
            <PrimaryButton type="submit">Confirm membership end</PrimaryButton>
          </form>
        </Modal>
      )}
    </AlumniShell>
  );
}
