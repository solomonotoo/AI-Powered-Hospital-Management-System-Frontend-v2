"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UnitView } from "@/features/facility/types";
import { fieldErrorsOf, problemOf } from "@/lib/http";
import { useAssignStaffUnit } from "../hooks/use-staff";
import {
  assignUnitSchema,
  toAssignUnitInput,
  type AssignUnitFormValues,
} from "../schemas/staff";

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

/** Postings append history; a primary posting closes the previous primary. */
export function StaffPostingDialog({
  staffId,
  units,
  open,
  onOpenChange,
}: {
  staffId: string;
  units: UnitView[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const assign = useAssignStaffUnit(staffId);
  const activeUnits = units.filter((unit) => unit.active);
  const {
    control,
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<AssignUnitFormValues>({
    resolver: zodResolver(assignUnitSchema),
    defaultValues: { unitId: "", from: todayIso(), primary: false },
    mode: "onTouched",
  });

  useEffect(() => {
    if (open) reset({ unitId: "", from: todayIso(), primary: false });
  }, [open, reset]);

  const submit = handleSubmit(async (values) => {
    try {
      await assign.mutateAsync(toAssignUnitInput(values));
      toast.success("Posting added");
      onOpenChange(false);
    } catch (error) {
      const problem = problemOf(error);
      let firstInvalid = false;
      for (const [field, message] of Object.entries(fieldErrorsOf(error))) {
        if (field === "unitId" || field === "from" || field === "primary") {
          setError(field, { type: "server", message });
          firstInvalid = true;
        }
      }
      if (!firstInvalid) {
        toast.error(problem.message ?? "Could not add the posting");
      }
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add posting</DialogTitle>
          <DialogDescription>
            Postings are history. A new primary posting ends the current
            primary posting as of today; other postings remain open.
          </DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="posting-unit">Unit</Label>
            <Controller
              control={control}
              name="unitId"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={activeUnits.length === 0}
                >
                  <SelectTrigger
                    id="posting-unit"
                    className="w-full"
                    aria-invalid={Boolean(errors.unitId)}
                  >
                    <SelectValue placeholder="Choose a unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeUnits.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {unit.name} ({unit.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError message={errors.unitId?.message} />
            {activeUnits.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No active units are available. Create a unit in Organization
                units first.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="posting-from">Start date</Label>
            <Input
              id="posting-from"
              type="date"
              aria-invalid={Boolean(errors.from)}
              {...register("from")}
            />
            <FieldError message={errors.from?.message} />
          </div>

          <div className="flex items-center gap-2">
            <Controller
              control={control}
              name="primary"
              render={({ field }) => (
                <Checkbox
                  id="posting-primary"
                  checked={field.value}
                  onCheckedChange={(checked) =>
                    field.onChange(checked === true)
                  }
                />
              )}
            />
            <Label htmlFor="posting-primary">Primary posting</Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={assign.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={assign.isPending || activeUnits.length === 0}
            >
              {assign.isPending ? (
                <Loader2 aria-hidden="true" className="animate-spin" />
              ) : (
                <Plus aria-hidden="true" />
              )}
              Add posting
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
