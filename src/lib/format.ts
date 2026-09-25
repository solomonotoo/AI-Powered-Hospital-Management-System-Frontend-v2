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

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), "dd MMM yyyy, HH:mm");
}

/** Accepts 024…, 233…, +233… → canonical +233… (mirrors backend PhoneNumber.ghana). */
export function normalizeGhanaPhone(input: string): string {
  const digits = input.trim().replace(/[\s\-()]/g, "");
  if (/^0\d{9}$/.test(digits)) return `+233${digits.slice(1)}`;
  if (/^233\d{9}$/.test(digits)) return `+${digits}`;
  return digits;
}
