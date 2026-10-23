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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateUnit, useUpdateUnit } from "../hooks/use-facilities";
import {
  EMPTY_UNIT_FORM,
  isUnitFormField,
  toUnitInput,
  unitSchema,
  unitToFormValues,
  type UnitFormValues,
} from "../schemas/unit";
import {
  UNIT_TYPE_OPTIONS,
  type UnitView,
} from "../types";
import { fieldErrorsOf, problemOf } from "@/lib/http";

const NO_PARENT = "__none__";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-sm text-destructive">
      {message}
    </p>
  );
}

export function UnitDialog({
  mode,
  unit,
  units,
  open,
  onOpenChange,
}: {
  mode: "create" | "edit";
  unit?: UnitView;
  units: UnitView[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const create = useCreateUnit();
  const update = useUpdateUnit();
  const editing = mode === "edit" && unit !== undefined;
  const pending = create.isPending || update.isPending;

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<UnitFormValues>({
    resolver: zodResolver(unitSchema),
    defaultValues: EMPTY_UNIT_FORM,
    mode: "onTouched",
  });

  useEffect(() => {
    if (!open) return;
    reset(editing ? unitToFormValues(unit) : EMPTY_UNIT_FORM);
  }, [editing, open, reset, unit]);

  const parentUnit = unit?.parentUnitId
    ? units.find((candidate) => candidate.id === unit.parentUnitId)
    : undefined;
  const parentOptions = units.filter((candidate) => candidate.active);

  const submit = handleSubmit(async (values) => {
    try {
      if (editing) {
        await update.mutateAsync({ unitId: unit.id, input: toUnitInput(values) });
        toast.success("Unit updated");
      } else {
        await create.mutateAsync(toUnitInput(values));
        toast.success("Unit created");
      }
      onOpenChange(false);
    } catch (error) {
      const problem = problemOf(error);
      let firstInvalid = false;

      for (const [field, message] of Object.entries(fieldErrorsOf(error))) {
        if (isUnitFormField(field)) {
          setError(field, { type: "server", message });
          firstInvalid = true;
        }
      }

      if ((problem.message ?? "").toLowerCase().includes("unit code exists")) {
        setError("code", {
          type: "server",
          message: problem.message ?? "This unit code already exists.",
        });
        firstInvalid = true;
      }

      if (!firstInvalid) {
        toast.error(problem.message ?? "Could not save the unit");
      }
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Rename unit" : "Add unit"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Update the code, name or kind. The parent and active state are preserved."
              : "Create a department, clinic, ward or other organizational unit."}
          </DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="unit-code">Unit code</Label>
              <Input
                id="unit-code"
                autoComplete="off"
                placeholder="e.g. OPD"
                className="font-mono uppercase"
                aria-invalid={Boolean(errors.code)}
                {...register("code")}
              />
              <FieldError message={errors.code?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="unit-name">Unit name</Label>
              <Input
                id="unit-name"
                placeholder="e.g. Outpatient Department"
                aria-invalid={Boolean(errors.name)}
                {...register("name")}
              />
              <FieldError message={errors.name?.message} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="unit-type">Unit kind</Label>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="unit-type"
                    className="w-full"
                    aria-invalid={Boolean(errors.type)}
                  >
                    <SelectValue placeholder="Choose a unit kind" />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError message={errors.type?.message} />
          </div>

          {editing ? (
            <div className="space-y-1.5">
              <Label>Parent unit</Label>
              <Input
                value={parentUnit ? `${parentUnit.name} (${parentUnit.code})` : "Top level"}
                readOnly
                disabled
              />
              <p className="text-xs text-muted-foreground">
                Parent changes are not supported by the rename endpoint yet.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="unit-parent">Parent unit</Label>
              <Controller
                control={control}
                name="parentUnitId"
                render={({ field }) => (
                  <Select
                    value={field.value ?? NO_PARENT}
                    onValueChange={(value) =>
                      field.onChange(value === NO_PARENT ? null : value)
                    }
                  >
                    <SelectTrigger id="unit-parent" className="w-full">
                      <SelectValue placeholder="Top level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_PARENT}>Top level</SelectItem>
                      {parentOptions.map((candidate) => (
                        <SelectItem key={candidate.id} value={candidate.id}>
                          {candidate.name} ({candidate.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <p className="text-xs text-muted-foreground">
                Optional. A parent groups units into a tree; the unit stays scoped to
                this facility.
              </p>
              <FieldError message={errors.parentUnitId?.message} />
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending || isSubmitting}>
              {pending && <Loader2 aria-hidden="true" className="animate-spin" />}
              {pending ? "Saving…" : editing ? "Save changes" : "Create unit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
