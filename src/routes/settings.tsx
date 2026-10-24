import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Shield, Bell, KeyRound, MapPinned, Users } from "lucide-react";
import { AlumniShell } from "@/components/alumni-shell";
import { Modal, LabeledInput, PrimaryButton } from "@/components/modal";
import { Toggle } from "@/components/toggle";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Privacy & Settings — AlumTrack MSU Main Campus" },
      {
        name: "description",
        content:
          "Control which parts of your alumni profile are visible publicly and manage notifications and account security.",
      },
      { property: "og:title", content: "Privacy & Settings — AlumTrack" },
      {
        property: "og:description",
        content: "Manage profile visibility, notifications, and account security.",
      },
    ],
  }),
  component: SettingsPage,
});

const publicPrivacy = [
  {
    key: "contact",
    label: "Show my contact number publicly",
    hint: "Off by default — public visitors never see mobile numbers.",
    on: false,
  },
  {
    key: "email",
    label: "Show my email address publicly",
    hint: "Applies to both personal and Akan email addresses.",
    on: false,
  },
  {
    key: "employment",
    label: "Show my job and company in public alumni search",
    hint: "Only role, company, and general region are shown.",
    on: true,
  },
  {
    key: "region",
    label: "Include me in public regional statistics",
    hint: "Counted as an aggregate number only — never by name.",
    on: true,
  },
];

const gisPrivacy = [
  {
    key: "map",
    label: "Map my workplace on the GIS Alumni Map",
    hint: "Opt in to appear as a pin for verified alumni.",
    on: true,
  },
  {
    key: "nearby",
    label: "Let nearby alumni discover and connect with me",
    hint: "Shows approximate distance, never your exact address.",
    on: true,
  },
  {
    key: "precision",
    label: "Pin my city only instead of my exact workplace",
    hint: "Recommended for higher location privacy.",
    on: false,
  },
];

const directoryPrivacy = [
  { key: "fb", label: "Facebook profile", hint: "Visible in the verified alumni directory.", on: false },
  { key: "work", label: "Current workplace", hint: "Company and position.", on: true },
  { key: "reg", label: "Region of employment", hint: "General region, no street address.", on: true },
  { key: "mob", label: "Mobile number", hint: "Shared with fellow verified alumni only.", on: false },
];

const notifs = [
  { key: "events", label: "Alumni events and homecoming reminders", on: true },
  { key: "jobs", label: "New job offerings matching my course", on: true },
  { key: "news", label: "OARCC announcements", on: false },
];

function SettingsPage() {
  const [changing, setChanging] = useState(false);

  return (
    <AlumniShell
      title="Privacy & Settings"
      subtitle="Choose what other alumni and public visitors can see."
    >
      <div className="space-y-4">
        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Shield className="size-4 text-brand" /> Public profile visibility
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Controls what anonymous visitors can see on the public search page.
          </p>
          <div className="mt-2 divide-y divide-border">
            {publicPrivacy.map((p) => (
              <Toggle key={p.key} label={p.label} hint={p.hint} defaultOn={p.on} />
            ))}
          </div>
        </section>

        <section className="rounded-lg border-t-4 border-brand bg-card p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <MapPinned className="size-4 text-brand" /> GIS Alumni Map preferences
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Opt in or out of having your workplace location mapped.
          </p>
          <div className="mt-2 divide-y divide-border">
            {gisPrivacy.map((p) => (
              <Toggle key={p.key} label={p.label} hint={p.hint} defaultOn={p.on} />
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Users className="size-4 text-brand" /> Verified alumni directory
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Choose which details fellow registered alumni can see.
          </p>
          <div className="mt-2 divide-y divide-border">
            {directoryPrivacy.map((p) => (
              <Toggle key={p.key} label={p.label} hint={p.hint} defaultOn={p.on} />
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Bell className="size-4 text-brand" /> Notifications
          </h2>
          <div className="mt-2 divide-y divide-border">
            {notifs.map((n) => (
              <Toggle key={n.key} label={n.label} defaultOn={n.on} />
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <KeyRound className="size-4 text-brand" /> Account security
          </h2>
          <p className="mt-2 text-xs text-muted-foreground">
            Your account is verified by OARCC. Change your password regularly.
          </p>
          <button
            onClick={() => setChanging(true)}
            className="mt-4 rounded-md border border-brand px-3 py-2 text-xs font-semibold text-brand hover:bg-brand hover:text-brand-foreground"
          >
            Change password
          </button>
        </section>
      </div>

      {changing && (
        <Modal title="Change password" onClose={() => setChanging(false)}>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setChanging(false);
            }}
          >
            <LabeledInput label="Current password" type="password" placeholder="••••••••" />
            <LabeledInput label="New password" type="password" placeholder="••••••••" />
            <LabeledInput label="Confirm new password" type="password" placeholder="••••••••" />
            <PrimaryButton type="submit">Update password</PrimaryButton>
          </form>
        </Modal>
      )}
    </AlumniShell>
  );
}