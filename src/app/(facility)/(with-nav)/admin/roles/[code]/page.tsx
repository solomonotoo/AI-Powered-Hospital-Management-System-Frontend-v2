"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, LayoutDashboard } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { RoleEditor } from "@/features/identity/components/role-editor";
import { useRole } from "@/features/identity/hooks/use-roles";
import { useSession } from "@/features/identity/hooks/use-session";
import { problemOf } from "@/lib/http";

export default function RoleDetailPage() {
  const params = useParams<{ code: string }>();
  const code = params.code;
  const { data: session, isPending: sessionPending } = useSession();
  const canRead = session?.permissions.includes("IDENTITY_ROLE_READ") ?? false;
  const role = useRole(code, canRead);

  if (sessionPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!session) return null;

  if (!canRead) {
    return (
      <PermissionDenied
        title="Role administration access required"
        description="This screen requires the IDENTITY_ROLE_READ permission. The backend re-checks it on every request."
        action={
          <Button asChild variant="outline">
            <Link href="/dashboard">
              <LayoutDashboard aria-hidden="true" />
              Back to dashboard
            </Link>
          </Button>
        }
      />
    );
  }

  if (role.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (role.isError || !role.data) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <Alert variant="destructive">
          <AlertTriangle aria-hidden="true" />
          <AlertTitle>Could not open this role</AlertTitle>
          <AlertDescription>
            {problemOf(role.error).message ??
              "The role may not exist or may belong to another tier."}
          </AlertDescription>
        </Alert>
        <Button asChild variant="outline">
          <Link href="/admin/roles">
            <ArrowLeft aria-hidden="true" />
            Back to roles
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <RoleEditor role={role.data} />
    </div>
  );
}
