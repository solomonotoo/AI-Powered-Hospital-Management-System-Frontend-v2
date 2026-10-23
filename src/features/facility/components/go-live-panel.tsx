"use client";

import { CheckCircle2, Loader2, Rocket, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useCan } from "@/features/identity/hooks/use-session";
import { problemOf } from "@/lib/http";
import { FacilityStatusBadge } from "./facility-status-badge";
import { ReadinessChecklist } from "./readiness-checklist";
import {
  useCurrentFacility,
  useCurrentFacilityReadiness,
  useRequestGoLive,
} from "../hooks/use-facilities";

/**
 * Facility-side go-live panel (blueprint 4.1 step 7 / 8.6).
 *
 * Go-live belongs to the FACILITY ADMIN, not the platform owner: the
 * blueprint keeps the platform tier out of facility operations. The
 * backend re-runs the readiness checklist inside the command, so this
 * panel only presents the current answer and the action.
 */
export function GoLivePanel() {
  const canGoLive = useCan("FACILITY_GO_LIVE");
  const facilityQuery = useCurrentFacility();
  const readinessQuery = useCurrentFacilityReadiness();
  const goLive = useRequestGoLive();
  const [open, setOpen] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  if (facilityQuery.isPending || readinessQuery.isPending) {
    return <Skeleton className="h-72 w-full" />;
  }

  if (facilityQuery.isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Could not load the facility</CardTitle>
          <CardDescription>
            {problemOf(facilityQuery.error).message ??
              "The facility profile is unavailable."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            disabled={facilityQuery.isFetching}
            onClick={() => void facilityQuery.refetch()}
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (readinessQuery.isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Could not run the readiness check</CardTitle>
          <CardDescription>
            {problemOf(readinessQuery.error).message ??
              "The readiness checklist is unavailable."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            disabled={readinessQuery.isFetching}
            onClick={() => void readinessQuery.refetch()}
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const facility = facilityQuery.data;
  const items = readinessQuery.data;
  const allPassed = items.length > 0 && items.every((item) => item.passed);
  const live = facility.status === "LIVE";
  const statusAllowsGoLive =
    facility.status === "PROVISIONING" || facility.status === "CONFIGURED";

  const confirm = async () => {
    setConfirmError(null);
    try {
      await goLive.mutateAsync();
      setOpen(false);
      toast.success(`${facility.name} is now live`);
    } catch (error) {
      const problem = problemOf(error);
      setConfirmError(problem.message ?? "Could not take the facility live");
      // The checklist is the authority; a 422 means it changed under us.
      if (problem.code === "READINESS_FAILED") {
        void readinessQuery.refetch();
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Rocket aria-hidden="true" className="size-4" />
          Go-live
        </CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs">{facility.code}</span>
          <span aria-hidden="true">·</span>
          <span>{facility.name}</span>
          <FacilityStatusBadge status={facility.status} />
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {live ? (
          <Alert className="border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/30">
            <CheckCircle2
              aria-hidden="true"
              className="text-emerald-600 dark:text-emerald-400"
            />
            <AlertTitle>Facility is live</AlertTitle>
            <AlertDescription>
              Daily operations are enabled. The platform tier monitors health and
              licence only; it cannot see patient data.
            </AlertDescription>
          </Alert>
        ) : !statusAllowsGoLive ? (
          <Alert>
            <ShieldAlert aria-hidden="true" />
            <AlertTitle>Go-live is not available for this status</AlertTitle>
            <AlertDescription>
              This facility is {facility.status}. A platform owner must reactivate
              it before go-live can be requested again.
            </AlertDescription>
          </Alert>
        ) : !canGoLive ? (
          <Alert>
            <ShieldAlert aria-hidden="true" />
            <AlertTitle>Go-live permission required</AlertTitle>
            <AlertDescription>
              This action requires the FACILITY_GO_LIVE permission. The backend
              enforces it even when the button is hidden.
            </AlertDescription>
          </Alert>
        ) : allPassed ? (
          <Alert className="border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/30">
            <CheckCircle2
              aria-hidden="true"
              className="text-emerald-600 dark:text-emerald-400"
            />
            <AlertTitle>Ready for go-live</AlertTitle>
            <AlertDescription>
              Every readiness check passes. Taking the facility live enables daily
              operations immediately.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <ShieldAlert aria-hidden="true" />
            <AlertTitle>Go-live is blocked</AlertTitle>
            <AlertDescription>
              Resolve the failing checks below. The backend re-runs this checklist
              when the command is issued.
            </AlertDescription>
          </Alert>
        )}

        <ReadinessChecklist items={items} />

        {!live && statusAllowsGoLive && canGoLive && allPassed && (
          <Dialog
            open={open}
            onOpenChange={(next) => {
              setOpen(next);
              if (!next) setConfirmError(null);
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Rocket aria-hidden="true" />
                Take facility live
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Take {facility.name} live?</DialogTitle>
                <DialogDescription>
                  This changes the facility status from {facility.status} to LIVE
                  and enables daily operations. The readiness checklist is checked
                  again on the server.
                </DialogDescription>
              </DialogHeader>

              {confirmError && (
                <Alert variant="destructive">
                  <AlertTitle>Could not take the facility live</AlertTitle>
                  <AlertDescription>{confirmError}</AlertDescription>
                </Alert>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  disabled={goLive.isPending}
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={goLive.isPending}
                  onClick={() => void confirm()}
                >
                  {goLive.isPending && (
                    <Loader2 aria-hidden="true" className="animate-spin" />
                  )}
                  {goLive.isPending ? "Taking live…" : "Take facility live"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}
