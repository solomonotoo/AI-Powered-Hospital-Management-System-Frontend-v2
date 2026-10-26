"use client";

import Link from "next/link";
import { AlertTriangle, RefreshCw, UserCog, UserPlus } from "lucide-react";
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
import { useCan } from "@/features/identity/hooks/use-session";
import { formatDateTime } from "@/lib/format";
import { problemOf } from "@/lib/http";
import { ADMIN_PAGE_SIZE } from "@/lib/paged";
import { useUsers } from "../hooks/use-users";
import {
  ACCOUNT_STATUS_LABELS,
  ACCOUNT_TYPE_LABELS,
  type AccountStatus,
} from "../types/admin";

function statusVariant(status: AccountStatus) {
  if (status === "ACTIVE") return "secondary" as const;
  if (status === "DISABLED") return "destructive" as const;
  return "outline" as const;
}

/**
 * Account directory (blueprint 8.6). This is the identity record list;
 * staff links are completed on the staff detail screen. Search is not
 * offered because the backend list endpoint does not yet accept one.
 */
export function UserDirectory() {
  const canInvite = useCan("IDENTITY_USER_INVITE");
  const [page, setPage] = useState(0);
  const users = useUsers({ page, size: ADMIN_PAGE_SIZE });
  const rows = users.data?.content ?? [];
  const totalPages = users.data?.totalPages ?? 0;
  const problem = users.isError ? problemOf(users.error) : null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <UserCog aria-hidden="true" className="size-4" />
            User accounts
          </CardTitle>
          <CardDescription>
            Invite accounts, review access facts and manage account state.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => users.refetch()}
            disabled={users.isFetching}
          >
            <RefreshCw
              aria-hidden="true"
              className={users.isFetching ? "animate-spin" : undefined}
            />
            Refresh
          </Button>
          {canInvite && (
            <Button asChild size="sm">
              <Link href="/admin/users/invite">
                <UserPlus aria-hidden="true" />
                Invite user
              </Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {problem && (
          <Alert variant="destructive">
            <AlertTriangle aria-hidden="true" />
            <AlertTitle>Could not load user accounts</AlertTitle>
            <AlertDescription>
              {problem.message ?? "The backend did not return the directory."}
            </AlertDescription>
          </Alert>
        )}

        {users.isPending ? (
          <div className="space-y-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : problem ? null : rows.length === 0 ? (
          <div className="rounded-lg border border-dashed px-4 py-10 text-center">
            <p className="font-medium">No user accounts yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {canInvite
                ? "Invite the first account, then link it to a staff record."
                : "Ask a facility administrator to invite accounts."}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>MFA</TableHead>
                    <TableHead>Staff link</TableHead>
                    <TableHead>Last login</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.username}
                      </TableCell>
                      <TableCell>
                        {ACCOUNT_TYPE_LABELS[user.accountType] ??
                          user.accountType}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(user.status)}>
                          {ACCOUNT_STATUS_LABELS[user.status] ?? user.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.mfaEnabled ? "secondary" : "outline"}>
                          {user.mfaEnabled ? "Enabled" : "Not enrolled"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.staffId ? (
                          <Badge variant="outline">Linked</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Not linked
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {user.lastLoginAt
                          ? formatDateTime(user.lastLoginAt)
                          : "Never"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/admin/users/${user.id}`}>Open</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                {users.data?.totalElements ?? 0} account
                {users.data?.totalElements === 1 ? "" : "s"}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((current) => Math.max(0, current - 1))}
                  disabled={page <= 0 || users.isFetching}
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
                    users.isFetching ||
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
