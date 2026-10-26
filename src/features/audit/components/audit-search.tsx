"use client";

import { AlertTriangle, RefreshCw, Search, X } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { problemOf } from "@/lib/http";
import { ADMIN_PAGE_SIZE } from "@/lib/paged";
import { useAuditEvents } from "../hooks/use-audit";
import {
  AUDIT_OUTCOMES,
  AUDIT_OUTCOME_LABELS,
  AUDIT_STREAMS,
  AUDIT_STREAM_LABELS,
  type AuditOutcome,
  type AuditSearchParams,
  type AuditStream,
} from "../types";
import { AuditEventTable } from "./audit-event-table";

interface FilterDraft {
  stream: string;
  outcome: string;
  action: string;
  actorUserId: string;
  from: string;
  to: string;
}

const EMPTY_FILTERS: FilterDraft = {
  stream: "ALL",
  outcome: "ALL",
  action: "",
  actorUserId: "",
  from: "",
  to: "",
};

function instantFromDate(value: string, endOfDay = false): string | undefined {
  if (!value) return undefined;
  return `${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`;
}

function appliedParams(
  filters: FilterDraft,
  page: number,
): AuditSearchParams {
  return {
    stream: filters.stream === "ALL" ? undefined : filters.stream,
    outcome: filters.outcome === "ALL" ? undefined : filters.outcome,
    action: filters.action.trim() || undefined,
    actorUserId: filters.actorUserId.trim() || undefined,
    from: instantFromDate(filters.from),
    to: instantFromDate(filters.to, true),
    page,
    size: ADMIN_PAGE_SIZE,
  };
}

/**
 * Compliance audit search (blueprint 6.5 / 8.6). The UI deliberately
 * offers only non-patient filters: patient identifiers must not be put in
 * query strings, and patient access history has its own audited screen.
 */
export function AuditSearch() {
  const [draft, setDraft] = useState<FilterDraft>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<FilterDraft>(EMPTY_FILTERS);
  const [page, setPage] = useState(0);
  const events = useAuditEvents(appliedParams(applied, page));

  const rows = events.data?.content ?? [];
  const totalPages = events.data?.totalPages ?? 0;
  const problem = events.isError ? problemOf(events.error) : null;

  const search = () => {
    setApplied(draft);
    setPage(0);
  };

  const clear = () => {
    setDraft(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
    setPage(0);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit search</CardTitle>
        <CardDescription>
          Search the append-only audit store for this facility. Rows are
          masked by the backend before they leave the server.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="audit-stream">Stream</Label>
            <Select
              value={draft.stream}
              onValueChange={(value) =>
                setDraft((current) => ({ ...current, stream: value }))
              }
            >
              <SelectTrigger id="audit-stream" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All streams</SelectItem>
                {AUDIT_STREAMS.map((stream) => (
                  <SelectItem key={stream} value={stream}>
                    {AUDIT_STREAM_LABELS[stream as AuditStream]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="audit-outcome">Outcome</Label>
            <Select
              value={draft.outcome}
              onValueChange={(value) =>
                setDraft((current) => ({ ...current, outcome: value }))
              }
            >
              <SelectTrigger id="audit-outcome" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All outcomes</SelectItem>
                {AUDIT_OUTCOMES.map((outcome) => (
                  <SelectItem key={outcome} value={outcome}>
                    {AUDIT_OUTCOME_LABELS[outcome as AuditOutcome]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="audit-action">Action</Label>
            <Input
              id="audit-action"
              value={draft.action}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  action: event.target.value,
                }))
              }
              placeholder="e.g. LOGIN_SUCCEEDED"
              className="font-mono text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="audit-actor">Actor user id</Label>
            <Input
              id="audit-actor"
              value={draft.actorUserId}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  actorUserId: event.target.value,
                }))
              }
              placeholder="User UUID"
              className="font-mono text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="audit-from">From</Label>
            <Input
              id="audit-from"
              type="date"
              value={draft.from}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  from: event.target.value,
                }))
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="audit-to">To</Label>
            <Input
              id="audit-to"
              type="date"
              value={draft.to}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  to: event.target.value,
                }))
              }
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" onClick={search} disabled={events.isFetching}>
            <Search aria-hidden="true" />
            Search
          </Button>
          <Button type="button" variant="outline" onClick={clear}>
            <X aria-hidden="true" />
            Clear
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => events.refetch()}
            disabled={events.isFetching}
          >
            <RefreshCw
              aria-hidden="true"
              className={events.isFetching ? "animate-spin" : undefined}
            />
            Refresh
          </Button>
        </div>

        {problem && (
          <Alert variant="destructive">
            <AlertTriangle aria-hidden="true" />
            <AlertTitle>Could not search audit events</AlertTitle>
            <AlertDescription>
              {problem.message ?? "The backend did not return a result."}
            </AlertDescription>
          </Alert>
        )}

        {events.isPending ? (
          <div className="space-y-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : problem ? null : (
          <>
            <AuditEventTable events={rows} />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                {events.data?.totalElements ?? 0} event
                {events.data?.totalElements === 1 ? "" : "s"}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((current) => Math.max(0, current - 1))}
                  disabled={page <= 0 || events.isFetching}
                >
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground">
                  Page {page + 1} of {Math.max(1, totalPages)}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((current) => current + 1)}
                  disabled={
                    events.isFetching ||
                    totalPages === 0 ||
                    page >= totalPages - 1
                  }
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
