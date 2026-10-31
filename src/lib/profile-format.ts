function toDateParts(value: Date | string | null | undefined): [number, number, number] | null {
  if (!value) return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return [value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate()];
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

export function formatDate(value: Date | string | null | undefined): string {
  const parts = toDateParts(value);
  if (!parts) return "";
  const [year, month, day] = parts;
  return `${String(day).padStart(2, "0")}-${String(month).padStart(2, "0")}-${year}`;
}

export function calculateAge(birthDate: Date | string | null | undefined): string {
  const parts = toDateParts(birthDate);
  if (!parts) return "";
  const [year, month, day] = parts;
  const now = new Date();
  let age = now.getUTCFullYear() - year;
  const hasHadBirthday =
    now.getUTCMonth() + 1 > month || (now.getUTCMonth() + 1 === month && now.getUTCDate() >= day);
  if (!hasHadBirthday) age -= 1;
  return age >= 0 ? String(age) : "";
}

export function fullName(firstName: string, middleName: string, lastName: string): string {
  return [firstName, middleName, lastName]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ");
}

export function formatAddress(parts: Array<string | null | undefined>): string {
  return parts
    .map((part) => (part ?? "").trim())
    .filter(Boolean)
    .join(", ");
}

export function initials(name: string): string {
  const parts = name.split(" ").filter((part) => part.length > 1 && !part.includes("."));
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}

export function relativeTime(value: Date | string | null | undefined): string {
  const date = value instanceof Date ? value : value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "";

  const seconds = Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return "Just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;

  return formatDate(date);
}
