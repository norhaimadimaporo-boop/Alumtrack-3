import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Camera, Pencil, Plus, X, ShieldCheck } from "lucide-react";
import { AlumniShell } from "@/components/alumni-shell";
import { Modal, LabeledInput, PrimaryButton } from "@/components/modal";
import { Toggle } from "@/components/toggle";
import { Link } from "@tanstack/react-router";
import { ME } from "@/data/me";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "My Alumni Profile — AlumTrack MSU Main Campus" },
      {
        name: "description",
        content:
          "View and update your personal details, home and current address, contact information, and skills on AlumTrack.",
      },
      { property: "og:title", content: "My Alumni Profile — AlumTrack" },
      {
        property: "og:description",
        content: "Update your personal details, addresses, contacts, and skills.",
      },
    ],
  }),
  component: ProfilePage,
});

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm text-foreground">{value}</p>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="mt-4 space-y-4">{children}</div>
    </div>
  );
}

const personal: [string, string][] = [
  ["Last name", ME.lastName],
  ["First name", ME.firstName],
  ["Middle name", ME.middleName],
  ["Gender", ME.gender],
  ["Date of birth", ME.birthDate],
  ["Age", ME.age],
  ["Ethnicity / Tribe", ME.ethnicity],
  ["Place of birth", ME.birthPlace],
  ["Religious affiliation", ME.religion],
];

const contacts: [string, string][] = [
  ["Active mobile number", ME.contact],
  ["Active email address", ME.email],
  ["Akan email address", ME.akanEmail],
  ["Facebook account", ME.facebook],
];

function ProfilePage() {
  const [editing, setEditing] = useState(false);
  const [skills, setSkills] = useState(ME.skills);
  const [addingSkill, setAddingSkill] = useState(false);
  const [newSkill, setNewSkill] = useState("");

  const addSkill = () => {
    const s = newSkill.trim();
    if (s) setSkills((prev) => [...prev, s]);
    setNewSkill("");
    setAddingSkill(false);
  };

  return (
    <AlumniShell
      title="My Profile"
      subtitle="Everything you entered during registration — personal, address and contact details."
    >
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex flex-wrap items-center gap-5">
          <div className="relative">
            <span className="flex size-20 items-center justify-center rounded-full bg-brand text-xl font-bold text-brand-foreground">
              NA
            </span>
            <button className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full border border-border bg-background text-foreground">
              <Camera className="size-3.5" />
            </button>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-foreground">{ME.name}</h2>
            <p className="text-sm text-muted-foreground">
              {ME.course} · Batch {ME.batch}
            </p>
            <span className="mt-2 inline-flex rounded-full bg-success px-2.5 py-0.5 text-[11px] font-semibold text-success-foreground">
              {ME.status}
            </span>
          </div>
          <button
            onClick={() => setEditing((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-2 text-xs font-semibold text-brand-foreground hover:bg-brand-dark"
          >
            <Pencil className="size-3.5" />
            {editing ? "Save changes" : "Edit profile"}
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card title="Personal details">
          <div className="grid gap-4 sm:grid-cols-2">
            {personal.map(([label, value]) => (
              <Field key={label} label={label} value={value} />
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Personal details are locked after registration. Contact OARCC to request a
            correction.
          </p>
        </Card>

        <div className="space-y-4">
          <Card title="Address">
            {editing ? (
              <>
                <LabeledInput label="Current address" defaultValue={ME.currentAddress} />
                <LabeledInput label="Home address" defaultValue={ME.homeAddress} />
              </>
            ) : (
              <>
                <Field label="Current address" value={ME.currentAddress} />
                <Field label="Home address" value={ME.homeAddress} />
              </>
            )}
          </Card>

          <Card title="Contact details">
            {contacts.map(([label, value]) =>
              editing ? (
                <LabeledInput key={label} label={label} defaultValue={value} />
              ) : (
                <Field key={label} label={label} value={value} />
              ),
            )}
          </Card>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Skills</h3>
          <button
            onClick={() => setAddingSkill(true)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
          >
            <Plus className="size-3.5" /> Add skill
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {skills.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground"
            >
              {s}
              <button
                aria-label={`Remove ${s}`}
                onClick={() => setSkills((prev) => prev.filter((x) => x !== s))}
              >
                <X className="size-3 text-muted-foreground" />
              </button>
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-lg border-t-4 border-brand bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <ShieldCheck className="size-4 text-brand" /> Privacy settings
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Control what fellow alumni and public visitors can see about you.
            </p>
          </div>
          <Link
            to="/settings"
            className="shrink-0 rounded-md border border-brand px-3 py-2 text-xs font-semibold text-brand hover:bg-brand hover:text-brand-foreground"
          >
            All privacy options
          </Link>
        </div>
        <div className="mt-2 grid gap-x-8 divide-y divide-border sm:grid-cols-2 sm:divide-y-0">
          <Toggle
            label="Map my workplace on the GIS Alumni Map"
            hint="Appear as a pin for verified alumni only."
            defaultOn
          />
          <Toggle
            label="Show my current workplace to alumni"
            hint="Company and position in the verified directory."
            defaultOn
          />
          <Toggle
            label="Show my Facebook account to alumni"
            hint="Hidden from public visitors either way."
            defaultOn={false}
          />
          <Toggle
            label="Show my region of employment"
            hint="General region only — never your street address."
            defaultOn
          />
        </div>
      </div>

      {addingSkill && (
        <Modal title="Add a skill" onClose={() => setAddingSkill(false)}>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              addSkill();
            }}
          >
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                What skill do you want to add?
              </label>
              <input
                autoFocus
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                placeholder="e.g. Data Analysis"
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
              />
            </div>
            <PrimaryButton type="submit">Add skill</PrimaryButton>
          </form>
        </Modal>
      )}
    </AlumniShell>
  );
}
