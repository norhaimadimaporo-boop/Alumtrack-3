import { useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Briefcase,
  Building2,
  GraduationCap,
  Lock,
  MapPin,
  Phone,
  Mail,
  Globe,
  X,
} from "lucide-react";

import { ProfileAvatar } from "@/components/profile-avatar";
import { initials } from "@/lib/profile-format";
import type { PublicAlumnus } from "@/lib/search.types";

/**
 * Enlarged, privacy-safe alumni profile shown from the public directory.
 * The avatar here uses ProfileAvatar so clicking it reveals "View profile
 * picture", which opens the existing circular zoom lightbox unchanged.
 */
export function AlumniProfileModal({
  alumnus,
  signedIn,
  onClose,
}: {
  alumnus: PublicAlumnus;
  signedIn: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  const statusColor =
    alumnus.status === "Employed"
      ? "bg-emerald-100 text-emerald-900 border border-emerald-200/80 font-semibold tracking-wide"
      : alumnus.status === "Unemployed"
        ? "bg-amber-100 text-amber-900 border border-amber-200/80 font-semibold tracking-wide"
        : "bg-white/20 text-white border border-white/30 font-semibold tracking-wide";
  const location = alumnus.location ?? alumnus.region;

  return createPortal(
    <div
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-6"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${alumnus.name} profile`}
        className="animate-[modalIn_180ms_ease-out] relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#E6DFD5] bg-card shadow-2xl"
      >
        <button
          type="button"
          aria-label="Close profile"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex size-9 items-center justify-center rounded-full border border-border bg-card/90 text-muted-foreground transition-colors hover:text-brand"
        >
          <X className="size-5" />
        </button>

        <div className="border-b border-border bg-gradient-to-br from-[#5A0012] to-[#7A1315] px-5 py-6 text-white sm:px-7">
          <div className="flex items-center gap-4">
            <ProfileAvatar
              userId={alumnus.userId}
              name={alumnus.name}
              initials={initials(alumnus.name)}
              avatarUrl={alumnus.avatarUrl}
              sizeClassName="size-20 sm:size-24"
              textClassName="text-2xl sm:text-3xl"
            />
            <div className="min-w-0">
              <h2 className="text-xl font-bold leading-tight sm:text-2xl">{alumnus.name}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                  Verified alumnus
                </span>
                <span className={`rounded-full px-3 py-0.5 text-xs uppercase ${statusColor}`}>
                  {alumnus.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 px-5 py-5 sm:grid-cols-2 sm:px-7">
          <Detail
            icon={<GraduationCap className="size-4 text-brand" />}
            label="College"
            value={alumnus.college}
          />
          <Detail
            icon={<GraduationCap className="size-4 text-brand" />}
            label="Degree / Course"
            value={alumnus.course}
          />
          <Detail
            icon={<GraduationCap className="size-4 text-brand" />}
            label="Batch year"
            value={alumnus.batch}
          />
          <Detail
            icon={<Building2 className="size-4 text-brand" />}
            label="Company / Agency"
            value={alumnus.company ?? "Employment details private"}
          />
          <Detail
            icon={<Briefcase className="size-4 text-brand" />}
            label="Current position"
            value={alumnus.job ?? "Employment details private"}
          />
          <Detail
            icon={<MapPin className="size-4 text-brand" />}
            label="Current location"
            value={location ?? "Location is private"}
          />
          <Detail
            icon={<Phone className="size-4 text-brand" />}
            label="Mobile number"
            value={alumnus.mobile ?? "Private"}
          />
          <Detail
            icon={<Globe className="size-4 text-brand" />}
            label="Facebook"
            value={alumnus.facebook ?? "Private"}
          />
          <div className="sm:col-span-2">
            <Detail
              icon={<Mail className="size-4 text-brand" />}
              label="Email address"
              value={alumnus.emails.length > 0 ? alumnus.emails.join(" · ") : "Private"}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-border px-5 py-3 text-[11px] text-muted-foreground sm:px-7">
          <Lock className="size-3 shrink-0 text-brand" />
          {signedIn
            ? "Contact details shown here are limited by this alumnus's privacy settings."
            : "Sign in as an alumni user to view additional privacy-permitted details."}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Detail({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-background/60 p-3">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-medium text-foreground">
        {value || "Not provided"}
      </p>
    </div>
  );
}
