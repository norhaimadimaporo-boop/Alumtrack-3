import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import {
  Shield,
  Bell,
  KeyRound,
  MapPinned,
  Users,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { AlumniShell } from "@/components/alumni-shell";
import { Modal, LabeledInput, PrimaryButton } from "@/components/modal";
import { Toggle } from "@/components/toggle";
import { getMyWorkspaceData } from "@/lib/profile.functions";
import { changeMyPasswordRecord, getMyPrivacy, saveMyPrivacySettingsRecord } from "@/lib/settings.functions";
import type { PrivacySettings } from "@/lib/settings.types";

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
  loader: async () => {
    const [workspace, privacy] = await Promise.all([getMyWorkspaceData(), getMyPrivacy()]);
    return { workspace, privacy };
  },
  component: SettingsPage,
});

type ToggleRow = { key: keyof PrivacySettings; label: string; hint?: string };

const publicRows: ToggleRow[] = [
  {
    key: "publicShowContact",
    label: "Show my contact number publicly",
    hint: "Off by default. When on, anonymous visitors can see your mobile number.",
  },
  {
    key: "publicShowEmail",
    label: "Show my email address publicly",
    hint: "Applies to both personal and Akan email addresses.",
  },
  {
    key: "publicShowEmployment",
    label: "Show my job and company in public alumni search",
    hint: "Only role, company, and general region are shown.",
  },
  {
    key: "publicIncludeRegionStats",
    label: "Include me in public regional statistics",
    hint: "Counted as an aggregate number only — never by name.",
  },
];

const gisRows: ToggleRow[] = [
  {
    key: "gisShowWorkplace",
    label: "Map my workplace on the GIS Alumni Map",
    hint: "Turn off to remove your pin from the map.",
  },
  {
    key: "gisNearbyDiscovery",
    label: "Let nearby alumni discover and connect with me",
    hint: "Shows approximate distance, never your exact address.",
  },
  {
    key: "gisCityOnly",
    label: "Pin my city only instead of my exact workplace",
    hint: "Hides your company name and shows a wider location.",
  },
];

const directoryRows: ToggleRow[] = [
  {
    key: "directoryShowFacebook",
    label: "Facebook profile",
    hint: "Visible to signed-in alumni in the verified directory.",
  },
  {
    key: "directoryShowWorkplace",
    label: "Current workplace",
    hint: "Company and position, for signed-in alumni.",
  },
  {
    key: "directoryShowRegion",
    label: "Region of employment",
    hint: "General region, no street address.",
  },
  {
    key: "directoryShowMobile",
    label: "Mobile number",
    hint: "Shared with fellow verified alumni only.",
  },
];

const notificationRows: ToggleRow[] = [
  { key: "notifyEvents", label: "Alumni events and homecoming reminders" },
  { key: "notifyJobs", label: "New job offerings matching my course" },
];

type PasswordForm = { current: string; next: string; confirm: string };
const blankPasswordForm: PasswordForm = { current: "", next: "", confirm: "" };

function SettingsPage() {
  const data = Route.useLoaderData();
  const user = data.workspace.ok ? data.workspace.user : null;

  const [settings, setSettings] = useState<PrivacySettings | null>(
    data.privacy.ok ? data.privacy.settings : null,
  );
  // Last-saved snapshot: toggles edit `settings` only; the database (and
  // Search/GIS visibility) changes when Save Changes sends the draft.
  const [savedSettings, setSavedSettings] = useState<PrivacySettings | null>(
    data.privacy.ok ? data.privacy.settings : null,
  );
  const [saveError, setSaveError] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [changing, setChanging] = useState(false);
  const [passwordForm, setPasswordForm] = useState<PasswordForm>(blankPasswordForm);
  const [passwordError, setPasswordError] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const hasUnsavedChanges =
    settings !== null &&
    savedSettings !== null &&
    (Object.keys(savedSettings) as Array<keyof PrivacySettings>).some(
      (key) => settings[key] !== savedSettings[key],
    );

  function updateSetting(key: keyof PrivacySettings, value: boolean) {
    // Draft only — nothing is written to the database until Save Changes.
    setSettings((current) => (current ? { ...current, [key]: value } : current));
    setSaveError("");
  }

  async function handleSaveSettings() {
    if (!settings || !hasUnsavedChanges || savingSettings) return;
    setSavingSettings(true);
    setSaveError("");
    try {
      const result = await saveMyPrivacySettingsRecord({ data: settings });
      if (!result.ok) {
        setSaveError(result.message);
        return;
      }
      setSavedSettings(settings);
      setToast(result.message);
    } catch (error) {
      console.error(error);
      setSaveError("Your settings could not be saved. Please try again.");
    } finally {
      setSavingSettings(false);
    }
  }

  function closePasswordModal() {
    setChanging(false);
    setPasswordError("");
    setPasswordForm(blankPasswordForm);
  }

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError("");

    if (passwordForm.next.length < 8) {
      setPasswordError("The new password must be at least 8 characters long.");
      return;
    }
    if (passwordForm.next !== passwordForm.confirm) {
      setPasswordError("The new password and the confirmation do not match.");
      return;
    }

    setSavingPassword(true);
    try {
      const result = await changeMyPasswordRecord({
        data: { currentPassword: passwordForm.current, newPassword: passwordForm.next },
      });
      if (!result.ok) {
        setPasswordError(result.message);
        return;
      }
      closePasswordModal();
      setToast(result.message);
    } catch (error) {
      console.error(error);
      setPasswordError("Something went wrong. Please try again.");
    } finally {
      setSavingPassword(false);
    }
  }

  function renderRows(rows: ToggleRow[]) {
    return rows.map((row) => (
      <Toggle
        key={row.key}
        label={row.label}
        hint={row.hint}
        on={settings ? settings[row.key] : false}
        onChange={(value) => updateSetting(row.key, value)}
        disabled={!settings}
      />
    ));
  }

  return (
    <AlumniShell
      title="Privacy & Settings"
      subtitle="Choose what other alumni and public visitors can see."
      user={user ? { name: user.fullName, batch: user.batch, initials: user.initials } : undefined}
    >
      {!data.privacy.ok && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{data.privacy.message}</span>
        </div>
      )}
      {saveError && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      <div className="space-y-4">
        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Shield className="size-4 text-brand" /> Public profile visibility
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Controls what anonymous visitors can see on the public search page.
          </p>
          <div className="mt-2 divide-y divide-border">{renderRows(publicRows)}</div>
        </section>

        <section className="rounded-lg border-t-4 border-brand bg-card p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <MapPinned className="size-4 text-brand" /> GIS Alumni Map preferences
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Opt in or out of having your workplace location mapped.
          </p>
          <div className="mt-2 divide-y divide-border">{renderRows(gisRows)}</div>
        </section>

        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Users className="size-4 text-brand" /> Verified alumni directory
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Choose which details fellow registered alumni can see. Public switches above still apply.
          </p>
          <div className="mt-2 divide-y divide-border">{renderRows(directoryRows)}</div>
        </section>

        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Bell className="size-4 text-brand" /> Notifications
          </h2>
          <div className="mt-2 divide-y divide-border">{renderRows(notificationRows)}</div>
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

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-5">
          <p className="text-xs text-muted-foreground">
            {hasUnsavedChanges
              ? "You have unsaved changes. Save to apply them to the database, Search Alumni, and GIS Map."
              : "All changes saved. Toggle switches apply only when you press Save Changes."}
          </p>
          <button
            type="button"
            onClick={() => void handleSaveSettings()}
            disabled={!settings || !hasUnsavedChanges || savingSettings}
            className="inline-flex items-center gap-1.5 rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-40"
          >
            {savingSettings ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

      {changing && (
        <Modal title="Change password" onClose={closePasswordModal}>
          <form className="space-y-4" onSubmit={submitPassword}>
            <LabeledInput
              label="Current password"
              type="password"
              placeholder="••••••••"
              value={passwordForm.current}
              onChange={(current) => setPasswordForm({ ...passwordForm, current })}
              required
            />
            <LabeledInput
              label="New password"
              type="password"
              placeholder="At least 8 characters"
              value={passwordForm.next}
              onChange={(next) => setPasswordForm({ ...passwordForm, next })}
              required
            />
            <LabeledInput
              label="Confirm new password"
              type="password"
              placeholder="••••••••"
              value={passwordForm.confirm}
              onChange={(confirm) => setPasswordForm({ ...passwordForm, confirm })}
              required
            />
            {passwordError && (
              <p className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                <span>{passwordError}</span>
              </p>
            )}
            <PrimaryButton type="submit" disabled={savingPassword}>
              {savingPassword ? "Updating…" : "Update password"}
            </PrimaryButton>
          </form>
        </Modal>
      )}

      {toast && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-md bg-success px-4 py-3 text-sm font-semibold text-success-foreground shadow-lg"
        >
          <CheckCircle2 className="size-4" /> {toast}
        </div>
      )}
    </AlumniShell>
  );
}
