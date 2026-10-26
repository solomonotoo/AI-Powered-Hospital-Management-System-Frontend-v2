"use client";

import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { UserDirectory } from "@/features/identity/components/user-directory";
import { useSession } from "@/features/identity/hooks/use-session";

export default function UsersPage() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (!session) return null;

  if (!session.permissions.includes("IDENTITY_USER_READ")) {
    return (
      <PermissionDenied
        title="User administration access required"
        description="This screen requires the IDENTITY_USER_READ permission. The backend re-checks it on every request."
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
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        title="Users"
        description="Login accounts and access state. Invitations, MFA and account controls live here; workforce records live under Staff."
      />
      <UserDirectory />
    </div>
  );
}
