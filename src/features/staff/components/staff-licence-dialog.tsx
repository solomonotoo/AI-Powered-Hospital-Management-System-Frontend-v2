"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";
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
import { fieldErrorsOf, problemOf } from "@/lib/http";
import { useAddStaffLicence } from "../hooks/use-staff";
import {
  addLicenceSchema,
  emptyLicence,
  toAddLicenceInput,
  type AddLicenceFormValues,
} from "../schemas/staff";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-sm text-destructive">
      {message}
    </p>
  );
}

/** Renewal appends a new row; the backend preserves the old licence. */
export function StaffLicenceDialog({
  staffId,
  open,
  onOpenChange,
}: {
  staffId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const add = useAddStaffLicence(staffId);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<AddLicenceFormValues>({
    resolver: zodResolver(addLicenceSchema),
    defaultValues: emptyLicence(),
    mode: "onTouched",
  });

  useEffect(() => {
    if (open) reset(emptyLicence());
  }, [open, reset]);

  const submit = handleSubmit(async (values) => {
    try {
      await add.mutateAsync(toAddLicenceInput(values));
      toast.success("Licence recorded");
      onOpenChange(false);
    } catch (error) {
      const problem = problemOf(error);
      let firstInvalid = false;
      for (const [field, message] of Object.entries(fieldErrorsOf(error))) {
        if (field in emptyLicence()) {
          setError(field as keyof AddLicenceFormValues, {
            type: "server",
            message,
          });
          firstInvalid = true;
        }
      }
      if (!firstInvalid) {
        toast.error(problem.message ?? "Could not record the licence");
      }
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add licence</DialogTitle>
          <DialogDescription>
            Licences are append-only. Recording a renewal keeps the previous
            licence as history.
          </DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-licence-body">Licensing body</Label>
            <Input
              id="new-licence-body"
              placeholder="e.g. MDC"
              aria-invalid={Boolean(errors.body)}
              {...register("body")}
            />
            <FieldError message={errors.body?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-licence-number">Licence number</Label>
            <Input
              id="new-licence-number"
              aria-invalid={Boolean(errors.number)}
              {...register("number")}
            />
            <FieldError message={errors.number?.message} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="new-licence-issued">Issued on</Label>
              <Input
                id="new-licence-issued"
                type="date"
                aria-invalid={Boolean(errors.issuedOn)}
                {...register("issuedOn")}
              />
              <FieldError message={errors.issuedOn?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-licence-expires">Expires on</Label>
              <Input
                id="new-licence-expires"
                type="date"
                aria-invalid={Boolean(errors.expiresOn)}
                {...register("expiresOn")}
              />
              <FieldError message={errors.expiresOn?.message} />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={add.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={add.isPending}>
              {add.isPending ? (
                <Loader2 aria-hidden="true" className="animate-spin" />
              ) : (
                <Plus aria-hidden="true" />
              )}
              Add licence
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
