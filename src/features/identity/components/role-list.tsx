"use client";

import Link from "next/link";
import { AlertTriangle, Plus, ShieldCheck } from "lucide-react";
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
import { problemOf } from "@/lib/http";
import { useRoles } from "../hooks/use-roles";

export function RoleList() {
  const canManage = useCan("IDENTITY_ROLE_MANAGE");
  const roles = useRoles("FACILITY");
  const rows = roles.data ?? [];
  const problem = roles.isError ? problemOf(roles.error) : null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck aria-hidden="true" className="size-4" />
            Facility roles
          </CardTitle>
          <CardDescription>
            System templates are read-only. Clone one to create a custom role
            with a facility-specific permission set.
          </CardDescription>
        </div>
        {canManage && (
          <Button asChild size="sm">
            <Link href="/admin/roles/new">
              <Plus aria-hidden="true" />
              New custom role
            </Link>
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {problem && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle aria-hidden="true" />
            <AlertTitle>Could not load roles</AlertTitle>
            <AlertDescription>
              {problem.message ?? "The backend did not return the role list."}
            </AlertDescription>
          </Alert>
        )}

        {roles.isPending ? (
          <div className="space-y-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : problem ? null : rows.length === 0 ? (
          <p className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
            No facility roles are configured.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((role) => (
                  <TableRow key={role.code}>
                    <TableCell className="font-mono text-xs">
                      {role.code}
                    </TableCell>
                    <TableCell className="font-medium">{role.name}</TableCell>
                    <TableCell>
                      {role.systemTemplate ? (
                        <Badge variant="secondary">System template</Badge>
                      ) : (
                        <Badge variant="outline">Custom</Badge>
                      )}
                    </TableCell>
                    <TableCell>{role.permissions.length}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/admin/roles/${role.code}`}>Open</Link>
                      </Button>
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
