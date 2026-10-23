import { z } from "zod";
import type { FacilityView } from "@/features/facility/types";
import type {
  PrintProfileView,
  UpdatePrintProfileInput,
} from "../types";

// Print identity editor schema (blueprint 8.6 print-profile editor).
//
// Mirrors the server's @NotBlank fields (displayName, addressLine1,
// addressCity, addressCountry). Optional fields become null on the wire
// rather than empty strings, so the backend can store an absent value.

const optionalText = (max: number) =>
  z.string().trim().max(max, `Use ${max} characters or fewer`);

const optionalEmail = z
  .string()
  .trim()
  .pipe(z.union([z.literal(""), z.email("Enter a valid email address")]));

export const printProfileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Enter the name printed on documents")
    .max(160, "Use 160 characters or fewer"),
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
  phone: optionalText(32),
  email: optionalEmail,
  receiptFooter: optionalText(240),
  // Opaque document-store key. There is no upload UI yet (the document
  // module owns files), so the editor preserves the current value. It is
  // not user-editable, so it carries no length rule that could block save.
  logoObjectKey: z.string(),
});

export type PrintProfileFormValues = z.infer<typeof printProfileSchema>;

export const PRINT_PROFILE_FORM_FIELDS = [
  "displayName",
  "addressLine1",
  "addressLine2",
  "addressCity",
  "addressCountry",
  "phone",
  "email",
  "receiptFooter",
  "logoObjectKey",
] as const satisfies readonly (keyof PrintProfileFormValues)[];

export function isPrintProfileFormField(
  field: string,
): field is keyof PrintProfileFormValues {
  return (PRINT_PROFILE_FORM_FIELDS as readonly string[]).includes(field);
}

const nullIfBlank = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

/**
 * Prefill from the configured profile, falling back to the facility
 * registry for a first-time setup. The facility is the source of the
 * name/address/contacts the hospital already entered.
 */
export function printProfileToFormValues(
  profile: PrintProfileView,
  facility: Partial<FacilityView>,
): PrintProfileFormValues {
  return {
    displayName: profile.displayName ?? facility.name ?? "",
    addressLine1: profile.addressLine1 ?? facility.addressLine1 ?? "",
    addressLine2: profile.addressLine2 ?? facility.addressLine2 ?? "",
    addressCity: profile.addressCity ?? facility.addressCity ?? "",
    addressCountry: profile.addressCountry ?? facility.addressCountry ?? "Ghana",
    phone: profile.phone ?? facility.contactPhone ?? "",
    email: profile.email ?? facility.contactEmail ?? "",
    receiptFooter: profile.receiptFooter ?? "",
    logoObjectKey: profile.logoObjectKey ?? "",
  };
}

/** Map validated form values onto the PUT /configuration/print-profile body. */
export function toUpdatePrintProfileInput(
  values: PrintProfileFormValues,
): UpdatePrintProfileInput {
  return {
    displayName: values.displayName,
    addressLine1: values.addressLine1,
    addressLine2: nullIfBlank(values.addressLine2),
    addressCity: values.addressCity,
    addressCountry: values.addressCountry,
    phone: nullIfBlank(values.phone),
    email: nullIfBlank(values.email),
    receiptFooter: nullIfBlank(values.receiptFooter),
    logoObjectKey: nullIfBlank(values.logoObjectKey),
  };
}
