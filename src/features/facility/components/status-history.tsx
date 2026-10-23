"use client";

import { History } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { problemOf } from "@/lib/http";
import { useFacilityStatusHistory } from "../hooks/use-facilities";
import { FACILITY_STATUS_LABELS, type FacilityStatus } from "../types";

// Ghana display timezone (blueprint 28): the backend stores Instants,
// the UI renders them in Africa/Accra regardless of the workstation.
const accraDateTime = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Africa/Accra",
});

function formatChangedAt(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : accraDateTime.format(date);
}

function statusLabel(value: string | null): string {
  if (!value) return "—";
  return FACILITY_STATUS_LABELS[value as FacilityStatus] ?? value;
}

/**
 * Platform facility-detail status history (blueprint 8.6 screen).
 * Append-only: the backend exposes no update or delete operation, and
 * this tab renders exactly what the server returns.
 */
export function StatusHistory({ facilityId }: { facilityId: string }) {
  const query = useFacilityStatusHistory(facilityId);

  if (query.isPending) return <Skeleton className="h-56 w-full" />;

  if (query.isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Could not load the status history</CardTitle>
          <CardDescription>
            {problemOf(query.error).message ??
              "The facility status history is unavailable."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const entries = query.data;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History aria-hidden="true" className="size-4" />
          Status history
        </CardTitle>
        <CardDescription>
          Append-only lifecycle transitions. Times are shown in Africa/Accra.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center">
            <History aria-hidden="true" className="size-8 text-muted-foreground" />
            <div className="space-y-1">
              <p className="font-medium">No status transitions recorded</p>
              <p className="text-sm text-muted-foreground">
                The first transition appears when the facility is configured or taken
                live.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Changed at</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Changed by</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {formatChangedAt(entry.changedAt)}
                    </TableCell>
                    <TableCell>{statusLabel(entry.fromStatus)}</TableCell>
                    <TableCell>{statusLabel(entry.toStatus)}</TableCell>
                    <TableCell className="max-w-xs text-sm">
                      {entry.reason ?? "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs break-all">
                      {entry.changedBy ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
