"use client";

import Link from "next/link";
import {
  Building2,
  ClipboardCheck,
  Hash,
  LayoutDashboard,
  Network,
  Printer,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { GoLivePanel } from "@/features/facility/components/go-live-panel";
import { useSession } from "@/features/identity/hooks/use-session";

/**
 * Facility setup / go-live (blueprint 4.1 step 7 and 8.6).
 *
 * The platform console is deliberately read-only for readiness: the
 * blueprint gives go-live to the Facility Admin, and the backend keeps
 * the platform owner out of facility operations. This is where the
 * facility completes the loop.
 */
export default function FacilitySetupPage() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (!session) return null;

  if (!session.facilityId) {
    return (
      <PermissionDenied
        title="Select a facility first"
        description="Facility setup is scoped to one facility. Choose the facility you want to configure."
        action={
          <Button asChild>
            <Link href="/select-facility">Choose a facility</Link>
          </Button>
        }
      />
    );
  }

  const canUpdate = session.permissions.includes("FACILITY_UPDATE");
  const canManageUnits = session.permissions.includes("FACILITY_UNIT_MANAGE");
  const canReadConfig = session.permissions.includes("CONFIG_READ");
  if (!canUpdate) {
    return (
      <PermissionDenied
        title="Facility setup access required"
        description="This screen requires the FACILITY_UPDATE permission. The backend re-checks it on every request."
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
        title="Facility setup"
        description="Work through the readiness checklist, then take this facility live."
        actions={
          <Button asChild variant="outline">
            <Link href="/dashboard">
              <LayoutDashboard aria-hidden="true" />
              Dashboard
            </Link>
          </Button>
        }
      />

      <div className="space-y-4">
        <GoLivePanel />

        <Card>
          <CardHeader>
            <CardTitle>Setup screens</CardTitle>
            <CardDescription>
              Keep the registry, organizational structure, number formats and print
              identity current while you work through readiness.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href="/admin/facility">
                  <Building2 aria-hidden="true" />
                  Facility profile
                </Link>
              </Button>
              {canManageUnits && (
                <Button asChild variant="outline">
                  <Link href="/admin/units">
                    <Network aria-hidden="true" />
                    Organization units
                  </Link>
                </Button>
              )}
              {canReadConfig && (
                <>
                  <Button asChild variant="outline">
                    <Link href="/admin/setup/sequences">
                      <Hash aria-hidden="true" />
                      Number sequences
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/admin/setup/print-profile">
                      <Printer aria-hidden="true" />
                      Print profile
                    </Link>
                  </Button>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Number sequences and the print profile are required readiness items. Each
              editor still checks its own write permission.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck aria-hidden="true" className="size-4" />
              How go-live works
            </CardTitle>
            <CardDescription>
              The checklist is evaluated by the server, not by this page.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Go-live is a facility-administrator action. The platform owner can
              review the registry and readiness but cannot take a facility live.
            </p>
            <p>
              Every check must pass. Once you request go-live, the backend re-runs
              the checklist and refuses the command with a{" "}
              <span className="font-mono text-xs">READINESS_FAILED</span> problem if
              anything changed.
            </p>
            <p>
              A successful go-live records the status transition and audit event,
              enables daily operations, and cannot be undone from this screen.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
