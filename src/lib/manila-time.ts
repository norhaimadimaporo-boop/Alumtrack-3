/**
 * Philippine Time (Asia/Manila, UTC+8 / PST) timestamp helpers for audit
 * logs. Activity / access log timestamps render in local 24-hour time so
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
  hourCycle: "h23",
});

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

/** `YYYY-MM-DD` in Philippine Time. */
export function manilaDate(value: Date | string): string {
  const date = toDate(value);
  return Number.isNaN(date.getTime()) ? "—" : dateFormatter.format(date);
}

/** `HH:mm:ss` (24-hour) in Philippine Time (e.g. 00:57:19). */
export function manilaClock(value: Date | string): string {
  const date = toDate(value);
  return Number.isNaN(date.getTime()) ? "—" : timeFormatter.format(date);
}

/** Full `YYYY-MM-DD HH:mm:ss` stamp in Philippine Time. */
export function manilaStamp(value: Date | string): string {
  return `${manilaDate(value)} ${manilaClock(value)}`;
}
