import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Pencil, GraduationCap } from "lucide-react";
import { AlumniShell } from "@/components/alumni-shell";
import { Modal, LabeledInput, PrimaryButton } from "@/components/modal";
import { EDUCATION, type EducationRecord } from "@/data/me";

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
  component: EducationPage,
});

const LEVELS = ["Post Graduate Degree", "Graduate Degree", "Baccalaureate Degree"] as const;

function EducationPage() {
  const [editing, setEditing] = useState<EducationRecord | null>(null);
  const [adding, setAdding] = useState(false);

  const open = adding || editing !== null;

  return (
    <AlumniShell
      title="Education Details"
      subtitle="The degrees you registered with OARCC. You may add or edit a degree anytime."
    >
      <div className="flex justify-end">
        <button
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-2 text-xs font-semibold text-brand-foreground hover:bg-brand-dark"
        >
          <Plus className="size-3.5" /> Add degree
        </button>
      </div>

      <ol className="mt-4 space-y-3">
        {EDUCATION.map((e) => (
          <li
            key={e.id}
            className="rounded-lg border border-border bg-card p-5 transition-colors hover:border-brand"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand">
                  <GraduationCap className="size-3" /> {e.level}
                </span>
                <h3 className="mt-2 text-sm font-bold text-foreground">{e.degree}</h3>
                <p className="text-xs text-muted-foreground">Major in {e.major}</p>
                <p className="mt-1 text-xs text-muted-foreground">ID Number: {e.idNo}</p>
                <p className="mt-2 text-xs text-muted-foreground">{e.college}</p>
                <p className="text-xs text-muted-foreground">
                  {e.school} · {e.schoolAddress}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Graduated
                </p>
                <p className="text-xs font-semibold text-foreground">{e.graduated}</p>
                <button
                  onClick={() => setEditing(e)}
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
        <Modal
          title={editing ? "Edit degree" : "Add degree"}
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
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Degree level
              </label>
              <select
                defaultValue={editing?.level ?? LEVELS[2]}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
              >
                {LEVELS.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </div>
            <LabeledInput label="Degree" defaultValue={editing?.degree} />
            <LabeledInput label="ID Number" defaultValue={editing?.idNo} />
            <LabeledInput label="Major" defaultValue={editing?.major} />
            <LabeledInput label="Name of College" defaultValue={editing?.college} />
            <LabeledInput
              label="University / School Attended"
              defaultValue={editing?.school}
            />
            <LabeledInput
              label="University / School Address"
              defaultValue={editing?.schoolAddress}
            />
            <LabeledInput
              label="Date Graduated"
              placeholder="DD-MM-YYYY"
              defaultValue={editing?.graduated}
            />
            <PrimaryButton type="submit">
              {editing ? "Save changes" : "Add degree"}
            </PrimaryButton>
          </form>
        </Modal>
      )}
    </AlumniShell>
  );
}
