// Configuration contracts mirrored from the backend (Phase 0.10).
//
// Sequences and the print profile are facility-scoped. The backend reads
// the facility from the access token, so none of these requests carry a
// facility id.

export const SEQUENCE_TYPES = [
  "MRN",
  "VISIT",
  "INVOICE",
  "RECEIPT",
  "ACCESSION",
  "STAFF_NUMBER",
] as const;

export type SequenceType = (typeof SEQUENCE_TYPES)[number];

/** The four formats the go-live readiness check requires. */
export const REQUIRED_SEQUENCE_TYPES = [
  "MRN",
  "VISIT",
  "INVOICE",
  "RECEIPT",
] as const satisfies readonly SequenceType[];

export const SEQUENCE_TYPE_LABELS: Record<SequenceType, string> = {
  MRN: "Medical record number",
  VISIT: "Visit number",
  INVOICE: "Invoice number",
  RECEIPT: "Receipt number",
  ACCESSION: "Accession number",
  STAFF_NUMBER: "Staff number",
};

export const SEQUENCE_RESET_POLICIES = [
  "NEVER",
  "DAILY",
  "MONTHLY",
  "YEARLY",
] as const;

export type SequenceResetPolicy = (typeof SEQUENCE_RESET_POLICIES)[number];

export const SEQUENCE_RESET_POLICY_LABELS: Record<SequenceResetPolicy, string> = {
  NEVER: "Never reset",
  DAILY: "Reset daily",
  MONTHLY: "Reset monthly",
  YEARLY: "Reset yearly",
};

export const SEQUENCE_RESET_POLICY_OPTIONS = SEQUENCE_RESET_POLICIES.map((value) => ({
  value,
  label: SEQUENCE_RESET_POLICY_LABELS[value],
}));

/**
 * GET /api/v1/configuration/sequences.
 *
 * Every sequence type is returned, configured or not. `nextValue` is the
 * next number that would be minted; the editor shows it read-only.
 */
export interface SequenceView {
  type: SequenceType;
  configured: boolean;
  prefix: string | null;
  startValue: number;
  nextValue: number;
  padding: number;
  resetPolicy: SequenceResetPolicy | null;
  currentPeriod: string | null;
}

/** PUT /api/v1/configuration/sequences. */
export interface ConfigureSequenceInput {
  type: SequenceType;
  prefix: string | null;
  startValue: number;
  padding: number;
  resetPolicy: SequenceResetPolicy;
}

/** GET /api/v1/configuration/print-profile. */
export interface PrintProfileView {
  configured: boolean;
  displayName: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  addressCity: string | null;
  addressCountry: string | null;
  phone: string | null;
  email: string | null;
  receiptFooter: string | null;
  logoObjectKey: string | null;
}

/** PUT /api/v1/configuration/print-profile. */
export interface UpdatePrintProfileInput {
  displayName: string;
  addressLine1: string;
  addressLine2: string | null;
  addressCity: string;
  addressCountry: string;
  phone: string | null;
  email: string | null;
  receiptFooter: string | null;
  logoObjectKey: string | null;
}
