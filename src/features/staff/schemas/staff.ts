import { z } from "zod";
import { STAFF_SEXES, type OnboardStaffInput } from "../types";

// First-administrator workforce profile (blueprint 8.7). The card on
// /admin/setup only needs the identity facts onboarding requires; the
// full multi-step wizard adds licences, postings and qualifications.
//
// The rules mirror the server's visible constraints for instant
// feedback; the backend remains authoritative.

const optionalText = (max: number) =>
  z.string().trim().max(max, `Use ${max} characters or fewer`);

const optionalEmail = z
  .string()
  .trim()
  .pipe(z.union([z.literal(""), z.email("Enter a valid email address")]));

// Ghanaian front-desk input: 0241234567, 233241234567 or +233241234567.
// PhoneNumber.ghana() normalizes these on the server.
const GHANA_PHONE =
  /^(?:\+?233|0)[\s\-()]*\d(?:[\s\-()]*\d){8}$/;

function isRealIsoDate(value: string): boolean {
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export const firstAdminStaffSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "Enter the first name")
    .max(100, "Use 100 characters or fewer"),
  lastName: z
    .string()
    .trim()
    .min(1, "Enter the last name")
    .max(100, "Use 100 characters or fewer"),
  sex: z.enum(STAFF_SEXES, { message: "Choose a sex" }),
  dateOfBirth: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date of birth")
    .refine(isRealIsoDate, "Enter a valid date of birth")
    .refine(
      (value) => value <= todayIso(),
      "Date of birth cannot be in the future",
    ),
  phone: z
    .string()
    .trim()
    .min(1, "Enter the phone number")
    .regex(GHANA_PHONE, "Enter a Ghana phone number, e.g. 0241234567"),
  email: optionalEmail,
  specialty: optionalText(120),
});

export type FirstAdminStaffFormValues = z.infer<typeof firstAdminStaffSchema>;

export const FIRST_ADMIN_STAFF_FORM_FIELDS = [
  "firstName",
  "lastName",
  "sex",
  "dateOfBirth",
  "phone",
  "email",
  "specialty",
] as const satisfies readonly (keyof FirstAdminStaffFormValues)[];

export function isFirstAdminStaffFormField(
  field: string,
): field is keyof FirstAdminStaffFormValues {
  return (FIRST_ADMIN_STAFF_FORM_FIELDS as readonly string[]).includes(field);
}

const nullIfBlank = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

/**
 * Map validated form values onto the onboarding request. The account
 * link is a separate call because the staff id only exists after this
 * one succeeds.
 */
export function toOnboardStaffInput(
  values: FirstAdminStaffFormValues,
): OnboardStaffInput {
  return {
    firstName: values.firstName,
    lastName: values.lastName,
    maidenName: null,
    sex: values.sex,
    dateOfBirth: values.dateOfBirth,
    phone: values.phone,
    email: nullIfBlank(values.email),
    addressLine1: null,
    addressLine2: null,
    addressCity: null,
    addressCountry: null,
    category: "ADMINISTRATOR",
    specialty: nullIfBlank(values.specialty),
    licences: [],
  };
}
