"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useDeactivateUnit } from "../hooks/use-facilities";
import type { UnitView } from "../types";
import { problemOf } from "@/lib/http";

const deactivateSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, "Enter a reason for deactivation")
    .max(500, "Use 500 characters or fewer"),
});

type DeactivateFormValues = z.infer<typeof deactivateSchema>;

export function DeactivateUnitDialog({
  unit,
  open,
  onOpenChange,
}: {
  unit: UnitView;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const deactivate = useDeactivateUnit();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DeactivateFormValues>({
    resolver: zodResolver(deactivateSchema),
    defaultValues: { reason: "" },
    mode: "onTouched",
  });

  useEffect(() => {
    if (open) reset({ reason: "" });
  }, [open, reset]);

  const pending = isSubmitting || deactivate.isPending;

  const submit = handleSubmit(async ({ reason }) => {
    try {
      await deactivate.mutateAsync({ unitId: unit.id, reason });
      toast.success(`${unit.name} deactivated`);
      onOpenChange(false);
    } catch (error) {
      toast.error(problemOf(error).message ?? "Could not deactivate the unit");
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Deactivate {unit.name}?</DialogTitle>
          <DialogDescription>
            The unit stops accepting new queues, visits and assignments. Existing
            records are preserved; deactivation is an audited state change, not a
            delete.
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive">
          <AlertTitle>Check for active use first</AlertTitle>
          <AlertDescription>
            The blueprint forbids deactivating a unit with active bed occupancy, open
            queue entries or open visits. Those modules are not in this phase yet, so
            verify manually before proceeding; the reason is audited.
          </AlertDescription>
        </Alert>

        <form noValidate onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="deactivate-reason">Reason</Label>
            <Textarea
              id="deactivate-reason"
              rows={3}
              placeholder="e.g. Unit merged into OPD"
              aria-invalid={Boolean(errors.reason)}
              {...register("reason")}
            />
            {errors.reason?.message && (
              <p role="alert" className="text-sm text-destructive">
                {errors.reason.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              The reason is stored in the audit trail and cannot be edited later.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending && <Loader2 aria-hidden="true" className="animate-spin" />}
              {pending ? "Deactivating…" : "Deactivate unit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
