"use client";

import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AuditSearch } from "@/features/audit/components/audit-search";
import { useSession } from "@/features/identity/hooks/use-session";

export default function AuditPage() {
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

  if (!session.permissions.includes("AUDIT_READ")) {
    return (
      <PermissionDenied
        title="Audit access required"
        description="This screen requires the AUDIT_READ permission. The backend re-checks it on every request."
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
        title="Audit"
        description="Search the append-only audit store for security, administration, PHI access and data-change events."
      />
      <AuditSearch />
    </div>
  );
}
