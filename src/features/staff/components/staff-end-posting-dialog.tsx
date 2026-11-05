"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fieldErrorsOf, problemOf } from "@/lib/http";
import { useEndStaffPosting } from "../hooks/use-staff";
import {
  endPostingSchema,
  toEndPostingInput,
  type EndPostingFormValues,
} from "../schemas/staff";
import type { StaffAssignmentView } from "../types";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-sm text-destructive">
      {message}
    </p>
  );
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Corrects a posting recorded against the wrong unit. Postings are
 * history, so the wrong row is closed with a mandatory reason (never
 * edited or deleted) and the correct posting is added afterwards.
 */
export function StaffEndPostingDialog({
  staffId,
  assignment,
  unitName,
  open,
  onOpenChange,
}: {
  staffId: string;
  assignment: StaffAssignmentView | null;
  unitName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const end = useEndStaffPosting(staffId);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<EndPostingFormValues>({
    resolver: zodResolver(endPostingSchema),
    defaultValues: { end: todayIso(), reason: "" },
    mode: "onTouched",
  });

  useEffect(() => {
    if (open) reset({ end: todayIso(), reason: "" });
  }, [open, reset]);

  const submit = handleSubmit(async (values) => {
    if (!assignment) return;
    try {
      await end.mutateAsync(toEndPostingInput(assignment.unitId, values));
      toast.success("Posting closed");
      onOpenChange(false);
    } catch (error) {
      const problem = problemOf(error);
      let firstInvalid = false;
      for (const [field, message] of Object.entries(fieldErrorsOf(error))) {
        if (field === "end" || field === "reason") {
          setError(field, { type: "server", message });
          firstInvalid = true;
        }
      }
      if (!firstInvalid) {
        toast.error(problem.message ?? "Could not close the posting");
      }
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Close this posting</DialogTitle>
          <DialogDescription>
            Postings are history and cannot be edited or deleted. Closing the
            mistaken posting and adding the correct one preserves both records.
          </DialogDescription>
        </DialogHeader>

        {assignment && (
          <div className="rounded-lg border p-3 text-sm">
            <p className="font-medium">{unitName}</p>
            <p className="mt-1 text-muted-foreground">
              Posted from {assignment.from}
              {assignment.primary ? " · Primary" : ""}
            </p>
          </div>
        )}

        <form noValidate onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="end-posting-date">End date</Label>
            <Input
              id="end-posting-date"
              type="date"
              aria-invalid={Boolean(errors.end)}
              {...register("end")}
            />
            <FieldError message={errors.end?.message} />
            <p className="text-xs text-muted-foreground">
              A posting that has not started yet is closed on its start date.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="end-posting-reason">Reason</Label>
            <Textarea
              id="end-posting-reason"
              rows={3}
              placeholder="Explain the mistake being corrected"
              aria-invalid={Boolean(errors.reason)}
              {...register("reason")}
            />
            <FieldError message={errors.reason?.message} />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={end.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={end.isPending || !assignment}>
              {end.isPending && (
                <Loader2 aria-hidden="true" className="animate-spin" />
              )}
              Close posting
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
