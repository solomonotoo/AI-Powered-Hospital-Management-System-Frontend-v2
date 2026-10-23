"use client";

import Link from "next/link";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { useSession } from "@/features/identity/hooks/use-session";

// Platform console landing. Registry work only: the platform owner has
// no clinical workspace and the backend has no platform patient routes.
export default function PlatformPage() {
  const { data: session, isPending } = useSession();

  if (isPending || !session) return null;

  const canList = session.permissions.includes("FACILITY_LIST_ALL");
  const canRegister = session.permissions.includes("FACILITY_REGISTER");

  return (
    <>
      <PageHeader
        title="Platform console"
        description={`Signed in as ${session.username}. Platform accounts cannot open patient or clinical records.`}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 aria-hidden="true" className="size-4" />
              Facility administration
            </CardTitle>
            <CardDescription>
              Register facilities, review go-live readiness and provision the first
              administrator for each site.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {canList ? (
              <>
                <p className="text-sm text-muted-foreground">
                  New facilities start in Provisioning. The first administrator is invited
                  from the facility page; go-live remains gated by the readiness checklist.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button asChild>
                    <Link href="/platform/facilities">View facilities</Link>
                  </Button>
                  {canRegister && (
                    <Button asChild variant="outline">
                      <Link href="/platform/facilities/new">Register facility</Link>
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                This account does not hold the facility registry permission
                (FACILITY_LIST_ALL).
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Session facts</CardTitle>
            <CardDescription>Confirmed by the backend on page load.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Account type: </span>
              {session.accountType}
            </p>
            <p>
              <span className="text-muted-foreground">Permissions: </span>
              {session.permissions.length}
            </p>
            <p className="text-muted-foreground">
              Facility scope is unavailable to platform accounts by design.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
