import { z } from "zod";
import {
  EMPLOYMENT_STATUSES,
  STAFF_CATEGORIES,
  STAFF_LICENCE_REQUIRED_CATEGORIES,
  STAFF_SEXES,
  type AddStaffLicenceInput,
  type AssignStaffUnitInput,
  type ChangeEmploymentStatusInput,
  type OnboardStaffInput,
  type UpdateStaffInput,
} from "../types";

// Workforce forms (blueprint 8.7). The first-administrator card uses the
// narrow schema below; the full wizard and detail tabs use the wider
// schemas at the end of this file.
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

// ---------------------------------------------------------------------------
// Full registration wizard + detail tabs
// ---------------------------------------------------------------------------

const requiredName = (label: string) =>
  z.string().trim().min(1, `Enter the ${label}`).max(100, "Use 100 characters or fewer");

const isoDate = (message: string) =>
  z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, message)
    .refine(isRealIsoDate, message);

const optionalIsoDate = (message: string) =>
  z
    .string()
    .trim()
    .pipe(
      z.union([
        z.literal(""),
        z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, message)
          .refine(isRealIsoDate, message),
      ]),
    );

export const licenceSchema = z
  .object({
    body: z
      .string()
      .trim()
      .min(1, "Enter the licensing body")
      .max(120, "Use 120 characters or fewer"),
    number: z
      .string()
      .trim()
      .min(1, "Enter the licence number")
      .max(80, "Use 80 characters or fewer"),
    issuedOn: isoDate("Enter a valid issue date"),
    expiresOn: isoDate("Enter a valid expiry date"),
  })
  .refine(
    (value) => value.expiresOn >= value.issuedOn,
    {
      message: "Expiry cannot be before the issue date",
      path: ["expiresOn"],
    },
  );

export type LicenceFormValues = z.infer<typeof licenceSchema>;

const staffIdentityShape = {
  firstName: requiredName("first name"),
  lastName: requiredName("last name"),
  maidenName: optionalText(100),
  sex: z.enum(STAFF_SEXES, { message: "Choose a sex" }),
  dateOfBirth: isoDate("Enter a valid date of birth").refine(
    (value) => value <= todayIso(),
    "Date of birth cannot be in the future",
  ),
  phone: z
    .string()
    .trim()
    .min(1, "Enter the phone number")
    .regex(GHANA_PHONE, "Enter a Ghana phone number, e.g. 0241234567"),
  email: optionalEmail,
  addressLine1: optionalText(200),
  addressLine2: optionalText(200),
  addressCity: optionalText(100),
  addressCountry: optionalText(100),
  specialty: optionalText(120),
};

export const staffRegistrationSchema = z
  .object({
    ...staffIdentityShape,
    category: z.enum(STAFF_CATEGORIES, { message: "Choose a category" }),
    licences: z.array(licenceSchema).max(10, "Record at most 10 licences"),
    initialUnitId: z.string().trim().optional(),
    initialFrom: optionalIsoDate("Enter a valid posting start date"),
    initialPrimary: z.boolean(),
  })
  .superRefine((values, context) => {
    if (
      STAFF_LICENCE_REQUIRED_CATEGORIES.has(values.category) &&
      values.licences.length === 0
    ) {
      context.addIssue({
        code: "custom",
        path: ["licences"],
        message: "At least one licence is required for this category",
      });
    }
    if (values.initialUnitId && !values.initialFrom) {
      context.addIssue({
        code: "custom",
        path: ["initialFrom"],
        message: "Enter the posting start date",
      });
    }
    if (!values.initialUnitId && values.initialFrom) {
      context.addIssue({
        code: "custom",
        path: ["initialUnitId"],
        message: "Choose the unit for this posting",
      });
    }
  });

export type StaffRegistrationFormValues = z.infer<
  typeof staffRegistrationSchema
>;

export const STAFF_REGISTRATION_STEPS = [
  "Personal details",
  "Professional details",
  "Posting and review",
] as const;

export const STAFF_REGISTRATION_STEP_FIELDS: readonly (readonly string[])[] = [
  [
    "firstName",
    "lastName",
    "maidenName",
    "sex",
    "dateOfBirth",
    "phone",
    "email",
  ],
  ["category", "specialty", "licences"],
  ["initialUnitId", "initialFrom", "initialPrimary"],
];

export const staffProfileSchema = z.object(staffIdentityShape);

export type StaffProfileFormValues = z.infer<typeof staffProfileSchema>;

export function emptyLicence(): LicenceFormValues {
  return { body: "", number: "", issuedOn: "", expiresOn: "" };
}

export function isBlankLicence(value: LicenceFormValues): boolean {
  return (
    !value.body.trim() &&
    !value.number.trim() &&
    !value.issuedOn &&
    !value.expiresOn
  );
}

export function emptyStaffRegistration(): StaffRegistrationFormValues {
  return {
    firstName: "",
    lastName: "",
    maidenName: "",
    sex: "FEMALE",
    dateOfBirth: "",
    phone: "",
    email: "",
    addressLine1: "",
    addressLine2: "",
    addressCity: "",
    addressCountry: "Ghana",
    specialty: "",
    category: "DOCTOR",
    licences: [emptyLicence()],
    initialUnitId: "",
    initialFrom: "",
    initialPrimary: false,
  };
}

export function toFullOnboardStaffInput(
  values: StaffRegistrationFormValues,
): OnboardStaffInput {
  return {
    firstName: values.firstName,
    lastName: values.lastName,
    maidenName: nullIfBlank(values.maidenName),
    sex: values.sex,
    dateOfBirth: values.dateOfBirth,
    phone: values.phone,
    email: nullIfBlank(values.email),
    addressLine1: nullIfBlank(values.addressLine1),
    addressLine2: nullIfBlank(values.addressLine2),
    addressCity: nullIfBlank(values.addressCity),
    addressCountry: nullIfBlank(values.addressCountry),
    category: values.category,
    specialty: nullIfBlank(values.specialty),
    licences: values.licences.filter((licence) => !isBlankLicence(licence)),
  };
}

export function toUpdateStaffInput(
  values: StaffProfileFormValues,
): UpdateStaffInput {
  return {
    firstName: values.firstName,
    lastName: values.lastName,
    maidenName: nullIfBlank(values.maidenName),
    sex: values.sex,
    dateOfBirth: values.dateOfBirth,
    phone: values.phone,
    email: nullIfBlank(values.email),
    addressLine1: nullIfBlank(values.addressLine1),
    addressLine2: nullIfBlank(values.addressLine2),
    addressCity: nullIfBlank(values.addressCity),
    addressCountry: nullIfBlank(values.addressCountry),
    specialty: nullIfBlank(values.specialty),
  };
}

export const addLicenceSchema = licenceSchema;

export type AddLicenceFormValues = z.infer<typeof addLicenceSchema>;

export function toAddLicenceInput(
  values: AddLicenceFormValues,
): AddStaffLicenceInput {
  return {
    body: values.body,
    number: values.number,
    issuedOn: values.issuedOn,
    expiresOn: values.expiresOn,
  };
}

export const assignUnitSchema = z.object({
  unitId: z.string().trim().min(1, "Choose a unit"),
  from: isoDate("Enter a valid start date"),
  primary: z.boolean(),
});

export type AssignUnitFormValues = z.infer<typeof assignUnitSchema>;

export function toAssignUnitInput(
  values: AssignUnitFormValues,
): AssignStaffUnitInput {
  return {
    unitId: values.unitId,
    from: values.from,
    primary: values.primary,
  };
}

export const changeEmploymentStatusSchema = z.object({
  status: z.enum(EMPLOYMENT_STATUSES, { message: "Choose a status" }),
  reason: z
    .string()
    .trim()
    .min(3, "Record the reason for this change")
    .max(500, "Use 500 characters or fewer"),
});

export type ChangeEmploymentStatusFormValues = z.infer<
  typeof changeEmploymentStatusSchema
>;

export function toChangeEmploymentStatusInput(
  values: ChangeEmploymentStatusFormValues,
): ChangeEmploymentStatusInput {
  return { status: values.status, reason: values.reason };
}
