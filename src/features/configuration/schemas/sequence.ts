import { z } from "zod";
import {
  SEQUENCE_RESET_POLICIES,
  SEQUENCE_TYPES,
  type ConfigureSequenceInput,
  type SequenceType,
  type SequenceView,
} from "../types";

// Sequence editor schema (blueprint 8.6 sequence editor).
//
// The backend remains authoritative. Two server rules are mirrored here
// because they are easy to get wrong in a form:
//   * startValue must be >= 1 (the request DTO allows 0, the domain does not);
//   * padding is 1..10.
//
// `type` is part of the payload but not editable: the row is keyed by it.

const prefixText = z.string().trim().max(16, "Use 16 characters or fewer");

export const sequenceSchema = z.object({
  type: z.enum(SEQUENCE_TYPES, { message: "Choose a sequence type" }),
  prefix: prefixText,
  startValue: z
    .number()
    .int("Use a whole number")
    .min(1, "Start value must be at least 1"),
  padding: z
    .number()
    .int("Use a whole number")
    .min(1, "Padding must be between 1 and 10")
    .max(10, "Padding must be between 1 and 10"),
  resetPolicy: z.enum(SEQUENCE_RESET_POLICIES, {
    message: "Choose a reset policy",
  }),
});

export type SequenceFormValues = z.infer<typeof sequenceSchema>;

export const SEQUENCE_FORM_FIELDS = [
  "type",
  "prefix",
  "startValue",
  "padding",
  "resetPolicy",
] as const satisfies readonly (keyof SequenceFormValues)[];

export function isSequenceFormField(
  field: string,
): field is keyof SequenceFormValues {
  return (SEQUENCE_FORM_FIELDS as readonly string[]).includes(field);
}

const nullIfBlank = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

/**
 * Prefill the editor from the server view. Unconfigured rows get the
 * schema defaults so the admin can save without inventing values first.
 */
export function sequenceToFormValues(sequence: SequenceView): SequenceFormValues {
  return {
    type: sequence.type,
    prefix: sequence.prefix ?? "",
    startValue: sequence.configured ? sequence.startValue : 1,
    padding: sequence.configured ? sequence.padding : 6,
    resetPolicy: sequence.resetPolicy ?? "NEVER",
  };
}

/** Map validated form values onto the PUT /configuration/sequences body. */
export function toConfigureSequenceInput(
  values: SequenceFormValues,
): ConfigureSequenceInput {
  return {
    type: values.type,
    prefix: nullIfBlank(values.prefix),
    startValue: values.startValue,
    padding: values.padding,
    resetPolicy: values.resetPolicy,
  };
}

/** The next human-readable number, for the read-only preview. */
export function nextNumberPreview(sequence: SequenceView): string {
  const prefix = sequence.prefix ?? "";
  const padding = Math.max(1, sequence.padding || 6);
  return `${prefix}${String(sequence.nextValue).padStart(padding, "0")}`;
}

export function isRequiredSequenceType(type: SequenceType): boolean {
  return type === "MRN" || type === "VISIT" || type === "INVOICE" || type === "RECEIPT";
}
