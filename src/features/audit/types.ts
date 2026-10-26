// Audit read models (blueprint 6.5). The API intentionally exposes
// changeSet as an opaque, pre-masked JSON string; the UI must not treat
// it as a source of patient identifiers or attempt to unmask it.

export const AUDIT_STREAMS = [
  "SECURITY",
  "ADMIN",
  "PHI_ACCESS",
  "DATA_CHANGE",
] as const;
export type AuditStream = (typeof AUDIT_STREAMS)[number];

export const AUDIT_STREAM_LABELS: Record<AuditStream, string> = {
  SECURITY: "Security",
  ADMIN: "Administration",
  PHI_ACCESS: "PHI access",
  DATA_CHANGE: "Data change",
};

export const AUDIT_OUTCOMES = ["SUCCESS", "DENIED", "FAILURE"] as const;
export type AuditOutcome = (typeof AUDIT_OUTCOMES)[number];

export const AUDIT_OUTCOME_LABELS: Record<AuditOutcome, string> = {
  SUCCESS: "Success",
  DENIED: "Denied",
  FAILURE: "Failure",
};

export interface AuditEventView {
  id: string;
  occurredAt: string;
  stream: AuditStream;
  action: string;
  outcome: AuditOutcome;
  actorUserId: string | null;
  actorType: string | null;
  facilityId: string | null;
  subjectType: string | null;
  subjectId: string | null;
  patientId: string | null;
  visitId: string | null;
  section: string | null;
  reason: string | null;
  changeSet: string | null;
  traceId: string | null;
}

export interface AuditSearchParams {
  stream?: string;
  action?: string;
  actorUserId?: string;
  outcome?: string;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}

export interface UserActivityParams {
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}
