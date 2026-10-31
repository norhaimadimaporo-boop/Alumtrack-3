import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check, ChevronLeft, ChevronRight, GraduationCap, Loader2 } from "lucide-react";

import { calculateAge } from "@/lib/profile-format";
import { registerAlumni } from "@/lib/registration.functions";
import {
  EDUCATION_LEVELS,
  type AddressInput,
  type EducationInput,
  type EducationLevel,
  type RegistrationInput,
} from "@/lib/registration.types";

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

const DEGREES = EDUCATION_LEVELS;

type DegreeDetail = Omit<EducationInput, "level">;

type EmploymentForm = {
  position: string;
  company: string;
  companyAddress: string;
  lengthOfEmployment: string;
  yearsInOffice: string;
  workLocation: "" | "Local" | "Abroad";
  sector:
    "" | "Government" | "Non-Government / Private Institution" | "Freelance / Entrepreneurial";
};

type OrganizationForm = {
  name: string;
  address: string;
  position: string;
  contactNo: string;
  email: string;
  memberSince: string;
};

type FormState = {
  firstName: string;
  middleName: string;
  lastName: string;
  gender: "" | "Male" | "Female" | "Prefer not to say";
  birthDate: string;
  ethnicity: string;
  birthPlace: string;
  religion: string;
  accountEmail: string;
  password: string;
  confirmPassword: string;
  sameAddress: boolean;
  currentAddress: AddressInput;
  homeAddress: AddressInput;
  mobileNumber: string;
  contactEmail: string;
  akanEmail: string;
  facebook: string;
  degrees: EducationLevel[];
  degreeDetails: Partial<Record<EducationLevel, DegreeDetail>>;
  employmentStatus: "" | "employed" | "unemployed";
  employment: EmploymentForm;
  affiliated: "" | "yes" | "no";
  organization: OrganizationForm;
};

function emptyAddress(): AddressInput {
  return {
    building: "",
    houseNo: "",
    block: "",
    street: "",
    subdivision: "",
    city: "",
    province: "",
    zipCode: "",
  };
}

function emptyDegree(): DegreeDetail {
  return {
    schoolIdNo: "",
    degree: "",
    major: "",
    college: "",
    school: "",
    schoolAddress: "",
    graduatedOn: "",
  };
}

function emptyEmployment(): EmploymentForm {
  return {
    position: "",
    company: "",
    companyAddress: "",
    lengthOfEmployment: "",
    yearsInOffice: "",
    workLocation: "",
    sector: "",
  };
}

function emptyOrganization(): OrganizationForm {
  return {
    name: "",
    address: "",
    position: "",
    contactNo: "",
    email: "",
    memberSince: "",
  };
}

function initialForm(): FormState {
  return {
    firstName: "",
    middleName: "",
    lastName: "",
    gender: "",
    birthDate: "",
    ethnicity: "",
    birthPlace: "",
    religion: "",
    accountEmail: "",
    password: "",
    confirmPassword: "",
    sameAddress: false,
    currentAddress: emptyAddress(),
    homeAddress: emptyAddress(),
    mobileNumber: "",
    contactEmail: "",
    akanEmail: "",
    facebook: "",
    degrees: [],
    degreeDetails: {},
    employmentStatus: "",
    employment: emptyEmployment(),
    affiliated: "",
    organization: emptyOrganization(),
  };
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function trim(value: string): string {
  return value.trim();
}

function validateStep(step: number, form: FormState): string | null {
  if (step === 0) {
    if (!trim(form.firstName)) return "Enter your first name.";
    if (!trim(form.lastName)) return "Enter your last name.";
    if (!form.gender) return "Select your gender.";
    if (!form.birthDate) return "Enter your date of birth.";
    if (!trim(form.ethnicity)) return "Enter your ethnicity or tribe.";
    if (!trim(form.birthPlace)) return "Enter your place of birth.";
    if (!trim(form.religion)) return "Enter your religious affiliation.";
    if (!EMAIL_PATTERN.test(trim(form.accountEmail)))
      return "Enter a valid email address for your account.";
    if (form.password.length < 8) return "Use at least 8 characters for your password.";
    if (form.password !== form.confirmPassword) return "The passwords do not match.";
    return null;
  }

  if (step === 1) {
    if (!trim(form.currentAddress.city) || !trim(form.currentAddress.province))
      return "Complete the city and province of your current address.";
    if (!form.sameAddress && (!trim(form.homeAddress.city) || !trim(form.homeAddress.province)))
      return "Complete the city and province of your home address.";
    if (!trim(form.mobileNumber)) return "Enter your active mobile number.";
    if (!EMAIL_PATTERN.test(trim(form.contactEmail))) return "Enter a valid active email address.";
    if (form.akanEmail && !EMAIL_PATTERN.test(trim(form.akanEmail)))
      return "Enter a valid Akan email address or leave it blank.";
    return null;
  }

  if (step === 2) {
    if (form.degrees.length === 0) return "Select at least one degree you have earned.";

    for (const level of form.degrees) {
      const detail = form.degreeDetails[level] ?? emptyDegree();
      if (!trim(detail.degree)) return `Enter the degree for ${level}.`;
      if (!trim(detail.major)) return `Enter the major for ${level}.`;
      if (!trim(detail.college)) return `Enter the college for ${level}.`;
      if (!trim(detail.school)) return `Enter the school attended for ${level}.`;
      if (!trim(detail.schoolAddress)) return `Enter the school address for ${level}.`;
      if (!detail.graduatedOn) return `Enter the graduation date for ${level}.`;
    }
    return null;
  }

  if (step === 3 && form.employmentStatus === "employed") {
    if (!trim(form.employment.position)) return "Enter your present position or job.";
    if (!trim(form.employment.company)) return "Enter your present company or agency.";
    if (!form.employment.workLocation) return "Select your employment location.";
    if (!form.employment.sector) return "Select your present employment sector.";
    return null;
  }

  if (step === 4 && form.affiliated === "yes") {
    if (!trim(form.organization.name)) return "Enter the organization or group name.";
    if (form.organization.email && !EMAIL_PATTERN.test(trim(form.organization.email)))
      return "Enter a valid organization email address or leave it blank.";
  }

  return null;
}

function buildPayload(form: FormState): RegistrationInput {
  const employmentStatus =
    form.employmentStatus === "employed"
      ? "employed"
      : form.employmentStatus === "unemployed"
        ? "unemployed"
        : "unknown";

  return {
    firstName: trim(form.firstName),
    middleName: trim(form.middleName),
    lastName: trim(form.lastName),
    gender: form.gender || "Prefer not to say",
    birthDate: form.birthDate,
    ethnicity: trim(form.ethnicity),
    birthPlace: trim(form.birthPlace),
    religion: trim(form.religion),
    accountEmail: trim(form.accountEmail),
    password: form.password,
    sameAddress: form.sameAddress,
    currentAddress: form.currentAddress,
    homeAddress: form.sameAddress ? form.currentAddress : form.homeAddress,
    mobileNumber: trim(form.mobileNumber),
    contactEmail: trim(form.contactEmail) || trim(form.accountEmail),
    akanEmail: trim(form.akanEmail),
    facebook: trim(form.facebook),
    education: form.degrees.map((level) => ({
      level,
      ...(form.degreeDetails[level] ?? emptyDegree()),
    })),
    employmentStatus,
    employment:
      employmentStatus === "employed"
        ? {
            position: trim(form.employment.position),
            company: trim(form.employment.company),
            companyAddress: trim(form.employment.companyAddress),
            lengthOfEmployment: trim(form.employment.lengthOfEmployment),
            yearsInOffice: trim(form.employment.yearsInOffice),
            workLocation: form.employment.workLocation,
            sector: form.employment.sector,
          }
        : null,
    organization:
      form.affiliated === "yes"
        ? {
            name: trim(form.organization.name),
            address: trim(form.organization.address),
            position: trim(form.organization.position),
            contactNo: trim(form.organization.contactNo),
            email: trim(form.organization.email),
            memberSince: form.organization.memberSince,
          }
        : null,
  };
}

function RegisterPage() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((previous) => ({ ...previous, [key]: value }));

  const setAccountEmail = (value: string) =>
    setForm((previous) => ({
      ...previous,
      accountEmail: value,
      contactEmail:
        previous.contactEmail === "" || previous.contactEmail === previous.accountEmail
          ? value
          : previous.contactEmail,
    }));

  const updateAddress = (
    target: "currentAddress" | "homeAddress",
    field: keyof AddressInput,
    value: string,
  ) =>
    setForm((previous) => ({
      ...previous,
      [target]: { ...previous[target], [field]: value },
    }));

  const updateEmployment = <K extends keyof EmploymentForm>(field: K, value: EmploymentForm[K]) =>
    setForm((previous) => ({
      ...previous,
      employment: { ...previous.employment, [field]: value },
    }));

  const updateOrganization = <K extends keyof OrganizationForm>(
    field: K,
    value: OrganizationForm[K],
  ) =>
    setForm((previous) => ({
      ...previous,
      organization: { ...previous.organization, [field]: value },
    }));

  const toggleDegree = (level: EducationLevel) =>
    setForm((previous) => {
      const selected = previous.degrees.includes(level);
      return {
        ...previous,
        degrees: selected
          ? previous.degrees.filter((item) => item !== level)
          : [...previous.degrees, level],
        degreeDetails: {
          ...previous.degreeDetails,
          [level]: previous.degreeDetails[level] ?? emptyDegree(),
        },
      };
    });

  const updateDegree = (level: EducationLevel, field: keyof DegreeDetail, value: string) =>
    setForm((previous) => ({
      ...previous,
      degreeDetails: {
        ...previous.degreeDetails,
        [level]: { ...(previous.degreeDetails[level] ?? emptyDegree()), [field]: value },
      },
    }));

  const last = step === PHASES.length - 1;
  const computedAge = form.birthDate ? calculateAge(form.birthDate) : "";

  const goToStep = (target: number) => {
    if (target <= step) {
      setStep(target);
      setError(null);
      return;
    }

    for (let index = step; index < target; index += 1) {
      const message = validateStep(index, form);
      if (message) {
        setStep(index);
        setError(message);
        return;
      }
    }

    setStep(target);
    setError(null);
  };

  const goNext = () => {
    const message = validateStep(step, form);
    if (message) {
      setError(message);
      return;
    }
    setError(null);
    setStep((current) => Math.min(PHASES.length - 1, current + 1));
  };

  const submit = async () => {
    for (let index = 0; index < PHASES.length; index += 1) {
      const message = validateStep(index, form);
      if (message) {
        setStep(index);
        setError(message);
        return;
      }
    }

    setError(null);
    setPending(true);

    try {
      const result = await registerAlumni({ data: buildPayload(form) });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setDone(true);
    } catch (caught) {
      console.error(caught);
      setError("We could not submit your registration right now. Please try again.");
    } finally {
      setPending(false);
    }
  };

  if (done) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-success text-success-foreground">
          <Check className="size-7" />
        </span>
        <h1 className="mt-6 text-2xl font-bold text-foreground">Registration submitted</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your alumni profile has been saved and sent to the OARCC for verification. You can now
          sign in using <span className="font-semibold text-foreground">{form.accountEmail}</span>.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/login"
            className="inline-flex rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground hover:bg-brand-dark"
          >
            Go to Login
          </Link>
          <Link
            to="/"
            className="inline-flex rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-foreground hover:border-brand"
          >
            Back to Home
          </Link>
        </div>
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
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Alumni Registration</h1>
          <p className="text-sm text-muted-foreground">
            Complete five phases to create your AlumTrack profile.
          </p>
        </div>
      </div>

      <ol className="mt-8 grid gap-2 sm:grid-cols-5">
        {PHASES.map((phase, index) => (
          <li key={phase}>
            <button
              type="button"
              onClick={() => goToStep(index)}
              className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${
                index === step
                  ? "border-brand bg-brand text-brand-foreground"
                  : index < step
                    ? "border-success/40 bg-success/10 text-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-brand"
              }`}
            >
              <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] opacity-80">
                Phase {index + 1}
              </span>
              <span className="block text-xs font-semibold leading-snug">{phase}</span>
            </button>
          </li>
        ))}
      </ol>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (last) void submit();
          else goNext();
        }}
        className="mt-6 rounded-xl border-t-4 border-brand bg-card p-6 shadow-sm sm:p-8"
      >
        {error && (
          <p
            role="alert"
            className="mb-5 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        {step === 0 && (
          <Section title="Phase 1 — Personal Details">
            <div className="mb-7 rounded-lg border border-border bg-muted/40 p-4">
              <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-brand">
                Account access
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                You will use this email and password to sign in after registration.
              </p>
              <div className="mt-3">
                <Grid>
                  <Field
                    label="Email Address"
                    type="email"
                    autoComplete="email"
                    value={form.accountEmail}
                    onChange={setAccountEmail}
                    placeholder="you@example.com"
                    required
                  />
                  <Field
                    label="Password"
                    type="password"
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(value) => update("password", value)}
                    placeholder="At least 8 characters"
                    required
                  />
                  <Field
                    label="Confirm Password"
                    type="password"
                    autoComplete="new-password"
                    value={form.confirmPassword}
                    onChange={(value) => update("confirmPassword", value)}
                    placeholder="Re-enter your password"
                    required
                  />
                </Grid>
              </div>
            </div>

            <Grid>
              <Field
                label="Last Name"
                value={form.lastName}
                onChange={(value) => update("lastName", value)}
                required
              />
              <Field
                label="First Name"
                value={form.firstName}
                onChange={(value) => update("firstName", value)}
                required
              />
              <Field
                label="Middle Name (Optional)"
                value={form.middleName}
                onChange={(value) => update("middleName", value)}
              />
              <Select
                label="Gender"
                value={form.gender}
                onChange={(value) => update("gender", value as FormState["gender"])}
                options={["Male", "Female", "Prefer not to say"]}
                required
              />
              <Field
                label="Date of Birth"
                type="date"
                value={form.birthDate}
                onChange={(value) => update("birthDate", value)}
                required
              />
              <Field
                label="Age"
                value={computedAge}
                onChange={() => undefined}
                readOnly
                placeholder="Computed from date of birth"
              />
              <Field
                label="Ethnicity / Tribe"
                value={form.ethnicity}
                onChange={(value) => update("ethnicity", value)}
                placeholder="e.g. Maranao"
                required
              />
              <Field
                label="Place of Birth"
                value={form.birthPlace}
                onChange={(value) => update("birthPlace", value)}
                placeholder="City / Municipality, Province"
                required
              />
              <Field
                label="Religious Affiliation"
                value={form.religion}
                onChange={(value) => update("religion", value)}
                required
              />
            </Grid>
          </Section>
        )}

        {step === 1 && (
          <div className="space-y-8">
            <Section title="Phase 2 — Current Address">
              <AddressFields
                value={form.currentAddress}
                onChange={(field, value) => updateAddress("currentAddress", field, value)}
              />
            </Section>
            <Section title="Home Address">
              <label className="mb-4 flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={form.sameAddress}
                  onChange={(event) => update("sameAddress", event.target.checked)}
                  className="size-4 accent-brand"
                />
                Same as current address
              </label>
              {!form.sameAddress && (
                <AddressFields
                  value={form.homeAddress}
                  onChange={(field, value) => updateAddress("homeAddress", field, value)}
                />
              )}
            </Section>
            <Section title="Contact Details">
              <Grid>
                <Field
                  label="Active Mobile Number"
                  value={form.mobileNumber}
                  onChange={(value) => update("mobileNumber", value)}
                  placeholder="09XX XXX XXXX"
                  required
                />
                <Field
                  label="Active Email Address"
                  type="email"
                  value={form.contactEmail}
                  onChange={(value) => update("contactEmail", value)}
                  required
                />
                <Field
                  label="Akan Email Address"
                  type="email"
                  value={form.akanEmail}
                  onChange={(value) => update("akanEmail", value)}
                  placeholder="you@msumain.edu.ph"
                />
                <Field
                  label="Facebook Account"
                  value={form.facebook}
                  onChange={(value) => update("facebook", value)}
                  placeholder="facebook.com/username"
                />
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
              {DEGREES.map((degree) => (
                <label
                  key={degree}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-3 text-sm font-medium transition-colors ${
                    form.degrees.includes(degree)
                      ? "border-brand bg-brand/5 text-brand"
                      : "border-border text-foreground hover:border-brand"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={form.degrees.includes(degree)}
                    onChange={() => toggleDegree(degree)}
                    className="size-4 accent-brand"
                  />
                  {degree}
                </label>
              ))}
            </div>

            {form.degrees.length === 0 && (
              <p className="mt-6 rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
                Check at least one degree to continue.
              </p>
            )}

            {DEGREES.filter((degree) => form.degrees.includes(degree)).map((degree) => {
              const detail = form.degreeDetails[degree] ?? emptyDegree();
              return (
                <div key={degree} className="mt-6 rounded-lg border border-border p-5">
                  <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-brand">
                    {degree}
                  </h3>
                  <Grid>
                    <Field
                      label="School ID No."
                      value={detail.schoolIdNo}
                      onChange={(value) => updateDegree(degree, "schoolIdNo", value)}
                      placeholder="e.g. 2020-30124"
                    />
                    <Field
                      label="Degree"
                      value={detail.degree}
                      onChange={(value) => updateDegree(degree, "degree", value)}
                      required
                    />
                    <Field
                      label="Major"
                      value={detail.major}
                      onChange={(value) => updateDegree(degree, "major", value)}
                      required
                    />
                    <Field
                      label="Name of College"
                      value={detail.college}
                      onChange={(value) => updateDegree(degree, "college", value)}
                      required
                    />
                    <Field
                      label="University / School Attended"
                      value={detail.school}
                      onChange={(value) => updateDegree(degree, "school", value)}
                      required
                    />
                    <Field
                      label="University / School Address"
                      value={detail.schoolAddress}
                      onChange={(value) => updateDegree(degree, "schoolAddress", value)}
                      required
                    />
                    <Field
                      label="Date Graduated"
                      type="date"
                      value={detail.graduatedOn}
                      onChange={(value) => updateDegree(degree, "graduatedOn", value)}
                      required
                    />
                  </Grid>
                </div>
              );
            })}
          </Section>
        )}

        {step === 3 && (
          <Section title="Phase 4 — Employment (Optional)">
            <div className="grid gap-2 sm:grid-cols-2">
              <Radio
                name="employment"
                label="Currently Unemployed"
                checked={form.employmentStatus === "unemployed"}
                onChange={() => update("employmentStatus", "unemployed")}
              />
              <Radio
                name="employment"
                label="Currently Employed"
                checked={form.employmentStatus === "employed"}
                onChange={() => update("employmentStatus", "employed")}
              />
            </div>

            {form.employmentStatus === "employed" && (
              <div className="mt-6 space-y-5 rounded-lg border border-border p-5">
                <Grid>
                  <Field
                    label="Present Position / Job"
                    value={form.employment.position}
                    onChange={(value) => updateEmployment("position", value)}
                    required
                  />
                  <Field
                    label="Present Company / Agency Name"
                    value={form.employment.company}
                    onChange={(value) => updateEmployment("company", value)}
                    required
                  />
                  <Field
                    label="Company Address"
                    value={form.employment.companyAddress}
                    onChange={(value) => updateEmployment("companyAddress", value)}
                  />
                  <Field
                    label="Length of Employment"
                    value={form.employment.lengthOfEmployment}
                    onChange={(value) => updateEmployment("lengthOfEmployment", value)}
                    placeholder="e.g. 3 years"
                  />
                  <Field
                    label="Years Assumed in Current Office / Agency"
                    value={form.employment.yearsInOffice}
                    onChange={(value) => updateEmployment("yearsInOffice", value)}
                    placeholder="e.g. 2"
                  />
                </Grid>
                <ChoiceRow
                  label="Location of Employment"
                  options={["Local", "Abroad"]}
                  value={form.employment.workLocation}
                  onChange={(value) =>
                    updateEmployment("workLocation", value as EmploymentForm["workLocation"])
                  }
                />
                <ChoiceRow
                  label="Present Employment Sector"
                  options={[
                    "Government",
                    "Non-Government / Private Institution",
                    "Freelance / Entrepreneurial",
                  ]}
                  value={form.employment.sector}
                  onChange={(value) =>
                    updateEmployment("sector", value as EmploymentForm["sector"])
                  }
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
                checked={form.affiliated === "no"}
                onChange={() => update("affiliated", "no")}
              />
              <Radio
                name="affiliation"
                label="Involved in an organization / group"
                checked={form.affiliated === "yes"}
                onChange={() => update("affiliated", "yes")}
              />
            </div>

            {form.affiliated === "yes" && (
              <div className="mt-6 rounded-lg border border-border p-5">
                <Grid>
                  <Field
                    label="Group / Organization Name"
                    value={form.organization.name}
                    onChange={(value) => updateOrganization("name", value)}
                    required
                  />
                  <Field
                    label="Group / Organization Address"
                    value={form.organization.address}
                    onChange={(value) => updateOrganization("address", value)}
                  />
                  <Field
                    label="Position"
                    value={form.organization.position}
                    onChange={(value) => updateOrganization("position", value)}
                  />
                  <Field
                    label="Contact No."
                    value={form.organization.contactNo}
                    onChange={(value) => updateOrganization("contactNo", value)}
                  />
                  <Field
                    label="Email Address"
                    type="email"
                    value={form.organization.email}
                    onChange={(value) => updateOrganization("email", value)}
                  />
                  <Field
                    label="Membership Since"
                    type="date"
                    value={form.organization.memberSince}
                    onChange={(value) => updateOrganization("memberSince", value)}
                  />
                </Grid>
              </div>
            )}
          </Section>
        )}

        <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
          <button
            type="button"
            disabled={step === 0 || pending}
            onClick={() => setStep((current) => Math.max(0, current - 1))}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-brand hover:text-brand disabled:opacity-40"
          >
            <ChevronLeft className="size-4" /> Back
          </button>
          <p className="hidden text-xs text-muted-foreground sm:block">
            Phase {step + 1} of {PHASES.length}
          </p>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-70"
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            {pending ? "Submitting…" : last ? "Submit Registration" : "Next"}
            {!last && !pending && <ChevronRight className="size-4" />}
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
  value,
  onChange,
  placeholder,
  type = "text",
  required,
  readOnly,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  readOnly?: boolean;
  autoComplete?: string;
}) {
  return (
    <div>
      <Label>
        {label}
        {required && <span className="ml-0.5 text-brand">*</span>}
      </Label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        autoComplete={autoComplete}
        className={`mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand ${
          readOnly ? "cursor-not-allowed bg-muted text-muted-foreground" : ""
        }`}
      />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
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
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
      >
        <option value="" disabled>
          Select…
        </option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function AddressFields({
  value,
  onChange,
}: {
  value: AddressInput;
  onChange: (field: keyof AddressInput, value: string) => void;
}) {
  return (
    <Grid>
      <Field
        label="Building"
        value={value.building}
        onChange={(next) => onChange("building", next)}
      />
      <Field
        label="House No."
        value={value.houseNo}
        onChange={(next) => onChange("houseNo", next)}
      />
      <Field label="Block" value={value.block} onChange={(next) => onChange("block", next)} />
      <Field label="Street" value={value.street} onChange={(next) => onChange("street", next)} />
      <Field
        label="Subdivision"
        value={value.subdivision}
        onChange={(next) => onChange("subdivision", next)}
      />
      <Field
        label="City / Municipality"
        value={value.city}
        onChange={(next) => onChange("city", next)}
        required
      />
      <Field
        label="Province"
        value={value.province}
        onChange={(next) => onChange("province", next)}
        required
      />
      <Field
        label="Zip Code"
        value={value.zipCode}
        onChange={(next) => onChange("zipCode", next)}
      />
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

function ChoiceRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => (
          <label
            key={option}
            className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
              value === option
                ? "border-brand bg-brand/5 text-brand"
                : "border-border text-foreground hover:border-brand"
            }`}
          >
            <input
              type="radio"
              name={label}
              checked={value === option}
              onChange={() => onChange(option)}
              className="size-4 accent-brand"
            />
            {option}
          </label>
        ))}
      </div>
    </div>
  );
}
