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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fieldErrorsOf, problemOf } from "@/lib/http";
import { useUnlinkStaffUser } from "../hooks/use-staff";
import { unlinkUserSchema, type UnlinkUserFormValues } from "../schemas/staff";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-sm text-destructive">
      {message}
    </p>
  );
}

/**
 * Revokes a staff-to-account link that was made against the wrong
 * account. The history stays in the audit stream; clearing the active
 * edge lets the correct account be linked afterwards.
 */
export function StaffUnlinkUserDialog({
  staffId,
  userId,
  open,
  onOpenChange,
}: {
  staffId: string;
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const unlink = useUnlinkStaffUser(staffId);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<UnlinkUserFormValues>({
    resolver: zodResolver(unlinkUserSchema),
    defaultValues: { reason: "" },
    mode: "onTouched",
  });

  useEffect(() => {
    if (open) reset({ reason: "" });
  }, [open, reset]);

  const submit = handleSubmit(async (values) => {
    try {
      await unlink.mutateAsync(values.reason);
      toast.success("Account link revoked");
      onOpenChange(false);
    } catch (error) {
      const problem = problemOf(error);
      let firstInvalid = false;
      for (const [field, message] of Object.entries(fieldErrorsOf(error))) {
        if (field === "reason") {
          setError(field, { type: "server", message });
          firstInvalid = true;
        }
      }
      if (!firstInvalid) {
        toast.error(problem.message ?? "Could not revoke the account link");
      }
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Revoke this account link</DialogTitle>
          <DialogDescription>
            The account link is cleared so the correct account can be attached.
            The historical link remains in the audit trail.
          </DialogDescription>
        </DialogHeader>

        {userId && (
          <div className="rounded-lg border p-3 text-sm">
            <p className="font-medium">Currently linked account</p>
            <p className="mt-1 font-mono text-xs break-all text-muted-foreground">
              {userId}
            </p>
          </div>
        )}

        <form noValidate onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="unlink-reason">Reason</Label>
            <Textarea
              id="unlink-reason"
              rows={3}
              placeholder="Explain the mistaken link being corrected"
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
              disabled={unlink.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={unlink.isPending || !userId}
            >
              {unlink.isPending && (
                <Loader2 aria-hidden="true" className="animate-spin" />
              )}
              Revoke link
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
