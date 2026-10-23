import { z } from "zod";
import { UNIT_TYPES, type UnitInput, type UnitView } from "../types";

// Unit create/rename schema (blueprint 8.6 unitSchema). The backend
// uppercases codes and enforces non-blank values; these rules only give
// the operator faster feedback. Parent changes are not supported by the
// rename endpoint, so the parent is carried through unchanged on edit.

export const unitSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Enter a unit code")
    .max(32, "Use 32 characters or fewer")
    .regex(/^\S+$/, "Unit codes cannot contain spaces"),
  name: z
    .string()
    .trim()
    .min(1, "Enter a unit name")
    .max(160, "Use 160 characters or fewer"),
  type: z.enum(UNIT_TYPES, { message: "Choose a unit type" }),
  parentUnitId: z.string().nullable(),
});

export type UnitFormValues = z.infer<typeof unitSchema>;

export const UNIT_FORM_FIELDS = [
  "code",
  "name",
  "type",
  "parentUnitId",
] as const satisfies readonly (keyof UnitFormValues)[];

export function isUnitFormField(field: string): field is keyof UnitFormValues {
  return (UNIT_FORM_FIELDS as readonly string[]).includes(field);
}

export const EMPTY_UNIT_FORM: UnitFormValues = {
  code: "",
  name: "",
  type: "DEPARTMENT",
  parentUnitId: null,
};

export function unitToFormValues(unit: UnitView): UnitFormValues {
  return {
    code: unit.code,
    name: unit.name,
    type: unit.type,
    parentUnitId: unit.parentUnitId ?? null,
  };
}

export function toUnitInput(values: UnitFormValues): UnitInput {
  return {
    code: values.code,
    name: values.name,
    type: values.type,
    parentUnitId: values.parentUnitId,
  };
}
