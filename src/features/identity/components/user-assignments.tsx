"use client";

import { AlertTriangle, ListChecks, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import { formatDateTime, humanizeCode } from "@/lib/format";
import { problemOf } from "@/lib/http";
import { ADMIN_PAGE_SIZE } from "@/lib/paged";
import { useUserAssignments } from "../hooks/use-users";

function shortId(value: string | undefined): string {
  if (!value) return "—";
  return value.length > 12 ? `${value.slice(0, 8)}…` : value;
}

function statusLabel(status: string | undefined): string {
  if (!status) return "Unknown";
  return humanizeCode(status);
}

function statusVariant(status: string | undefined) {
  if (status === "ACTIVE") return "secondary" as const;
  if (status === "PENDING_APPROVAL") return "outline" as const;
  if (status === "REVOKED" || status === "REJECTED") {
    return "destructive" as const;
  }
  return "outline" as const;
}

/**
 * Facility-scoped assignment history for one account. Revoked and expired
 * rows stay visible: they are the evidence of what the account could do and
 * when, not disposable list state.
 */
export function UserAssignments({ userId }: { userId: string }) {
  const [page, setPage] = useState(0);
  const assignments = useUserAssignments(userId, {
    page,
    size: ADMIN_PAGE_SIZE,
  });
  const rows = assignments.data?.content ?? [];
  const totalPages = assignments.data?.totalPages ?? 0;
  const problem = assignments.isError ? problemOf(assignments.error) : null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ListChecks aria-hidden="true" className="size-4" />
            Assignments at this facility
          </CardTitle>
          <CardDescription>
            Role grants recorded for this account. Other facilities&apos;
            assignments are not returned by the backend.
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => assignments.refetch()}
          disabled={assignments.isFetching}
        >
          <RefreshCw
            aria-hidden="true"
            className={assignments.isFetching ? "animate-spin" : undefined}
          />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {problem && (
          <Alert variant="destructive">
            <AlertTriangle aria-hidden="true" />
            <AlertTitle>Could not load assignments</AlertTitle>
            <AlertDescription>
              {problem.message ?? "The backend did not return this history."}
            </AlertDescription>
          </Alert>
        )}

        {assignments.isPending ? (
          <div className="space-y-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : problem ? null : rows.length === 0 ? (
          <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            No role assignments have been recorded at this facility.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Valid from</TableHead>
                    <TableHead>Valid to</TableHead>
                    <TableHead>Approved by</TableHead>
                    <TableHead>Source</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow
                      key={
                        row.assignmentId ??
                        `${row.roleCode ?? "role"}-${row.validFrom ?? ""}`
                      }
                    >
                      <TableCell>
                        <div className="font-medium">
                          {row.roleName ?? row.roleCode ?? "Unknown role"}
                        </div>
                        <div className="font-mono text-xs text-muted-foreground">
                          {row.roleCode ?? "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(row.status)}>
                          {statusLabel(row.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {row.unitId ? shortId(row.unitId) : "Facility-wide"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs">
                        {row.validFrom
                          ? formatDateTime(row.validFrom)
                          : "Immediately"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs">
                        {row.validTo
                          ? formatDateTime(row.validTo)
                          : "No end date"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {row.approvedBy
                          ? shortId(row.approvedBy)
                          : row.status === "PENDING_APPROVAL"
                            ? "Awaiting approval"
                            : "—"}
                      </TableCell>
                      <TableCell>
                        {row.bootstrapGrant ? (
                          <Badge variant="secondary">Bootstrap</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Standard
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                {assignments.data?.totalElements ?? 0} assignment
                {assignments.data?.totalElements === 1 ? "" : "s"}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPage((current) => Math.max(0, current - 1))
                  }
                  disabled={page <= 0 || assignments.isFetching}
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
                    assignments.isFetching ||
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
