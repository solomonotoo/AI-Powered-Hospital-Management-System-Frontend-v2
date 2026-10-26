import { format } from "date-fns";

// Ghana-oriented formatting (blueprint display standards). All server
// times arrive UTC; Africa/Accra == UTC (no DST), so plain formatting
// is correct — revisit only if the deployment timezone ever differs.

export function formatGhs(amount: number | string): string {
  const value = typeof amount === "string" ? Number(amount) : amount;
  return `GH₵ ${value.toFixed(2)}`;
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), "dd MMM yyyy");
}

/**
 * Date-only values (LocalDate: YYYY-MM-DD) are not instants. Parsing them
 * as UTC midnight and formatting in the workstation's local timezone would
 * display the previous day in negative-offset zones, so this helper formats
 * in UTC and anchors the date at UTC midnight. Server dates are already
 * Ghana-local dates; converting them to a workstation timezone would be
 * incorrect even when the offset is positive.
 */
const ISO_DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function formatIsoDate(value: string): string {
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return value;
  return ISO_DATE_FORMATTER.format(parsed);
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), "dd MMM yyyy, HH:mm");
}

/** Humanize an UPPER_SNAKE code for labels; never used for authorization. */
export function humanizeCode(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/** Accepts 024…, 233…, +233… → canonical +233… (mirrors backend PhoneNumber.ghana). */
export function normalizeGhanaPhone(input: string): string {
  const digits = input.trim().replace(/[\s\-()]/g, "");
  if (/^0\d{9}$/.test(digits)) return `+233${digits.slice(1)}`;
  if (/^233\d{9}$/.test(digits)) return `+${digits}`;
  return digits;
}
