"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { fieldErrorsOf, problemOf } from "@/lib/http";
import { useChangeStaffEmploymentStatus } from "../hooks/use-staff";
import {
  changeEmploymentStatusSchema,
  toChangeEmploymentStatusInput,
  type ChangeEmploymentStatusFormValues,
} from "../schemas/staff";
import {
  EMPLOYMENT_STATUS_LABELS,
  EMPLOYMENT_STATUS_OPTIONS,
  type EmploymentStatus,
  type StaffDetailView,
} from "../types";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-sm text-destructive">
      {message}
    </p>
  );
}

/**
 * Employment moves are audited and, for SUSPENDED/TERMINATED, trigger
 * account deactivation in identity. The reason is mandatory because the
 * backend records it verbatim.
 */
export function StaffStatusDialog({
  staff,
  open,
  onOpenChange,
}: {
  staff: StaffDetailView;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const change = useChangeStaffEmploymentStatus(staff.id);
  const {
    control,
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ChangeEmploymentStatusFormValues>({
    resolver: zodResolver(changeEmploymentStatusSchema),
    defaultValues: {
      status: staff.employmentStatus as EmploymentStatus,
      reason: "",
    },
    mode: "onTouched",
  });

  useEffect(() => {
    if (open) {
      reset({
        status: staff.employmentStatus as EmploymentStatus,
        reason: "",
      });
    }
  }, [open, reset, staff.employmentStatus]);

  const submit = handleSubmit(async (values) => {
    try {
      await change.mutateAsync(toChangeEmploymentStatusInput(values));
      toast.success(
        `Employment status changed to ${EMPLOYMENT_STATUS_LABELS[values.status]}`,
      );
      onOpenChange(false);
    } catch (error) {
      const problem = problemOf(error);
      let firstInvalid = false;
      for (const [field, message] of Object.entries(fieldErrorsOf(error))) {
        if (field === "status" || field === "reason") {
          setError(field, { type: "server", message });
          firstInvalid = true;
        }
      }
      if (!firstInvalid) {
        toast.error(problem.message ?? "Could not change employment status");
      }
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change employment status</DialogTitle>
          <DialogDescription>
            {staff.displayName} is currently{" "}
            {EMPLOYMENT_STATUS_LABELS[
              staff.employmentStatus as keyof typeof EMPLOYMENT_STATUS_LABELS
            ] ?? staff.employmentStatus}
            . Suspension and termination disable the linked account and revoke
            its sessions.
          </DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="employment-status">New status</Label>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="employment-status"
                    className="w-full"
                    aria-invalid={Boolean(errors.status)}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EMPLOYMENT_STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError message={errors.status?.message} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="employment-reason">Reason</Label>
            <Textarea
              id="employment-reason"
              rows={3}
              placeholder="Record why this change is being made"
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
              disabled={change.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={change.isPending}>
              {change.isPending && (
                <Loader2 aria-hidden="true" className="animate-spin" />
              )}
              Change status
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
