// Staff contracts mirrored from the backend (Phase 0.7 / 8.7).
//
// The first-admin completion flow only needs onboarding and the detail
// read. The full directory and multi-step registration wizard reuse
// these shapes later; fields the wizard does not collect yet stay null.

export const STAFF_SEXES = ["FEMALE", "MALE", "OTHER"] as const;

export type StaffSex = (typeof STAFF_SEXES)[number];

export const STAFF_SEX_LABELS: Record<StaffSex, string> = {
  FEMALE: "Female",
  MALE: "Male",
  OTHER: "Other",
};

export const STAFF_SEX_OPTIONS = STAFF_SEXES.map((value) => ({
  value,
  label: STAFF_SEX_LABELS[value],
}));

// Occupations are not RBAC roles (blueprint 8.7). The guided bootstrap
// card always registers ADMINISTRATOR; the full wizard will offer the
// rest, including licence collection for clinical categories.
export const STAFF_CATEGORIES = [
  "DOCTOR",
  "NURSE",
  "MIDWIFE",
  "PHYSICIAN_ASSISTANT",
  "PHARMACIST",
  "PHARMACY_TECHNICIAN",
  "LAB_SCIENTIST",
  "LAB_TECHNICIAN",
  "RADIOGRAPHER",
  "RECORDS_OFFICER",
  "ACCOUNTANT",
  "ADMINISTRATOR",
  "SUPPORT",
  "OTHER",
] as const;

export type StaffCategory = (typeof STAFF_CATEGORIES)[number];

export const STAFF_CATEGORY_LABELS: Record<StaffCategory, string> = {
  DOCTOR: "Doctor",
  NURSE: "Nurse",
  MIDWIFE: "Midwife",
  PHYSICIAN_ASSISTANT: "Physician assistant",
  PHARMACIST: "Pharmacist",
  PHARMACY_TECHNICIAN: "Pharmacy technician",
  LAB_SCIENTIST: "Laboratory scientist",
  LAB_TECHNICIAN: "Laboratory technician",
  RADIOGRAPHER: "Radiographer",
  RECORDS_OFFICER: "Records officer",
  ACCOUNTANT: "Accountant",
  ADMINISTRATOR: "Administrator",
  SUPPORT: "Support staff",
  OTHER: "Other",
};

export interface StaffLicenceInput {
  body: string;
  number: string;
  issuedOn: string;
  expiresOn: string;
}

/** POST /api/v1/staff (mirrors OnboardStaffRequest). */
export interface OnboardStaffInput {
  firstName: string;
  lastName: string;
  maidenName: string | null;
  sex: string;
  dateOfBirth: string;
  phone: string;
  email: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  addressCity: string | null;
  addressCountry: string | null;
  category: StaffCategory;
  specialty: string | null;
  licences: StaffLicenceInput[];
}

/** GET /api/v1/staff/{id} (mirrors StaffDetailView). */
export interface StaffDetailView {
  id: string;
  staffNumber: string;
  firstName: string;
  lastName: string;
  maidenName: string | null;
  preferredName: string | null;
  displayName: string;
  sex: string;
  dateOfBirth: string;
  phone: string;
  email: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressPostalCode: string | null;
  addressCountry: string | null;
  category: StaffCategory;
  specialty: string | null;
  employmentStatus: string;
  userId: string | null;
  primaryUnitId: string | null;
  licenceExpiring: boolean;
  licences: StaffLicenceView[];
  assignments: StaffAssignmentView[];
  qualifications: StaffQualificationView[];
}

export interface StaffLicenceView {
  body: string;
  number: string;
  issuedOn: string;
  expiresOn: string;
  expired: boolean;
  expiringSoon: boolean;
}

export interface StaffAssignmentView {
  unitId: string;
  from: string;
  to: string | null;
  primary: boolean;
  open: boolean;
}

export interface StaffQualificationView {
  name: string;
  institution: string;
  yearAwarded: number | null;
}
