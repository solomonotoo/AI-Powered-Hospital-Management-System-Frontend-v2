"use client";

import {
  AlertTriangle,
  Loader2,
  LogOut,
  MonitorSmartphone,
  RefreshCw,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
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
import { useCan, useSession } from "../hooks/use-session";
import { useRevokeUserSessions, useUserSessions } from "../hooks/use-users";

function shortId(value: string | undefined): string {
  if (!value) return "—";
  return value.length > 12 ? `${value.slice(0, 8)}…` : value;
}

/**
 * Usable sessions for one account, limited to the caller's facility. The
 * backend marks the caller's own session; refresh-token material is never
 * part of this view.
 */
export function UserSessions({ userId }: { userId: string }) {
  const [page, setPage] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const currentSession = useSession().data;
  const canRevoke = useCan("IDENTITY_SESSION_REVOKE");
  const revoke = useRevokeUserSessions();
  const sessions = useUserSessions(userId, {
    page,
    size: ADMIN_PAGE_SIZE,
  });
  const rows = sessions.data?.content ?? [];
  const totalPages = sessions.data?.totalPages ?? 0;
  const problem = sessions.isError ? problemOf(sessions.error) : null;
  const self = currentSession?.userId === userId;
  const canRevokeHere = canRevoke || self;
  const revoking = revoke.isPending;

  const confirmRevocation = async () => {
    try {
      await revoke.mutateAsync(userId);
      toast.success("Sessions revoked");
      setConfirming(false);
    } catch (error) {
      toast.error(problemOf(error).message ?? "Could not revoke sessions");
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MonitorSmartphone aria-hidden="true" className="size-4" />
              Active sessions
            </CardTitle>
            <CardDescription>
              Only usable sessions at this facility are shown. Revoking ends
              every usable session for this account here; other facilities are
              untouched.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => sessions.refetch()}
              disabled={sessions.isFetching}
            >
              <RefreshCw
                aria-hidden="true"
                className={sessions.isFetching ? "animate-spin" : undefined}
              />
              Refresh
            </Button>
            {canRevokeHere && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => setConfirming(true)}
                disabled={revoking || sessions.isPending || rows.length === 0}
              >
                {revoking ? (
                  <Loader2 aria-hidden="true" className="animate-spin" />
                ) : (
                  <LogOut aria-hidden="true" />
                )}
                Revoke sessions
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {problem && (
            <Alert variant="destructive">
              <AlertTriangle aria-hidden="true" />
              <AlertTitle>Could not load sessions</AlertTitle>
              <AlertDescription>
                {problem.message ?? "The backend did not return session data."}
              </AlertDescription>
            </Alert>
          )}

          {sessions.isPending ? (
            <div className="space-y-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : problem ? null : rows.length === 0 ? (
            <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              No active sessions were found for this account at this facility.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Session</TableHead>
                      <TableHead>Device</TableHead>
                      <TableHead>IP address</TableHead>
                      <TableHead>Last used</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((session) => (
                      <TableRow
                        key={
                          session.sessionId ??
                          `${session.userId ?? "user"}-${session.createdAt ?? ""}`
                        }
                      >
                        <TableCell className="font-mono text-xs">
                          {shortId(session.sessionId)}
                        </TableCell>
                        <TableCell
                          className="max-w-64 truncate text-xs"
                          title={session.userAgent ?? undefined}
                        >
                          {session.userAgent ?? "Unknown device"}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {session.ipAddress ?? "—"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs">
                          {session.lastUsedAt
                            ? formatDateTime(session.lastUsedAt)
                            : "—"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs">
                          {session.expiresAt
                            ? formatDateTime(session.expiresAt)
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {session.current ? (
                            <Badge variant="secondary">This session</Badge>
                          ) : (
                            <Badge variant="outline">Active</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  {sessions.data?.totalElements ?? 0} session
                  {sessions.data?.totalElements === 1 ? "" : "s"}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPage((current) => Math.max(0, current - 1))
                    }
                    disabled={page <= 0 || sessions.isFetching}
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
                      sessions.isFetching ||
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
        open={confirming}
        onOpenChange={(open) => {
          if (!open) setConfirming(false);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Revoke all sessions</DialogTitle>
            <DialogDescription>
              {self
                ? "This ends every usable session for your account at this facility, including the current one. You will need to sign in again."
                : "This ends every usable session for this account at this facility. The account holder will need to sign in again. Sessions at other facilities are not affected."}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border bg-muted/40 p-3 text-sm">
            <p className="font-medium">
              {sessions.data?.totalElements ?? rows.length} usable session
              {(sessions.data?.totalElements ?? rows.length) === 1 ? "" : "s"}{" "}
              at this facility
            </p>
            <p className="text-muted-foreground">
              The action is recorded in the security audit stream.
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirming(false)}
              disabled={revoking}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmRevocation}
              disabled={revoking}
            >
              {revoking && (
                <Loader2 aria-hidden="true" className="animate-spin" />
              )}
              Confirm revocation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
