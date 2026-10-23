"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Info, Loader2, Save } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useCan } from "@/features/identity/hooks/use-session";
import { fieldErrorsOf, problemOf } from "@/lib/http";
import { useConfigureSequence, useSequences } from "../hooks/use-configuration";
import {
  isRequiredSequenceType,
  isSequenceFormField,
  nextNumberPreview,
  sequenceSchema,
  sequenceToFormValues,
  toConfigureSequenceInput,
  type SequenceFormValues,
} from "../schemas/sequence";
import {
  REQUIRED_SEQUENCE_TYPES,
  SEQUENCE_RESET_POLICY_OPTIONS,
  SEQUENCE_TYPE_LABELS,
  type SequenceView,
} from "../types";

// Sequence editor (blueprint 8.6). One card per SequenceType: the
// backend returns every type, so missing formats are visible work rather
// than a 404. `nextValue` is read-only — minting is a backend concern.

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-sm text-destructive">
      {message}
    </p>
  );
}

function SequenceRow({
  sequence,
  canManage,
}: {
  sequence: SequenceView;
  canManage: boolean;
}) {
  const configure = useConfigureSequence();
  const {
    register,
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<SequenceFormValues>({
    resolver: zodResolver(sequenceSchema),
    defaultValues: sequenceToFormValues(sequence),
    mode: "onTouched",
  });

  const pending = isSubmitting || configure.isPending;
  const required = isRequiredSequenceType(sequence.type);
  const preview = sequence.configured ? nextNumberPreview(sequence) : null;
  // An unconfigured row must be saveable with the schema defaults; a
  // configured row only saves after an actual change.
  const saveDisabled = pending || (sequence.configured && !isDirty);

  const submit = handleSubmit(async (values) => {
    try {
      await configure.mutateAsync(toConfigureSequenceInput(values));
      reset(values);
      toast.success(`${SEQUENCE_TYPE_LABELS[sequence.type]} saved`);
    } catch (error) {
      const problem = problemOf(error);
      let firstInvalid: string | null = null;

      for (const [field, message] of Object.entries(fieldErrorsOf(error))) {
        if (isSequenceFormField(field)) {
          setError(field, { type: "server", message });
          firstInvalid ??= field;
        }
      }

      if (firstInvalid) {
        toast.error("Check the highlighted fields");
      } else {
        toast.error(problem.message ?? "Could not save the sequence");
      }
    }
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              {SEQUENCE_TYPE_LABELS[sequence.type]}
              <span className="font-mono text-xs font-normal text-muted-foreground">
                {sequence.type}
              </span>
              {required && <Badge variant="secondary">Required for go-live</Badge>}
            </CardTitle>
            <CardDescription>
              {preview
                ? `Next number: ${preview}`
                : "Not configured yet. Saving creates this counter for the current facility."}
            </CardDescription>
          </div>
          <Badge variant={sequence.configured ? "default" : "outline"}>
            {sequence.configured ? "Configured" : "Not configured"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <form noValidate onSubmit={submit} className="space-y-4">
          <input type="hidden" {...register("type")} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor={`sequence-prefix-${sequence.type}`}>Prefix</Label>
              <Input
                id={`sequence-prefix-${sequence.type}`}
                placeholder="e.g. MRN-"
                className="font-mono"
                aria-invalid={Boolean(errors.prefix)}
                disabled={!canManage || pending}
                {...register("prefix")}
              />
              <FieldError message={errors.prefix?.message} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`sequence-start-${sequence.type}`}>Start value</Label>
              <Input
                id={`sequence-start-${sequence.type}`}
                type="number"
                min={1}
                step={1}
                aria-invalid={Boolean(errors.startValue)}
                disabled={!canManage || pending}
                {...register("startValue", { valueAsNumber: true })}
              />
              <p className="text-xs text-muted-foreground">
                Never rewinds below numbers already issued.
              </p>
              <FieldError message={errors.startValue?.message} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`sequence-padding-${sequence.type}`}>Padding</Label>
              <Input
                id={`sequence-padding-${sequence.type}`}
                type="number"
                min={1}
                max={10}
                step={1}
                aria-invalid={Boolean(errors.padding)}
                disabled={!canManage || pending}
                {...register("padding", { valueAsNumber: true })}
              />
              <p className="text-xs text-muted-foreground">Digits, 1–10.</p>
              <FieldError message={errors.padding?.message} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`sequence-reset-${sequence.type}`}>Reset</Label>
              <Controller
                control={control}
                name="resetPolicy"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={!canManage || pending}
                  >
                    <SelectTrigger
                      id={`sequence-reset-${sequence.type}`}
                      className="w-full"
                      aria-invalid={Boolean(errors.resetPolicy)}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SEQUENCE_RESET_POLICY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError message={errors.resetPolicy?.message} />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {sequence.configured
                ? sequence.resetPolicy === "NEVER"
                  ? "This counter never resets."
                  : `Current period: ${sequence.currentPeriod ?? "not started yet"}`
                : "Defaults are a starting point; adjust the prefix to match your filing."}
            </p>
            {canManage ? (
              <Button type="submit" disabled={saveDisabled}>
                {pending ? (
                  <Loader2 aria-hidden="true" className="animate-spin" />
                ) : (
                  <Save aria-hidden="true" />
                )}
                {pending ? "Saving…" : "Save"}
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">
                Read-only: CONFIG_SEQUENCE_MANAGE is required to edit.
              </p>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function SequenceSettings() {
  const canManage = useCan("CONFIG_SEQUENCE_MANAGE");
  const query = useSequences();

  if (query.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Could not load the sequences</CardTitle>
          <CardDescription>
            {problemOf(query.error).message ?? "The sequence catalogue is unavailable."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const configuredRequired = query.data.filter(
    (sequence) =>
      isRequiredSequenceType(sequence.type) && sequence.configured,
  ).length;

  return (
    <div className="space-y-4">
      <Alert>
        <Info aria-hidden="true" />
        <AlertTitle className="flex flex-wrap items-center gap-2">
          Required number formats
          <Badge variant={configuredRequired === REQUIRED_SEQUENCE_TYPES.length ? "default" : "secondary"}>
            {configuredRequired}/{REQUIRED_SEQUENCE_TYPES.length} configured
          </Badge>
        </AlertTitle>
        <AlertDescription>
          Medical record, visit, invoice and receipt numbers must be configured before
          go-live. Accession and staff numbers can be set up now or later.
        </AlertDescription>
      </Alert>

      <div className="space-y-3">
        {query.data.map((sequence) => (
          <SequenceRow
            key={sequence.type}
            sequence={sequence}
            canManage={canManage}
          />
        ))}
      </div>
    </div>
  );
}
