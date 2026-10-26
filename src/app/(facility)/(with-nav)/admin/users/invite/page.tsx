"use client";

import Link from "next/link";
import { ArrowLeft, LayoutDashboard } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { InviteUserForm } from "@/features/identity/components/invite-user-form";
import { useSession } from "@/features/identity/hooks/use-session";

export default function InviteUserPage() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (!session) return null;

  if (!session.permissions.includes("IDENTITY_USER_INVITE")) {
    return (
      <PermissionDenied
        title="User invitation access required"
        description="This screen requires the IDENTITY_USER_INVITE permission. The backend re-checks it when the invitation is created."
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
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader
        title="Invite user"
        description="Create an account invitation. Link the accepted account to a staff record afterwards."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/users">
              <ArrowLeft aria-hidden="true" />
              Users
            </Link>
          </Button>
        }
      />
      <InviteUserForm />
    </div>
  );
}
