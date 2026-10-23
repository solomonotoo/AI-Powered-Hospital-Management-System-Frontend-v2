// Facility contracts mirrored from the backend (Phase 0 facility module).
//
// The platform tier only ever sees registry metadata here: no patient,
// clinical or billing detail is present in these shapes, by design.

export const FACILITY_TYPES = [
  "CHPS",
  "HEALTH_CENTRE",
  "DISTRICT_HOSPITAL",
  "REGIONAL_HOSPITAL",
  "TEACHING_HOSPITAL",
  "PRIVATE_CLINIC",
  "PRIVATE_HOSPITAL",
  "FAITH_BASED",
] as const;

export type FacilityType = (typeof FACILITY_TYPES)[number];

export const FACILITY_OWNERSHIPS = ["GOVERNMENT", "PRIVATE", "FAITH_BASED"] as const;

export type FacilityOwnership = (typeof FACILITY_OWNERSHIPS)[number];

export const FACILITY_STATUSES = [
  "PROVISIONING",
  "CONFIGURED",
  "LIVE",
  "SUSPENDED",
  "DECOMMISSIONED",
] as const;

export type FacilityStatus = (typeof FACILITY_STATUSES)[number];

export const FACILITY_TYPE_LABELS: Record<FacilityType, string> = {
  CHPS: "CHPS",
  HEALTH_CENTRE: "Health centre",
  DISTRICT_HOSPITAL: "District hospital",
  REGIONAL_HOSPITAL: "Regional hospital",
  TEACHING_HOSPITAL: "Teaching hospital",
  PRIVATE_CLINIC: "Private clinic",
  PRIVATE_HOSPITAL: "Private hospital",
  FAITH_BASED: "Faith-based",
};

export const FACILITY_OWNERSHIP_LABELS: Record<FacilityOwnership, string> = {
  GOVERNMENT: "Government",
  PRIVATE: "Private",
  FAITH_BASED: "Faith-based",
};

export const FACILITY_STATUS_LABELS: Record<FacilityStatus, string> = {
  PROVISIONING: "Provisioning",
  CONFIGURED: "Configured",
  LIVE: "Live",
  SUSPENDED: "Suspended",
  DECOMMISSIONED: "Decommissioned",
};

export const FACILITY_TYPE_OPTIONS = FACILITY_TYPES.map((value) => ({
  value,
  label: FACILITY_TYPE_LABELS[value],
}));

export const FACILITY_OWNERSHIP_OPTIONS = FACILITY_OWNERSHIPS.map((value) => ({
  value,
  label: FACILITY_OWNERSHIP_LABELS[value],
}));

/** GET /api/v1/facilities and GET /api/v1/facilities/{id}. */
export interface FacilityView {
  id: string;
  code: string;
  name: string;
  type: FacilityType;
  region: string | null;
  district: string | null;
  status: FacilityStatus;
  timezone: string | null;
  licenceNumber: string | null;
}

/** POST /api/v1/facilities (platform registration). */
export interface RegisterFacilityInput {
  code: string;
  name: string;
  type: FacilityType;
  region: string | null;
  district: string | null;
  addressLine1: string;
  addressLine2: string | null;
  addressCity: string;
  addressCountry: string;
  contactPhone: string | null;
  contactEmail: string | null;
  licenceNumber: string | null;
  licenceBody: string | null;
  nhiaAccreditationCode: string | null;
  ownership: FacilityOwnership;
  timezone: string;
}

/** One line of the go-live readiness checklist (verbatim from the server). */
export interface ReadinessItem {
  item: string;
  passed: boolean;
  detail: string;
}
