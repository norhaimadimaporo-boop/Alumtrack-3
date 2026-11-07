import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { AddressFields } from "@/components/address-fields";
import { Modal } from "@/components/modal";
import { updateMyProfileData } from "@/lib/profile.functions";
import type { ProfileEditInput } from "@/lib/profile.types";
import type { AddressInput } from "@/lib/registration.types";

type TabKey = "personal" | "address" | "contact";

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "personal", label: "Personal details" },
  { key: "address", label: "Address" },
  { key: "contact", label: "Contact" },
];

const GENDERS = ["Female", "Male", "Prefer not to say"] as const;

function TextField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand"
      />
    </label>
  );
}

function AddressBlock({
  title,
  value,
  onChange,
}: {
  title: string;
  value: AddressInput;
  onChange: (next: AddressInput) => void;
}) {
  return (
    <fieldset className="rounded-lg border border-border p-4">
      <legend className="px-1 text-xs font-bold uppercase tracking-wide text-brand">{title}</legend>
      <AddressFields value={value} onChange={onChange} />
    </fieldset>
  );
}

export function ProfileEditModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: ProfileEditInput;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [tab, setTab] = useState<TabKey>("personal");
  const [form, setForm] = useState<ProfileEditInput>(initial);
  const [sameAddress, setSameAddress] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof ProfileEditInput>(key: K, value: ProfileEditInput[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const toggleSameAddress = (checked: boolean) => {
    setSameAddress(checked);
    if (checked) {
      setForm((current) => ({ ...current, homeAddress: current.currentAddress }));
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);

    try {
      const result = await updateMyProfileData({ data: form });
      if (result.ok) {
        toast.success(result.message);
        onSaved();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error("[profile] Update request failed:", error);
      toast.error("We could not save your changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Edit profile" onClose={onClose} wide>
      <div className="flex flex-wrap gap-1.5 rounded-lg border border-border p-1">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              tab === item.key
                ? "bg-brand text-brand-foreground"
                : "text-foreground/80 hover:bg-muted"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
        {tab === "personal" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="First name"
              value={form.firstName}
              onChange={(value) => set("firstName", value)}
              required
            />
            <TextField
              label="Middle name"
              value={form.middleName}
              onChange={(value) => set("middleName", value)}
            />
            <TextField
              label="Last name"
              value={form.lastName}
              onChange={(value) => set("lastName", value)}
              required
            />
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Gender
              </span>
              <select
                value={form.gender}
                onChange={(event) =>
                  set("gender", event.target.value as ProfileEditInput["gender"])
                }
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand"
              >
                {GENDERS.map((gender) => (
                  <option key={gender}>{gender}</option>
                ))}
              </select>
            </label>
            <TextField
              label="Date of birth"
              type="date"
              value={form.birthDate}
              onChange={(value) => set("birthDate", value)}
              required
            />
            <TextField
              label="Ethnicity / Tribe"
              value={form.ethnicity}
              onChange={(value) => set("ethnicity", value)}
              placeholder="e.g. Maranao"
              required
            />
            <TextField
              label="Place of birth"
              value={form.birthPlace}
              onChange={(value) => set("birthPlace", value)}
              required
            />
            <TextField
              label="Religious affiliation"
              value={form.religion}
              onChange={(value) => set("religion", value)}
              required
            />
          </div>
        )}

        {tab === "address" && (
          <div className="space-y-4">
            <AddressBlock
              title="Current address"
              value={form.currentAddress}
              onChange={(value) => set("currentAddress", value)}
            />
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={sameAddress}
                onChange={(event) => toggleSameAddress(event.target.checked)}
                className="size-4 accent-brand"
              />
              My home address is the same as my current address
            </label>
            <AddressBlock
              title="Home address"
              value={form.homeAddress}
              onChange={(value) => set("homeAddress", value)}
            />
          </div>
        )}

        {tab === "contact" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Active mobile number"
              value={form.mobileNumber}
              onChange={(value) => set("mobileNumber", value)}
              required
            />
            <TextField
              label="Personal email address"
              type="email"
              value={form.contactEmail}
              onChange={(value) => set("contactEmail", value)}
              required
            />
            <TextField
              label="Akan email address"
              type="email"
              value={form.akanEmail}
              onChange={(value) => set("akanEmail", value)}
            />
            <TextField
              label="Facebook account"
              value={form.facebook}
              onChange={(value) => set("facebook", value)}
              placeholder="fb.com/your.profile"
            />
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <p className="text-[11px] text-muted-foreground">
            Changes are saved directly to your MySQL alumni record.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border px-3 py-2 text-xs font-semibold text-foreground hover:border-brand"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-2 text-xs font-semibold text-brand-foreground hover:bg-brand-dark disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Check className="size-3.5" />
              )}
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
