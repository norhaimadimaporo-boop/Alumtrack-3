import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  BadgeCheck,
  Upload,
  FileSpreadsheet,
  GraduationCap,
  Briefcase,
  Users,
  MapPin,
  Download,
  Phone,
  UserRound,
} from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { Modal, LabeledInput, PrimaryButton } from "@/components/modal";
import { ALUMNI, COURSES, COLLEGES, REGIONS, BATCHES, initials, type Alumnus } from "@/data/alumni";

export const Route = createFileRoute("/admin/alumni")({
  head: () => ({
    meta: [
      { title: "Manage Alumni Directory — AlumTrack Admin" },
      {
        name: "description",
        content:
          "Add, edit, search, and delete alumni records and verify submitted professional information.",
      },
      { property: "og:title", content: "Manage Alumni Directory — AlumTrack Admin" },
      {
        property: "og:description",
        content: "Full control over alumni records and verification of professional info.",
      },
    ],
  }),
  component: AdminAlumni,
});

const VERIFIED = [1, 2, 4, 5, 7, 8, 10, 11];

const idNumber = (a: Alumnus) => `${a.batch}-${30000 + a.id * 137}`;

const EXPORT_FIELDS = [
  "Last Name",
  "First Name",
  "Middle Name",
  "College",
  "Degree / Course",
  "Date Graduated",
  "Home Address",
  "Employment and Business Address",
  "Position",
  "Present Address",
  "MSU ID No.",
  "Email Address",
  "Contact Number",
  "Gender",
  "Religion",
];

const CSV_COLUMNS =
  "Last Name, First Name, Middle Name, College, Degree/Course taken, Date Graduated, Campus Graduated, Home Address, Employment and Business Address, Position, Present Address, MSU ID No., Email Address, Contact Number, Gender, Religion";

const PHASE_STEPS = [
  "Personal details",
  "Address & contact",
  "Educational background",
  "Employment",
  "Organization",
] as const;

const DEGREE_TYPES = [
  "Post Graduate Degree",
  "Graduate Degree",
  "Baccalaureate Degree",
] as const;


function AdminAlumni() {
  const [query, setQuery] = useState("");
  const [course, setCourse] = useState("");
  const [batch, setBatch] = useState("");
  const [verification, setVerification] = useState("");
  const [viewing, setViewing] = useState<Alumnus | null>(null);
  const [editing, setEditing] = useState<Alumnus | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<Alumnus | null>(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [fields, setFields] = useState<string[]>([...EXPORT_FIELDS]);
  const [step, setStep] = useState(0);
  const [sameAddress, setSameAddress] = useState(false);
  const [degreeTypes, setDegreeTypes] = useState<string[]>([]);
  const [employed, setEmployed] = useState<"employed" | "unemployed" | "">("");
  const [affiliated, setAffiliated] = useState<"yes" | "no" | "">("");

  const resetWizard = () => {
    setStep(0);
    setSameAddress(false);
    setDegreeTypes([]);
    setEmployed("");
    setAffiliated("");
  };

  const rows = ALUMNI.filter((a) => {
    const verified = VERIFIED.includes(a.id);
    return (
      a.name.toLowerCase().includes(query.toLowerCase()) &&
      (course ? a.course === course : true) &&
      (batch ? a.batch === batch : true) &&
      (verification === ""
        ? true
        : verification === "Verified"
          ? verified
          : !verified)
    );
  });

  const open = adding || editing !== null;

  return (
    <AdminShell
      title="Manage Alumni Directory"
      subtitle="Add, edit, search, delete and verify alumni professional information."
      action={
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setExporting(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-brand px-3 py-2 text-xs font-semibold text-brand hover:bg-brand hover:text-brand-foreground"
          >
            <Download className="size-3.5" /> Export
          </button>
          <button
            onClick={() => setImporting(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-brand px-3 py-2 text-xs font-semibold text-brand hover:bg-brand hover:text-brand-foreground"
          >
            <Upload className="size-3.5" /> Import
          </button>
          <button
            onClick={() => {
              resetWizard();
              setAdding(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-2 text-xs font-semibold text-brand-foreground hover:bg-brand-dark"
          >
            <Plus className="size-3.5" /> Add alumni
          </button>
        </div>
      }
    >
      <div className="grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search alumni by name…"
            className="w-full rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-brand"
          />
        </div>
        <select
          value={course}
          onChange={(e) => setCourse(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
        >
          <option value="">All courses</option>
          {COURSES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select
          value={batch}
          onChange={(e) => setBatch(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
        >
          <option value="">All batches</option>
          {BATCHES.map((b) => (
            <option key={b}>{b}</option>
          ))}
        </select>
        <select
          value={verification}
          onChange={(e) => setVerification(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
        >
          <option value="">All statuses</option>
          <option value="Verified">Verified</option>
          <option value="For Verification">For Verification</option>
        </select>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        {rows.length} record{rows.length === 1 ? "" : "s"} found
      </p>

      <div className="mt-3 overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-border bg-muted/60">
            <tr className="text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-semibold">Alumni</th>
              <th className="px-4 py-3 font-semibold">Course / Batch</th>
              <th className="px-4 py-3 font-semibold">Employment</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((a) => {
              const verified = VERIFIED.includes(a.id);
              return (
                <tr key={a.id} className="align-top">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-brand-foreground">
                        {initials(a.name)}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground">{a.name}</p>
                        <p className="text-xs text-muted-foreground">ID No. {idNumber(a)}</p>
                        <p className="text-xs text-muted-foreground">{a.region}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {a.course}
                    <br />
                    Batch {a.batch}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {a.job}
                    <br />
                    {a.company}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        verified
                          ? "bg-success text-success-foreground"
                          : "bg-highlight text-highlight-foreground"
                      }`}
                    >
                      <BadgeCheck className="size-3" />
                      {verified ? "Verified" : "For verification"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      {!verified && (
                        <button className="text-xs font-semibold text-success hover:underline">
                          Verify
                        </button>
                      )}
                      <button
                        onClick={() => setViewing(a)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                      >
                        <Eye className="size-3" /> View
                      </button>
                      <button
                        onClick={() => setDeleting(a)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-brand hover:underline"
                      >
                        <Trash2 className="size-3" /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {exporting && (
        <Modal title="Export alumni records" onClose={() => setExporting(false)}>
          <div className="space-y-4">
            <p className="rounded-md border-l-4 border-highlight bg-muted/50 px-3 py-2 text-[11px] text-muted-foreground">
              Select the information you want to include. Only the selected columns are written to
              the CSV file, following the current search and filters.
            </p>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFields([...EXPORT_FIELDS])}
                className="rounded-full border border-brand px-3 py-1 text-[11px] font-semibold text-brand hover:bg-brand hover:text-brand-foreground"
              >
                Select all
              </button>
              <button
                onClick={() => setFields([])}
                className="rounded-full border border-border px-3 py-1 text-[11px] font-semibold text-muted-foreground hover:border-brand"
              >
                Clear all
              </button>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {EXPORT_FIELDS.map((f) => {
                const on = fields.includes(f);
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() =>
                      setFields((s) => (on ? s.filter((x) => x !== f) : [...s, f]))
                    }
                    className={`rounded-md border px-3 py-2 text-left text-xs font-semibold transition-colors ${
                      on
                        ? "border-brand bg-brand/10 text-brand"
                        : "border-border text-muted-foreground hover:border-brand"
                    }`}
                  >
                    {f}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setExporting(false)}
                className="rounded-md border border-border py-2.5 text-sm font-semibold text-foreground hover:border-brand"
              >
                Cancel
              </button>
              <button
                disabled={fields.length === 0}
                onClick={() => setExporting(false)}
                className="inline-flex items-center justify-center gap-1.5 rounded-md bg-brand py-2.5 text-sm font-semibold text-brand-foreground hover:bg-brand-dark disabled:opacity-40"
              >
                <FileSpreadsheet className="size-4" /> Export {fields.length} column
                {fields.length === 1 ? "" : "s"} to CSV
              </button>
            </div>
          </div>
        </Modal>
      )}

      {importing && (
        <Modal title="Import alumni records" onClose={() => setImporting(false)}>
          <div className="space-y-4">
            <p className="rounded-md border-l-4 border-highlight bg-muted/50 px-3 py-2 text-[11px] text-muted-foreground">
              Use import to add many alumni at once through a CSV file instead of encoding each
              record manually.
            </p>

            <div className="rounded-lg border border-border p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-brand">
                Instructions
              </p>
              <ol className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                <li>1. Download the official AlumTrack CSV template below.</li>
                <li>
                  2. Fill in one row per alumnus. The columns follow the same registration
                  information — Phase 1 to Phase 5.
                </li>
                <li>
                  3. Phase 1 (personal details), Phase 2 (address &amp; contact), and Phase 3
                  (educational background) are required. Phase 4 (employment) and Phase 5
                  (organization) may be left blank.
                </li>
                <li>
                  4. The file or table must follow this exact column format and order:{" "}
                  <span className="font-semibold text-foreground">({CSV_COLUMNS})</span>
                </li>
                <li>5. Keep all dates in DD-MM-YYYY format and do not rename the columns.</li>
                <li>6. Upload the finished file, review the preview, then confirm the import.</li>
              </ol>
              <button className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline">
                <FileSpreadsheet className="size-3.5" /> Download CSV template
              </button>
            </div>

            <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border px-4 py-6 text-center transition-colors hover:border-brand">
              <Upload className="size-5 text-brand" />
              <span className="text-xs font-semibold text-foreground">Upload CSV file</span>
              <span className="text-[11px] text-muted-foreground">
                Click to browse or drag and drop — .csv only, up to 5,000 rows.
              </span>
              <input type="file" accept=".csv" className="hidden" />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setImporting(false)}
                className="rounded-md border border-border py-2.5 text-sm font-semibold text-foreground hover:border-brand"
              >
                Cancel
              </button>
              <button
                onClick={() => setImporting(false)}
                className="rounded-md bg-brand py-2.5 text-sm font-semibold text-brand-foreground hover:bg-brand-dark"
              >
                Confirm import
              </button>
            </div>
          </div>
        </Modal>
      )}

      {open && (
        <Modal
          wide
          title={editing ? "Edit alumni record" : "Add alumni record"}
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
            <p className="rounded-md border-l-4 border-highlight bg-muted/50 px-3 py-2 text-[11px] text-muted-foreground">
              Same five phases as the alumni registration. Complete each phase, then save the
              record.
            </p>

            <ol className="flex flex-wrap gap-1.5">
              {PHASE_STEPS.map((s, i) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => setStep(i)}
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors ${
                      i === step
                        ? "border-brand bg-brand text-brand-foreground"
                        : i < step
                          ? "border-success bg-success/10 text-success"
                          : "border-border text-muted-foreground hover:border-brand"
                    }`}
                  >
                    {i + 1}. {s}
                  </button>
                </li>
              ))}
            </ol>

            {step === 0 && (
              <div className="space-y-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-brand">
                  Phase 1 — Personal details
                </p>
                <LabeledInput label="Full name" defaultValue={editing?.name} />
                <LabeledInput label="ID Number" defaultValue={editing ? idNumber(editing) : ""} />
                <div className="grid grid-cols-2 gap-3">
                  <LabeledInput label="Gender" />
                  <LabeledInput label="Date of birth" placeholder="DD-MM-YYYY" />
                  <LabeledInput label="Age" />
                  <LabeledInput label="Ethnicity / Tribe" />
                </div>
                <LabeledInput label="Place of birth" />
                <LabeledInput label="Religious affiliation" />
              </div>
            )}

            {step === 1 && (
              <div className="space-y-6">
                <p className="text-[11px] font-bold uppercase tracking-wide text-brand">
                  Phase 2 — Address and contact details
                </p>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-foreground">
                    Current address
                  </p>
                  <AddressFields />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-foreground">
                    Home address
                  </p>
                  <label className="mt-2 flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={sameAddress}
                      onChange={(e) => setSameAddress(e.target.checked)}
                      className="size-4 accent-brand"
                    />
                    Same as current address
                  </label>
                  {!sameAddress && <AddressFields />}
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-foreground">
                    Contact details
                  </p>
                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    <LabeledInput label="Active mobile number" placeholder="09XX XXX XXXX" />
                    <LabeledInput label="Active email address" type="email" />
                    <LabeledInput
                      label="Akan email address"
                      type="email"
                      placeholder="you@msumain.edu.ph"
                    />
                    <LabeledInput
                      label="Facebook account"
                      placeholder="facebook.com/username"
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-brand">
                  Phase 3 — Educational background
                </p>
                <p className="text-xs text-muted-foreground">
                  Select every degree earned. Details are requested per degree.
                </p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {DEGREE_TYPES.map((d) => (
                    <label
                      key={d}
                      className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-3 text-xs font-semibold transition-colors ${
                        degreeTypes.includes(d)
                          ? "border-brand bg-brand/5 text-brand"
                          : "border-border text-foreground hover:border-brand"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={degreeTypes.includes(d)}
                        onChange={() =>
                          setDegreeTypes((prev) =>
                            prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
                          )
                        }
                        className="size-4 accent-brand"
                      />
                      {d}
                    </label>
                  ))}
                </div>

                {degreeTypes.length === 0 && (
                  <p className="rounded-md bg-muted px-4 py-3 text-xs text-muted-foreground">
                    Check at least one degree to continue.
                  </p>
                )}

                {DEGREE_TYPES.filter((d) => degreeTypes.includes(d)).map((d) => (
                  <div key={d} className="rounded-md border border-border p-4">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-brand">
                      {d}
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <LabeledInput label="School ID No." placeholder="e.g. 2020-30124" />
                      <LabeledInput label="Degree" />
                      <LabeledInput label="Major" />
                      <LabeledInput label="Name of college" />
                      <LabeledInput label="University / school attended" />
                      <LabeledInput label="University / school address" />
                      <LabeledInput label="Date graduated" placeholder="DD-MM-YYYY" />
                    </div>
                  </div>
                ))}

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Course
                    </label>
                    <select
                      defaultValue={editing?.course ?? COURSES[0]}
                      className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
                    >
                      {COURSES.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      College
                    </label>
                    <select
                      defaultValue={editing?.college ?? COLLEGES[0]}
                      className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
                    >
                      {COLLEGES.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Batch year
                    </label>
                    <select
                      defaultValue={editing?.batch ?? BATCHES[0]}
                      className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
                    >
                      {BATCHES.map((b) => (
                        <option key={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Region
                    </label>
                    <select
                      defaultValue={editing?.region ?? REGIONS[0]}
                      className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
                    >
                      {REGIONS.map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-brand">
                  Phase 4 — Employment (optional)
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <Radio
                    name="employment"
                    label="Currently unemployed"
                    checked={employed === "unemployed"}
                    onChange={() => setEmployed("unemployed")}
                  />
                  <Radio
                    name="employment"
                    label="Currently employed"
                    checked={employed === "employed"}
                    onChange={() => setEmployed("employed")}
                  />
                </div>

                {employed === "" && (
                  <p className="mt-3 rounded-md bg-muted px-4 py-3 text-xs text-muted-foreground">
                    Select an employment status to continue.
                  </p>
                )}

                {employed === "employed" && (
                  <div className="mt-4 space-y-3 rounded-md border border-border p-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <LabeledInput
                        label="Present position / job"
                        defaultValue={editing?.job}
                      />
                      <LabeledInput
                        label="Present company / agency name"
                        defaultValue={editing?.company}
                      />
                      <LabeledInput label="Company address" />
                      <LabeledInput
                        label="Length of employment"
                        placeholder="e.g. 3 years"
                      />
                      <LabeledInput
                        label="Years assumed in current office / agency"
                        placeholder="e.g. 2"
                      />
                    </div>
                    <CheckRow
                      label="Location of employment"
                      name="location"
                      options={["Local", "Abroad"]}
                    />
                    <CheckRow
                      label="Present employment sector"
                      name="sector"
                      options={[
                        "Government",
                        "Non-Government / Private Institution",
                        "Freelance / Entrepreneurial",
                      ]}
                    />
                  </div>
                )}
              </div>
            )}

            {step === 4 && (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-brand">
                  Phase 5 — Organization / group affiliation (optional)
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <Radio
                    name="affiliation"
                    label="Not involved in any organization"
                    checked={affiliated === "no"}
                    onChange={() => setAffiliated("no")}
                  />
                  <Radio
                    name="affiliation"
                    label="Involved in an organization / group"
                    checked={affiliated === "yes"}
                    onChange={() => setAffiliated("yes")}
                  />
                </div>

                {affiliated === "" && (
                  <p className="mt-3 rounded-md bg-muted px-4 py-3 text-xs text-muted-foreground">
                    Select an option to continue.
                  </p>
                )}

                {affiliated === "yes" && (
                  <div className="mt-4 rounded-md border border-border p-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <LabeledInput label="Group / organization name" />
                      <LabeledInput label="Group / organization address" />
                      <LabeledInput label="Position" />
                      <LabeledInput label="Contact no." />
                      <LabeledInput label="Email address" type="email" />
                      <LabeledInput label="Membership since" placeholder="DD-MM-YYYY" />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                disabled={step === 0}
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                className="rounded-md border border-border py-2.5 text-sm font-semibold text-foreground hover:border-brand disabled:opacity-40"
              >
                Back
              </button>
              {step < PHASE_STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => s + 1)}
                  className="rounded-md bg-brand py-2.5 text-sm font-semibold text-brand-foreground hover:bg-brand-dark"
                >
                  Next phase
                </button>
              ) : (
                <PrimaryButton type="submit">
                  {editing ? "Save changes" : "Add record"}
                </PrimaryButton>
              )}
            </div>
          </form>
        </Modal>
      )}

      {viewing && (
        <Modal title="Alumni record" onClose={() => setViewing(null)}>
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg border-t-4 border-brand bg-card p-4">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-brand-foreground">
                {initials(viewing.name)}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground">{viewing.name}</p>
                <p className="text-xs text-muted-foreground">ID No. {idNumber(viewing)}</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="size-3 text-brand" /> {viewing.region}
                </p>
              </div>
              <span
                className={`ml-auto shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                  VERIFIED.includes(viewing.id)
                    ? "bg-success text-success-foreground"
                    : "bg-highlight text-highlight-foreground"
                }`}
              >
                {VERIFIED.includes(viewing.id) ? "Verified" : "For verification"}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Batch", value: viewing.batch },
                { label: "Degrees", value: "1" },
                { label: "Profile", value: "92%" },
              ].map((s) => (
                <div key={s.label} className="rounded-lg border border-border bg-card p-3">
                  <p className="text-base font-bold text-foreground">{s.value}</p>
                  <p className="text-[11px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>

            <MiniCard icon={UserRound} title="Personal details">
              <Row label="Full name" value={viewing.name} />
              <Row label="Gender" value={viewing.id % 2 === 0 ? "Female" : "Male"} />
              <Row label="Date of birth" value="14-03-1999" />
              <Row label="Age" value="27" />
              <Row label="Ethnicity / Tribe" value="Maranao" />
              <Row label="Place of birth" value="Marawi City, Lanao del Sur" />
              <Row label="Religious affiliation" value="Islam" />
            </MiniCard>

            <MiniCard icon={Phone} title="Contact details">
              <Row label="Present address" value={`Barangay Poblacion, ${viewing.region}`} />
              <Row label="Home address" value="Marinaut East, Marawi City, Lanao del Sur" />
              <Row label="Mobile number" value="+63 9XX XXX 1234" />
              <Row
                label="Email address"
                value={`${viewing.name.split(" ")[0]?.toLowerCase()}@email.com`}
              />
              <Row label="Akan email address" value="alumnus@msumain.edu.ph" />
              <Row label="Facebook account" value={`fb.com/${viewing.name.split(" ")[0]}`} />
            </MiniCard>

            <MiniCard icon={GraduationCap} title="Educational details">
              <div className="rounded-md border-l-2 border-brand bg-muted/40 p-3">
                <p className="font-semibold text-foreground">{viewing.course}</p>
                <p>{viewing.college}</p>
                <p>School ID No. {idNumber(viewing)}</p>
                <p>Batch {viewing.batch} · MSU Main Campus, Marawi City</p>
                <p className="text-[11px]">Baccalaureate · Graduated 06-{viewing.batch}</p>
              </div>
            </MiniCard>

            <MiniCard icon={Briefcase} title="Employment history">
              <div className="rounded-md border-l-4 border-success bg-success/10 p-3">
                <p className="flex items-center gap-2 font-semibold text-foreground">
                  {viewing.job}
                  <span className="rounded-full bg-success px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-success-foreground">
                    Current job
                  </span>
                </p>
                <p>{viewing.company}</p>
                <p>Government sector · Local · Aligned with degree</p>
                <p className="text-[11px]">{viewing.region} · 3 years in office</p>
              </div>
              <div className="mt-3 rounded-md border-l-2 border-border bg-muted/40 p-3">
                <p className="font-semibold text-foreground">Junior Associate</p>
                <p>Previous employer</p>
                <p className="text-[11px]">Previous · 2 years</p>
              </div>
            </MiniCard>

            <MiniCard icon={Users} title="Organization / group affiliation">
              <div className="rounded-md border-l-4 border-success bg-success/10 p-3">
                <p className="flex items-center gap-2 font-semibold text-foreground">
                  MSU Alumni Association Inc.
                  <span className="rounded-full bg-success px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-success-foreground">
                    Current
                  </span>
                </p>
                <p>Member · Secular · since 06-2019</p>
                <p className="text-[11px]">Marawi City · alumni@msumain.edu.ph</p>
              </div>
              <div className="mt-3 rounded-md border-l-2 border-border bg-muted/40 p-3">
                <p className="font-semibold text-foreground">College Student Council</p>
                <p>Former member · 2017 – 2019</p>
              </div>
            </MiniCard>


            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setViewing(null)}
                className="rounded-md border border-border py-2.5 text-sm font-semibold text-foreground hover:border-brand"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  resetWizard();
                  setEditing(viewing);
                  setViewing(null);
                }}
                className="inline-flex items-center justify-center gap-1.5 rounded-md bg-brand py-2.5 text-sm font-semibold text-brand-foreground hover:bg-brand-dark"
              >
                <Pencil className="size-3.5" /> Edit record
              </button>
            </div>
          </div>
        </Modal>
      )}
      {deleting && (
        <Modal title="Delete alumni record" onClose={() => setDeleting(null)}>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete the record of{" "}
            <span className="font-semibold text-foreground">{deleting.name}</span>? This removes
            the alumnus from the public directory.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              onClick={() => setDeleting(null)}
              className="rounded-md border border-border py-2.5 text-sm font-semibold text-foreground hover:border-brand"
            >
              Cancel
            </button>
            <button
              onClick={() => setDeleting(null)}
              className="rounded-md bg-brand py-2.5 text-sm font-semibold text-brand-foreground hover:bg-brand-dark"
            >
              Delete record
            </button>
          </div>
        </Modal>
      )}
    </AdminShell>
  );
}

function MiniCard({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof GraduationCap;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon className="size-4 text-brand" /> {title}
      </p>
      <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex flex-wrap justify-between gap-2">
      <span>{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </p>
  );
}

function AddressFields() {
  return (
    <div className="mt-2 grid gap-3 sm:grid-cols-2">
      <LabeledInput label="Building" />
      <LabeledInput label="House No." />
      <LabeledInput label="Block" />
      <LabeledInput label="Street" />
      <LabeledInput label="Subdivision" />
      <LabeledInput label="City / Municipality" />
      <LabeledInput label="Province" />
      <LabeledInput label="Zip code" />
    </div>
  );
}

function Radio({
  name,
  label,
  checked,
  onChange,
}: {
  name: string;
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-3 text-sm font-medium transition-colors ${
        checked
          ? "border-brand bg-brand/5 text-brand"
          : "border-border text-foreground hover:border-brand"
      }`}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="size-4 accent-brand"
      />
      {label}
    </label>
  );
}

function CheckRow({
  label,
  name,
  options,
}: {
  label: string;
  name: string;
  options: string[];
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {options.map((o) => (
          <label
            key={o}
            className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-foreground hover:border-brand"
          >
            <input type="radio" name={name} className="size-4 accent-brand" />
            {o}
          </label>
        ))}
      </div>
    </div>
  );
}
