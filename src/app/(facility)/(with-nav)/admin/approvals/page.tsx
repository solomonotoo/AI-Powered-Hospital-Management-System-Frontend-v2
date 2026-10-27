"use client";

import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApprovalsQueue } from "@/features/identity/components/approvals-queue";
import { useSession } from "@/features/identity/hooks/use-session";

export default function ApprovalsPage() {
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

  if (!session.permissions.includes("IDENTITY_ROLE_APPROVE_PRIVILEGED")) {
    return (
      <PermissionDenied
        title="Approval access required"
        description="Privileged role requests can only be decided by an account holding IDENTITY_ROLE_APPROVE_PRIVILEGED. Ask a facility administrator to review your access."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard">
              <LayoutDashboard aria-hidden="true" />
              Dashboard
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approvals"
        description="Second-person review for privileged role grants at your facility."
      />
      <ApprovalsQueue />
    </div>
  );
}
