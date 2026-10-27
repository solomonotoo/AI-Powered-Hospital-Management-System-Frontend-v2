"use client";

import { AlertTriangle, MonitorSmartphone, RefreshCw } from "lucide-react";
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
import { formatDateTime } from "@/lib/format";
import { problemOf } from "@/lib/http";
import { ADMIN_PAGE_SIZE } from "@/lib/paged";
import { useUserSessions } from "../hooks/use-users";

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
  const sessions = useUserSessions(userId, {
    page,
    size: ADMIN_PAGE_SIZE,
  });
  const rows = sessions.data?.content ?? [];
  const totalPages = sessions.data?.totalPages ?? 0;
  const problem = sessions.isError ? problemOf(sessions.error) : null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <MonitorSmartphone aria-hidden="true" className="size-4" />
            Active sessions
          </CardTitle>
          <CardDescription>
            Only usable sessions at this facility are shown. Session revocation
            is not exposed by the current API.
          </CardDescription>
        </div>
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
                      key={session.sessionId ?? `${session.userId ?? "user"}-${session.createdAt ?? ""}`}
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
  );
}
