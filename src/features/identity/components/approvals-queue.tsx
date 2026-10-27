"use client";

import {
  AlertTriangle,
  Check,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import { problemOf } from "@/lib/http";
import { ADMIN_PAGE_SIZE } from "@/lib/paged";
import {
  useApproveAssignment,
  usePendingAssignments,
  useRejectAssignment,
} from "../hooks/use-roles";
import type { PendingAssignmentView } from "../types/admin";

type Decision = "approve" | "reject";

function shortId(value: string | undefined): string {
  if (!value) return "—";
  return value.length > 12 ? `${value.slice(0, 8)}…` : value;
}

/**
 * Privileged-assignment approval queue (blueprint `/admin/approvals`).
 * The backend returns only pending grants for the caller's token facility;
 * the UI gate is convenience, not the authorization boundary.
 */
export function ApprovalsQueue() {
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<{
    decision: Decision;
    row: PendingAssignmentView;
  } | null>(null);
  const pending = usePendingAssignments({ page, size: ADMIN_PAGE_SIZE });
  const approve = useApproveAssignment();
  const reject = useRejectAssignment();
  const rows = pending.data?.content ?? [];
  const totalPages = pending.data?.totalPages ?? 0;
  const problem = pending.isError ? problemOf(pending.error) : null;
  const busy = approve.isPending || reject.isPending;

  const confirm = async () => {
    if (!selected) return;
    const assignmentId = selected.row.assignmentId;
    if (!assignmentId) {
      toast.error("The assignment id is missing; refresh and try again");
      setSelected(null);
      return;
    }

    try {
      if (selected.decision === "approve") {
        await approve.mutateAsync(assignmentId);
        toast.success("Assignment approved");
      } else {
        await reject.mutateAsync(assignmentId);
        toast.success("Assignment rejected");
      }
      setSelected(null);
    } catch (error) {
      toast.error(
        problemOf(error).message ?? "Could not record the decision",
      );
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck aria-hidden="true" className="size-4" />
              Pending privileged grants
            </CardTitle>
            <CardDescription>
              Facility-scoped requests waiting for a second approver. You cannot
              approve a grant you created yourself.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => pending.refetch()}
            disabled={pending.isFetching}
          >
            <RefreshCw
              aria-hidden="true"
              className={pending.isFetching ? "animate-spin" : undefined}
            />
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {problem && (
            <Alert variant="destructive">
              <AlertTriangle aria-hidden="true" />
              <AlertTitle>Could not load the approval queue</AlertTitle>
              <AlertDescription>
                {problem.message ?? "The backend did not return pending grants."}
              </AlertDescription>
            </Alert>
          )}

          {pending.isPending ? (
            <div className="space-y-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : problem ? null : rows.length === 0 ? (
            <div className="rounded-lg border border-dashed px-4 py-10 text-center">
              <p className="font-medium">No pending approvals</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Privileged role grants will appear here until a second approver
                acts on them.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Valid from</TableHead>
                      <TableHead>Valid to</TableHead>
                      <TableHead>Requested by</TableHead>
                      <TableHead className="text-right">Decision</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow
                        key={
                          row.assignmentId ??
                          `${row.userId ?? "user"}-${row.roleCode ?? "role"}`
                        }
                      >
                        <TableCell>
                          <div className="font-medium">
                            {row.username ?? shortId(row.userId)}
                          </div>
                          <div className="font-mono text-xs text-muted-foreground">
                            {shortId(row.userId)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {row.roleName ?? row.roleCode ?? "Unknown role"}
                          </div>
                          <div className="font-mono text-xs text-muted-foreground">
                            {row.roleCode ?? "—"}
                          </div>
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
                          {row.grantedByUsername ?? shortId(row.grantedBy)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() =>
                                setSelected({ decision: "approve", row })
                              }
                              disabled={busy}
                            >
                              <Check aria-hidden="true" />
                              Approve
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setSelected({ decision: "reject", row })
                              }
                              disabled={busy}
                            >
                              <X aria-hidden="true" />
                              Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  {pending.data?.totalElements ?? 0} pending request
                  {pending.data?.totalElements === 1 ? "" : "s"}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPage((current) => Math.max(0, current - 1))
                    }
                    disabled={page <= 0 || pending.isFetching}
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
                      pending.isFetching ||
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

      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selected?.decision === "approve"
                ? "Approve privileged assignment"
                : "Reject privileged assignment"}
            </DialogTitle>
            <DialogDescription>
              {selected?.decision === "approve"
                ? "The grant becomes effective immediately and is recorded against your account."
                : "The request is closed without granting access. The requester will need to submit a new request."}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              <p className="font-medium">
                {selected.row.roleName ?? selected.row.roleCode ?? "Role"}
              </p>
              <p className="text-muted-foreground">
                {selected.row.username ?? shortId(selected.row.userId)}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelected(null)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={selected?.decision === "reject" ? "destructive" : "default"}
              onClick={confirm}
              disabled={busy}
            >
              {selected?.decision === "approve"
                ? "Confirm approval"
                : "Confirm rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
