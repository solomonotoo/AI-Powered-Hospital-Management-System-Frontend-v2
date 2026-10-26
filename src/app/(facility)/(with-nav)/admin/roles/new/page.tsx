"use client";

import Link from "next/link";
import { ArrowLeft, LayoutDashboard } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RoleCreateForm } from "@/features/identity/components/role-create-form";
import { useSession } from "@/features/identity/hooks/use-session";

export default function NewRolePage() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!session) return null;

  if (!session.permissions.includes("IDENTITY_ROLE_MANAGE")) {
    return (
      <PermissionDenied
        title="Role management access required"
        description="This screen requires the IDENTITY_ROLE_MANAGE permission. The backend re-checks it when the role is created."
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

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        title="New custom role"
        description="Create a facility-specific role from the permission catalogue."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/roles">
              <ArrowLeft aria-hidden="true" />
              Roles
            </Link>
          </Button>
        }
      />
      <RoleCreateForm />
    </div>
  );
}
