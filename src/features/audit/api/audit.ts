import { api } from "@/lib/http";
import type { PagedResponse } from "@/lib/paged";
import type {
  AuditEventView,
  AuditSearchParams,
  UserActivityParams,
} from "../types";

// Audit API. The backend forces the caller's facility into every query;
// the frontend never sends a facility id, so a URL edit cannot widen the
// scope. Patient identifiers are deliberately not accepted by the admin
// search UI (no PHI in URLs).
export async function searchAuditEvents(
  params: AuditSearchParams = {},
): Promise<PagedResponse<AuditEventView>> {
  const { data } = await api.get<PagedResponse<AuditEventView>>(
    "/api/v1/audit/events",
    {
      params: {
        stream: params.stream || undefined,
        action: params.action?.trim() || undefined,
        actorUserId: params.actorUserId?.trim() || undefined,
        outcome: params.outcome || undefined,
        from: params.from || undefined,
        to: params.to || undefined,
        page: params.page ?? 0,
        size: params.size ?? 20,
      },
    },
  );
  return data;
}

export async function getAuditUserActivity(
  userId: string,
  params: UserActivityParams = {},
): Promise<PagedResponse<AuditEventView>> {
  const { data } = await api.get<PagedResponse<AuditEventView>>(
    `/api/v1/audit/users/${userId}/activity`,
    {
      params: {
        from: params.from || undefined,
        to: params.to || undefined,
        page: params.page ?? 0,
        size: params.size ?? 20,
      },
    },
  );
  return data;
}
