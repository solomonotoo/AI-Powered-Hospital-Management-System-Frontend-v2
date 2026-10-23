import { z } from "zod";
import {
  FACILITY_OWNERSHIPS,
  FACILITY_TYPES,
  type FacilityView,
  type RegisterFacilityInput,
  type UpdateFacilityInput,
} from "../types";

// Registration wizard schema (blueprint 8.6 facilitySchema).
//
// These rules mirror the server's visible constraints for instant
// feedback; the backend remains authoritative. DRF fields are flat
// (`addressLine1`, ...) because that is the REST contract, even though
// the domain stores a single Address value object.

const optionalText = (max: number) =>
  z.string().trim().max(max, `Use ${max} characters or fewer`);

const optionalEmail = z
  .string()
  .trim()
  .pipe(z.union([z.literal(""), z.email("Enter a valid email address")]));

export const facilitySchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "Use at least 2 characters")
    .max(32, "Use 32 characters or fewer")
    .regex(/^\S+$/, "Facility codes cannot contain spaces"),
  name: z
    .string()
    .trim()
    .min(2, "Enter the facility name")
    .max(160, "Use 160 characters or fewer"),
  type: z.enum(FACILITY_TYPES, { message: "Choose a facility type" }),
  ownership: z.enum(FACILITY_OWNERSHIPS, { message: "Choose an ownership type" }),
  timezone: z
    .string()
    .trim()
    .min(1, "Timezone is required")
    .max(64, "Use 64 characters or fewer"),
  region: optionalText(100),
  district: optionalText(100),
  addressLine1: z
    .string()
    .trim()
    .min(1, "Enter the street address")
    .max(160, "Use 160 characters or fewer"),
  addressLine2: optionalText(160),
  addressCity: z
    .string()
    .trim()
    .min(1, "Enter the city or town")
    .max(100, "Use 100 characters or fewer"),
  addressCountry: z
    .string()
    .trim()
    .min(1, "Enter the country")
    .max(80, "Use 80 characters or fewer"),
  contactPhone: optionalText(32),
  contactEmail: optionalEmail,
  licenceNumber: optionalText(80),
  licenceBody: optionalText(120),
  nhiaAccreditationCode: optionalText(80),
});

export type FacilityFormValues = z.infer<typeof facilitySchema>;

/**
 * Profile edit: the same rules as registration, minus the immutable
 * facility code (owned by the platform registry, never edited here).
 */
export const facilityProfileSchema = facilitySchema.omit({ code: true });

export type FacilityProfileFormValues = z.infer<typeof facilityProfileSchema>;

export const FACILITY_PROFILE_FORM_FIELDS = [
  "name",
  "type",
  "ownership",
  "timezone",
  "region",
  "district",
  "addressLine1",
  "addressLine2",
  "addressCity",
  "addressCountry",
  "contactPhone",
  "contactEmail",
  "licenceNumber",
  "licenceBody",
  "nhiaAccreditationCode",
] as const satisfies readonly (keyof FacilityProfileFormValues)[];

export function isFacilityProfileFormField(
  field: string,
): field is keyof FacilityProfileFormValues {
  return (FACILITY_PROFILE_FORM_FIELDS as readonly string[]).includes(field);
}

export const FACILITY_FORM_FIELDS = [
  "code",
  "name",
  "type",
  "ownership",
  "timezone",
  "region",
  "district",
  "addressLine1",
  "addressLine2",
  "addressCity",
  "addressCountry",
  "contactPhone",
  "contactEmail",
  "licenceNumber",
  "licenceBody",
  "nhiaAccreditationCode",
] as const satisfies readonly (keyof FacilityFormValues)[];

export function isFacilityFormField(field: string): field is keyof FacilityFormValues {
  return (FACILITY_FORM_FIELDS as readonly string[]).includes(field);
}

const nullIfBlank = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

/** Map validated form values onto the flat REST request body. */
export function toRegisterFacilityInput(values: FacilityFormValues): RegisterFacilityInput {
  return {
    code: values.code,
    name: values.name,
    type: values.type,
    region: nullIfBlank(values.region),
    district: nullIfBlank(values.district),
    addressLine1: values.addressLine1,
    addressLine2: nullIfBlank(values.addressLine2),
    addressCity: values.addressCity,
    addressCountry: values.addressCountry,
    contactPhone: nullIfBlank(values.contactPhone),
    contactEmail: nullIfBlank(values.contactEmail),
    licenceNumber: nullIfBlank(values.licenceNumber),
    licenceBody: nullIfBlank(values.licenceBody),
    nhiaAccreditationCode: nullIfBlank(values.nhiaAccreditationCode),
    ownership: values.ownership,
    timezone: values.timezone,
  };
}

/** Map profile-edit values onto the PUT /facilities/current body. */
export function toUpdateFacilityInput(
  values: FacilityProfileFormValues,
): UpdateFacilityInput {
  return {
    name: values.name,
    type: values.type,
    region: nullIfBlank(values.region),
    district: nullIfBlank(values.district),
    addressLine1: values.addressLine1,
    addressLine2: nullIfBlank(values.addressLine2),
    addressCity: values.addressCity,
    addressCountry: values.addressCountry,
    contactPhone: nullIfBlank(values.contactPhone),
    contactEmail: nullIfBlank(values.contactEmail),
    licenceNumber: nullIfBlank(values.licenceNumber),
    licenceBody: nullIfBlank(values.licenceBody),
    nhiaAccreditationCode: nullIfBlank(values.nhiaAccreditationCode),
    ownership: values.ownership,
    timezone: values.timezone,
  };
}

/** Prefill the editor from the server view (nulls become empty inputs). */
export function facilityToProfileFormValues(
  facility: FacilityView,
): FacilityProfileFormValues {
  return {
    name: facility.name,
    type: facility.type,
    ownership: facility.ownership,
    timezone: facility.timezone ?? "Africa/Accra",
    region: facility.region ?? "",
    district: facility.district ?? "",
    addressLine1: facility.addressLine1 ?? "",
    addressLine2: facility.addressLine2 ?? "",
    addressCity: facility.addressCity ?? "",
    addressCountry: facility.addressCountry ?? "Ghana",
    contactPhone: facility.contactPhone ?? "",
    contactEmail: facility.contactEmail ?? "",
    licenceNumber: facility.licenceNumber ?? "",
    licenceBody: facility.licenceBody ?? "",
    nhiaAccreditationCode: facility.nhiaAccreditationCode ?? "",
  };
}
