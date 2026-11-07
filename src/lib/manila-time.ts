/**
 * Philippine Time (Asia/Manila, UTC+8) timestamp helpers for audit logs.
 * Activity / access log timestamps must render in local 12-hour AM/PM so
 * OARCC staff read the same time regardless of the server timezone.
 */

const TIMEZONE = "Asia/Manila";

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TIMEZONE,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: true,
});

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

/** `YYYY-MM-DD` in Philippine Time. */
export function manilaDate(value: Date | string): string {
  const date = toDate(value);
  return Number.isNaN(date.getTime()) ? "—" : dateFormatter.format(date);
}

/** `hh:mm:ss AM/PM` (12-hour) in Philippine Time. */
export function manilaClock(value: Date | string): string {
  const date = toDate(value);
  return Number.isNaN(date.getTime()) ? "—" : timeFormatter.format(date);
}

/** Full `YYYY-MM-DD hh:mm:ss AM/PM` stamp in Philippine Time. */
export function manilaStamp(value: Date | string): string {
  return `${manilaDate(value)} ${manilaClock(value)}`;
}
