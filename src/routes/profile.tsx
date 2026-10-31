import { createFileRoute, Link } from "@tanstack/react-router";
import { GraduationCap, Briefcase, Users, ShieldCheck } from "lucide-react";

import { AlumniShell } from "@/components/alumni-shell";
import { Toggle } from "@/components/toggle";
import { getMyProfileData } from "@/lib/profile.functions";
import { initials } from "@/lib/profile-format";
import type { MyProfile } from "@/lib/admin.types";

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
  loader: async () => getMyProfileData(),
  component: ProfilePage,
});

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm text-foreground">{value || "—"}</p>
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

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <AlumniShell title="My Profile" subtitle="Your saved alumni record from MySQL.">
      <div className="rounded-lg border-t-4 border-brand bg-card p-6">
        <h2 className="text-sm font-bold text-foreground">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            to="/login"
            className="inline-flex rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground hover:bg-brand-dark"
          >
            Go to Login
          </Link>
          <Link
            to="/register"
            className="inline-flex rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:border-brand"
          >
            Create an alumni profile
          </Link>
        </div>
      </div>
    </AlumniShell>
  );
}

function verificationBadge(profile: MyProfile) {
  if (profile.verificationStatus === "verified") {
    return { label: "Verified by OARCC", className: "bg-success text-success-foreground" };
  }
  if (profile.verificationStatus === "rejected") {
    return { label: "Rejected", className: "bg-red-100 text-red-700" };
  }
  return { label: "For verification", className: "bg-highlight text-highlight-foreground" };
}

function ProfilePage() {
  const data = Route.useLoaderData();

  if (!data.ok) {
    return <EmptyState title="Sign-in required" message={data.message} />;
  }

  const profile = data.profile;

  if (!profile) {
    return (
      <EmptyState
        title="No alumni profile yet"
        message="Your account is signed in, but it has no alumni profile on record. Complete the registration form so the OARCC can verify your details."
      />
    );
  }

  const badge = verificationBadge(profile);

  return (
    <AlumniShell
      title="My Profile"
      subtitle="Everything you entered during registration — personal, address and contact details."
      user={{
        name: profile.fullName,
        batch: profile.batch,
        initials: initials(profile.fullName),
      }}
    >
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex flex-wrap items-center gap-5">
          <span className="flex size-20 shrink-0 items-center justify-center rounded-full bg-brand text-xl font-bold text-brand-foreground">
            {initials(profile.fullName) || "AL"}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-foreground">{profile.fullName}</h2>
            <p className="text-sm text-muted-foreground">
              {profile.course} · Batch {profile.batch}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${badge.className}`}
              >
                {badge.label}
              </span>
              <span className="inline-flex rounded-full border border-border px-2.5 py-0.5 text-[11px] font-semibold text-foreground">
                {profile.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card title="Personal details">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Last name" value={profile.lastName} />
            <Field label="First name" value={profile.firstName} />
            <Field label="Middle name" value={profile.middleName} />
            <Field label="Gender" value={profile.gender} />
            <Field label="Date of birth" value={profile.birthDate} />
            <Field label="Age" value={profile.age} />
            <Field label="Ethnicity / Tribe" value={profile.ethnicity} />
            <Field label="Place of birth" value={profile.birthPlace} />
            <Field label="Religious affiliation" value={profile.religion} />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Personal details are locked after registration. Contact OARCC to request a correction.
          </p>
        </Card>

        <div className="space-y-4">
          <Card title="Address">
            <Field label="Current address" value={profile.currentAddress} />
            <Field label="Home address" value={profile.homeAddress} />
          </Card>

          <Card title="Contact details">
            <Field label="Active mobile number" value={profile.mobileNumber} />
            <Field label="Active email address" value={profile.contactEmail} />
            <Field label="Akan email address" value={profile.akanEmail} />
            <Field label="Facebook account" value={profile.facebook} />
          </Card>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card title="Educational background">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand">
            <GraduationCap className="size-4" /> {profile.education.length} record
            {profile.education.length === 1 ? "" : "s"}
          </div>
          {profile.education.length === 0 ? (
            <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
              No education records on file.
            </p>
          ) : (
            <div className="space-y-3">
              {profile.education.map((record, index) => (
                <div
                  key={`${record.degree}-${index}`}
                  className="rounded-md border-l-2 border-brand bg-muted/40 p-3 text-sm"
                >
                  <p className="font-semibold text-foreground">{record.degree}</p>
                  <p className="text-muted-foreground">{record.college}</p>
                  <p className="text-xs text-muted-foreground">
                    {record.school}
                    {record.graduatedOn ? ` · Graduated ${record.graduatedOn}` : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Employment">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand">
            <Briefcase className="size-4" /> {profile.status}
          </div>
          {profile.employment.length === 0 ? (
            <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
              No employment record on file.
            </p>
          ) : (
            <div className="space-y-3">
              {profile.employment.map((record, index) => (
                <div
                  key={`${record.position}-${index}`}
                  className={`rounded-md p-3 text-sm ${
                    record.isCurrent
                      ? "border-l-4 border-success bg-success/10"
                      : "border-l-2 border-border bg-muted/40"
                  }`}
                >
                  <p className="font-semibold text-foreground">
                    {record.position || "Position not provided"}
                  </p>
                  <p className="text-muted-foreground">{record.company}</p>
                  <p className="text-xs text-muted-foreground">
                    {[record.sector, record.workLocation, record.yearsInOffice]
                      .filter(Boolean)
                      .join(" · ") || "Sector and location not provided"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="mt-4">
        <Card title="Organization / group affiliation">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand">
            <Users className="size-4" /> {profile.organizations.length} affiliation
            {profile.organizations.length === 1 ? "" : "s"}
          </div>
          {profile.organizations.length === 0 ? (
            <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
              No organization or group affiliation on file.
            </p>
          ) : (
            <div className="space-y-3">
              {profile.organizations.map((record, index) => (
                <div
                  key={`${record.name}-${index}`}
                  className="rounded-md border-l-4 border-success bg-success/10 p-3 text-sm"
                >
                  <p className="font-semibold text-foreground">{record.name}</p>
                  <p className="text-muted-foreground">
                    {record.position || "Member"}
                    {record.memberSince ? ` · since ${record.memberSince}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {[record.address, record.email].filter(Boolean).join(" · ")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
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
    </AlumniShell>
  );
}
