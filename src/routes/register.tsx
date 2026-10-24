import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check, ChevronLeft, ChevronRight, GraduationCap } from "lucide-react";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Alumni Registration — AlumTrack MSU Main Campus" },
      {
        name: "description",
        content:
          "Register your MSU Main Campus alumni profile in five phases: personal details, address and contacts, education, employment, and organization affiliation.",
      },
      { property: "og:title", content: "Alumni Registration — AlumTrack" },
      {
        property: "og:description",
        content: "Create your MSU Main Campus alumni profile in five guided phases.",
      },
    ],
  }),
  component: RegisterPage,
});

const PHASES = [
  "Personal Details",
  "Address & Contact",
  "Educational Background",
  "Employment",
  "Organization Affiliation",
] as const;

const DEGREES = ["Post Graduate Degree", "Graduate Degree", "Baccalaureate Degree"] as const;

function RegisterPage() {
  const [step, setStep] = useState(0);
  const [sameAddress, setSameAddress] = useState(false);
  const [degrees, setDegrees] = useState<string[]>([]);
  const [employed, setEmployed] = useState<"employed" | "unemployed" | "">("");
  const [affiliated, setAffiliated] = useState<"yes" | "no" | "">("");
  const [done, setDone] = useState(false);

  const toggleDegree = (d: string) =>
    setDegrees((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  const last = step === PHASES.length - 1;

  if (done) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-success text-success-foreground">
          <Check className="size-7" />
        </span>
        <h1 className="mt-6 text-2xl font-bold text-foreground">Registration submitted</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your alumni profile has been sent to the OARCC for verification. You will be notified
          once your record is approved.
        </p>
        <Link
          to="/login"
          className="mt-8 inline-flex rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground hover:bg-brand-dark"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-full bg-brand text-brand-foreground">
          <GraduationCap className="size-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Alumni Registration
          </h1>
          <p className="text-sm text-muted-foreground">
            Complete five phases to create your AlumTrack profile.
          </p>
        </div>
      </div>

      <ol className="mt-8 grid gap-2 sm:grid-cols-5">
        {PHASES.map((p, i) => (
          <li key={p}>
            <button
              type="button"
              onClick={() => setStep(i)}
              className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${
                i === step
                  ? "border-brand bg-brand text-brand-foreground"
                  : i < step
                    ? "border-success/40 bg-success/10 text-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-brand"
              }`}
            >
              <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] opacity-80">
                Phase {i + 1}
              </span>
              <span className="block text-xs font-semibold leading-snug">{p}</span>
            </button>
          </li>
        ))}
      </ol>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (last) setDone(true);
          else setStep((s) => s + 1);
        }}
        className="mt-6 rounded-xl border-t-4 border-brand bg-card p-6 shadow-sm sm:p-8"
      >
        {step === 0 && (
          <Section title="Phase 1 — Personal Details">
            <Grid>
              <Field label="Last Name" required />
              <Field label="First Name" required />
              <Field label="Middle Name (Optional)" />
              <Select label="Gender" options={["Male", "Female", "Prefer not to say"]} required />
              <Field label="Date of Birth" placeholder="DD-MM-YYYY" required />
              <Field label="Age" type="number" placeholder="e.g. 24" required />
              <Field label="Ethnicity / Tribe" placeholder="e.g. Maranao" required />
              <Field label="Place of Birth" placeholder="City / Municipality, Province" required />
              <Field label="Religious Affiliation" required />
            </Grid>
          </Section>
        )}

        {step === 1 && (
          <div className="space-y-8">
            <Section title="Phase 2 — Current Address">
              <AddressFields />
            </Section>
            <Section title="Home Address">
              <label className="mb-4 flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={sameAddress}
                  onChange={(e) => setSameAddress(e.target.checked)}
                  className="size-4 accent-brand"
                />
                Same as current address
              </label>
              {!sameAddress && <AddressFields />}
            </Section>
            <Section title="Contact Details">
              <Grid>
                <Field label="Active Mobile Number" placeholder="09XX XXX XXXX" required />
                <Field label="Active Email Address" type="email" required />
                <Field
                  label="Akan Email Address"
                  type="email"
                  placeholder="you@msumain.edu.ph"
                />
                <Field label="Facebook Account" placeholder="facebook.com/username" />
              </Grid>
            </Section>
          </div>
        )}

        {step === 2 && (
          <Section title="Phase 3 — Educational Background">
            <p className="mb-3 text-sm text-muted-foreground">
              Select every degree you have earned. Details are requested per degree.
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
              {DEGREES.map((d) => (
                <label
                  key={d}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-3 text-sm font-medium transition-colors ${
                    degrees.includes(d)
                      ? "border-brand bg-brand/5 text-brand"
                      : "border-border text-foreground hover:border-brand"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={degrees.includes(d)}
                    onChange={() => toggleDegree(d)}
                    className="size-4 accent-brand"
                  />
                  {d}
                </label>
              ))}
            </div>

            {degrees.length === 0 && (
              <p className="mt-6 rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
                Check at least one degree to continue.
              </p>
            )}

            {DEGREES.filter((d) => degrees.includes(d)).map((d) => (
              <div key={d} className="mt-6 rounded-lg border border-border p-5">
                <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-brand">{d}</h3>
                <Grid>
                  <Field label="School ID No." placeholder="e.g. 2020-30124" required />
                  <Field label="Degree" required />
                  <Field label="Major" required />
                  <Field label="Name of College" required />
                  <Field label="University / School Attended" required />
                  <Field label="University / School Address" required />
                  <Field label="Date Graduated" placeholder="DD-MM-YYYY" required />
                </Grid>
              </div>
            ))}
          </Section>
        )}

        {step === 3 && (
          <Section title="Phase 4 — Employment (Optional)">
            <div className="grid gap-2 sm:grid-cols-2">
              <Radio
                name="employment"
                label="Currently Unemployed"
                checked={employed === "unemployed"}
                onChange={() => setEmployed("unemployed")}
              />
              <Radio
                name="employment"
                label="Currently Employed"
                checked={employed === "employed"}
                onChange={() => setEmployed("employed")}
              />
            </div>

            {employed === "employed" && (
              <div className="mt-6 space-y-5 rounded-lg border border-border p-5">
                <Grid>
                  <Field label="Present Position / Job" />
                  <Field label="Present Company / Agency Name" />
                  <Field label="Company Address" />
                  <Field label="Length of Employment" placeholder="e.g. 3 years" />
                  <Field label="Years Assumed in Current Office / Agency" placeholder="e.g. 2" />
                </Grid>
                <CheckRow
                  label="Location of Employment"
                  name="location"
                  options={["Local", "Abroad"]}
                />
                <CheckRow
                  label="Present Employment Sector"
                  name="sector"
                  options={[
                    "Government",
                    "Non-Government / Private Institution",
                    "Freelance / Entrepreneurial",
                  ]}
                />
              </div>
            )}
          </Section>
        )}

        {step === 4 && (
          <Section title="Phase 5 — Organization / Group Affiliation (Optional)">
            <div className="grid gap-2 sm:grid-cols-2">
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

            {affiliated === "yes" && (
              <div className="mt-6 rounded-lg border border-border p-5">
                <Grid>
                  <Field label="Group / Organization Name" />
                  <Field label="Group / Organization Address" />
                  <Field label="Position" />
                  <Field label="Contact No." />
                  <Field label="Email Address" type="email" />
                  <Field label="Membership Since" placeholder="DD-MM-YYYY" />
                </Grid>
              </div>
            )}
          </Section>
        )}

        <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
          <button
            type="button"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-brand hover:text-brand disabled:opacity-40"
          >
            <ChevronLeft className="size-4" /> Back
          </button>
          <p className="hidden text-xs text-muted-foreground sm:block">
            Phase {step + 1} of {PHASES.length}
          </p>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand-dark"
          >
            {last ? "Submit Registration" : "Next"}
            {!last && <ChevronRight className="size-4" />}
          </button>
        </div>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already registered?{" "}
        <Link to="/login" className="font-semibold text-brand hover:underline">
          Sign in here
        </Link>
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-5 border-l-4 border-brand pl-3 text-lg font-bold text-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-xs font-semibold uppercase tracking-wide text-foreground">
      {children}
    </label>
  );
}

function Field({
  label,
  placeholder,
  type = "text",
  required,
}: {
  label: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <Label>
        {label}
        {required && <span className="ml-0.5 text-brand">*</span>}
      </Label>
      <input
        type={type}
        placeholder={placeholder}
        className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
      />
    </div>
  );
}

function Select({
  label,
  options,
  required,
}: {
  label: string;
  options: string[];
  required?: boolean;
}) {
  return (
    <div>
      <Label>
        {label}
        {required && <span className="ml-0.5 text-brand">*</span>}
      </Label>
      <select
        defaultValue=""
        className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
      >
        <option value="" disabled>
          Select…
        </option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

function AddressFields() {
  return (
    <Grid>
      <Field label="Building" />
      <Field label="House No." />
      <Field label="Block" />
      <Field label="Street" />
      <Field label="Subdivision" />
      <Field label="City / Municipality" />
      <Field label="Province" />
      <Field label="Zip Code" />
    </Grid>
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
      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-3 text-sm font-medium transition-colors ${
        checked ? "border-brand bg-brand/5 text-brand" : "border-border text-foreground hover:border-brand"
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
      <Label>{label}</Label>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o) => (
          <label
            key={o}
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:border-brand"
          >
            <input type="radio" name={name} className="size-4 accent-brand" />
            {o}
          </label>
        ))}
      </div>
    </div>
  );
}
