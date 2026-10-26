"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import {
  AUDIT_OUTCOME_LABELS,
  AUDIT_STREAM_LABELS,
  type AuditEventView,
  type AuditOutcome,
} from "../types";

function outcomeVariant(outcome: AuditOutcome) {
  if (outcome === "SUCCESS") return "secondary" as const;
  if (outcome === "DENIED") return "destructive" as const;
  return "outline" as const;
}

function shortId(value: string | null): string {
  if (!value) return "—";
  return value.length > 12 ? `${value.slice(0, 8)}…` : value;
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="break-all">{value || "—"}</dd>
    </div>
  );
}

export function AuditEventTable({
  events,
  emptyMessage = "No audit events match these filters.",
}: {
  events: AuditEventView[];
  emptyMessage?: string;
}) {
  const [selected, setSelected] = useState<AuditEventView | null>(null);

  if (events.length === 0) {
    return (
      <p className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Occurred</TableHead>
              <TableHead>Stream</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Outcome</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead className="text-right">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event) => (
              <TableRow key={event.id}>
                <TableCell className="whitespace-nowrap text-xs">
                  {formatDateTime(event.occurredAt)}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {AUDIT_STREAM_LABELS[event.stream] ?? event.stream}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {event.action}
                </TableCell>
                <TableCell>
                  <Badge variant={outcomeVariant(event.outcome)}>
                    {AUDIT_OUTCOME_LABELS[event.outcome] ?? event.outcome}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {shortId(event.actorUserId)}
                </TableCell>
                <TableCell className="text-xs">
                  {event.subjectType ?? "—"}
                  {event.subjectId ? (
                    <span className="ml-1 font-mono">
                      {shortId(event.subjectId)}
                    </span>
                  ) : null}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelected(event)}
                  >
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Audit event</DialogTitle>
            <DialogDescription>
              Append-only record. Change sets are pre-masked by the backend.
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <dl className="space-y-2">
              <Detail label="Event id" value={selected.id} />
              <Detail
                label="Occurred"
                value={formatDateTime(selected.occurredAt)}
              />
              <Detail label="Stream" value={selected.stream} />
              <Detail label="Action" value={selected.action} />
              <Detail label="Outcome" value={selected.outcome} />
              <Detail label="Actor type" value={selected.actorType} />
              <Detail label="Actor user" value={selected.actorUserId} />
              <Detail label="Facility" value={selected.facilityId} />
              <Detail label="Subject type" value={selected.subjectType} />
              <Detail label="Subject id" value={selected.subjectId} />
              <Detail label="Patient id" value={selected.patientId} />
              <Detail label="Visit id" value={selected.visitId} />
              <Detail label="Section" value={selected.section} />
              <Detail label="Reason" value={selected.reason} />
              <Detail label="Trace id" value={selected.traceId} />
              <div className="grid gap-1 text-sm">
                <dt className="text-muted-foreground">Change set</dt>
                <dd>
                  <pre className="max-h-64 overflow-auto rounded-md bg-muted p-2 text-xs whitespace-pre-wrap">
                    {selected.changeSet ?? "—"}
                  </pre>
                </dd>
              </div>
            </dl>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
