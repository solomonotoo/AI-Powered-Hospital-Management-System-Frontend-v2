"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Plus,
  Trash2,
  UserRoundPlus,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Controller,
  useFieldArray,
  useForm,
  useWatch,
} from "react-hook-form";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrentFacilityUnits } from "@/features/facility/hooks/use-facilities";
import { useCan } from "@/features/identity/hooks/use-session";
import { useQueryClient } from "@tanstack/react-query";
import { fieldErrorsOf, problemOf } from "@/lib/http";
import { assignStaffUnit } from "../api/staff";
import {
  emptyLicence,
  emptyStaffRegistration,
  isBlankLicence,
  STAFF_REGISTRATION_STEPS,
  STAFF_REGISTRATION_STEP_FIELDS,
  staffRegistrationSchema,
  toFullOnboardStaffInput,
  type StaffRegistrationFormValues,
} from "../schemas/staff";
import { staffQueryKeys, useOnboardStaff } from "../hooks/use-staff";
import {
  STAFF_CATEGORY_LABELS,
  STAFF_CATEGORY_OPTIONS,
  STAFF_LICENCE_REQUIRED_CATEGORIES,
  STAFF_SEX_OPTIONS,
  type StaffCategory,
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
 * Multi-step staff registration (blueprint 8.7). The wizard keeps a
 * client-side draft and posts the whole form once; the optional first
 * posting is a second call because the staff id only exists after
 * onboarding succeeds. If that second call fails, the created record is
 * kept and the UI offers the record rather than risking a duplicate.
 */
export function StaffRegistrationForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const create = useOnboardStaff();
  const canReadFacility = useCan("FACILITY_READ");
  const units = useCurrentFacilityUnits(canReadFacility);
  const [step, setStep] = useState(0);
  const [createdStaffId, setCreatedStaffId] = useState<string | null>(null);
  const [postingPending, setPostingPending] = useState(false);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);

  const {
    control,
    register,
    handleSubmit,
    trigger,
    getValues,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<StaffRegistrationFormValues>({
    resolver: zodResolver(staffRegistrationSchema),
    defaultValues: emptyStaffRegistration(),
    mode: "onTouched",
  });

  const licenceFields = useFieldArray({ control, name: "licences" });
  const category = useWatch({ control, name: "category" });
  const initialUnitId = useWatch({ control, name: "initialUnitId" });
  const licences = useWatch({ control, name: "licences" });
  const firstName = useWatch({ control, name: "firstName" });
  const lastName = useWatch({ control, name: "lastName" });
  const requiresLicence = STAFF_LICENCE_REQUIRED_CATEGORIES.has(category);
  const pending = create.isPending || postingPending || isSubmitting;

  useEffect(() => {
    if (requiresLicence) return;
    const current = getValues("licences");
    if (current.length > 0 && current.every(isBlankLicence)) {
      setValue("licences", [], { shouldValidate: false });
    }
  }, [category, requiresLicence, getValues, setValue]);

  const next = async () => {
    if (step === 1) {
      // A blank optional licence row must not block a non-clinical category.
      const current = getValues("licences");
      const cleaned = current.filter((licence) => !isBlankLicence(licence));
      if (cleaned.length !== current.length) {
        setValue("licences", cleaned, { shouldValidate: false });
      }
    }
    const fields = STAFF_REGISTRATION_STEP_FIELDS[step] as Array<
      keyof StaffRegistrationFormValues
    >;
    const valid = await trigger(fields);
    if (valid) setStep((current) => Math.min(current + 1, 2));
  };

  const submit = handleSubmit(async (values) => {
    setAssignmentError(null);
    let staffId = createdStaffId;

    try {
      if (!staffId) {
        staffId = await create.mutateAsync(toFullOnboardStaffInput(values));
        setCreatedStaffId(staffId);
      }

      if (values.initialUnitId) {
        setPostingPending(true);
        try {
          await assignStaffUnit(staffId, {
            unitId: values.initialUnitId,
            from: values.initialFrom,
            primary: values.initialPrimary,
          });
          await queryClient.invalidateQueries({
            queryKey: staffQueryKeys.detail(staffId),
          });
          await queryClient.invalidateQueries({ queryKey: staffQueryKeys.all });
        } catch (error) {
          const message =
            problemOf(error).message ??
            "The staff record was created, but the first posting failed.";
          setAssignmentError(message);
          toast.error("Staff registered; posting needs attention");
          return;
        } finally {
          setPostingPending(false);
        }
      }

      toast.success("Staff registered");
      router.push(`/admin/staff/${staffId}`);
    } catch (error) {
      const problem = problemOf(error);
      let firstInvalid = false;
      for (const [field, message] of Object.entries(fieldErrorsOf(error))) {
        if (field in emptyStaffRegistration()) {
          setError(field as keyof StaffRegistrationFormValues, {
            type: "server",
            message,
          });
          firstInvalid = true;
        }
      }
      if (!firstInvalid) {
        toast.error(problem.message ?? "Could not register staff");
      }
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserRoundPlus aria-hidden="true" className="size-4" />
          Register staff
        </CardTitle>
        <CardDescription>
          Create the workforce record first. The account link is a separate,
          one-time step on the staff detail screen.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <ol className="grid gap-2 sm:grid-cols-3">
          {STAFF_REGISTRATION_STEPS.map((label, index) => (
            <li
              key={label}
              className={`rounded-lg border px-3 py-2 text-sm ${
                index === step
                  ? "border-primary bg-primary/5 font-medium"
                  : "text-muted-foreground"
              }`}
            >
              <span className="mr-2 font-mono text-xs">{index + 1}.</span>
              {label}
            </li>
          ))}
        </ol>

        <form noValidate onSubmit={submit} className="space-y-5">
          {errors.root?.server?.message && (
            <Alert variant="destructive">
              <AlertTriangle aria-hidden="true" />
              <AlertTitle>Could not register staff</AlertTitle>
              <AlertDescription>{errors.root.server.message}</AlertDescription>
            </Alert>
          )}

          {assignmentError && createdStaffId && (
            <Alert variant="destructive">
              <AlertTriangle aria-hidden="true" />
              <AlertTitle>Staff record created, posting not saved</AlertTitle>
              <AlertDescription>
                <p>{assignmentError}</p>
                <p className="mt-2">
                  Correct the posting below and submit again, or open the
                  record to add it there. The staff record itself already
                  exists and will not be created twice.
                </p>
                <Button asChild variant="outline" size="sm" className="mt-3">
                  <Link href={`/admin/staff/${createdStaffId}`}>
                    Open staff record
                  </Link>
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {step === 0 && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="staff-first-name">First name</Label>
                  <Input
                    id="staff-first-name"
                    autoComplete="given-name"
                    aria-invalid={Boolean(errors.firstName)}
                    {...register("firstName")}
                  />
                  <FieldError message={errors.firstName?.message} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="staff-last-name">Last name</Label>
                  <Input
                    id="staff-last-name"
                    autoComplete="family-name"
                    aria-invalid={Boolean(errors.lastName)}
                    {...register("lastName")}
                  />
                  <FieldError message={errors.lastName?.message} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="staff-maiden-name">Maiden name (optional)</Label>
                  <Input
                    id="staff-maiden-name"
                    autoComplete="off"
                    aria-invalid={Boolean(errors.maidenName)}
                    {...register("maidenName")}
                  />
                  <FieldError message={errors.maidenName?.message} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="staff-sex">Sex</Label>
                  <Controller
                    control={control}
                    name="sex"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger
                          id="staff-sex"
                          className="w-full"
                          aria-invalid={Boolean(errors.sex)}
                        >
                          <SelectValue placeholder="Choose sex" />
                        </SelectTrigger>
                        <SelectContent>
                          {STAFF_SEX_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <FieldError message={errors.sex?.message} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="staff-dob">Date of birth</Label>
                  <Input
                    id="staff-dob"
                    type="date"
                    aria-invalid={Boolean(errors.dateOfBirth)}
                    {...register("dateOfBirth")}
                  />
                  <FieldError message={errors.dateOfBirth?.message} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="staff-phone">Phone</Label>
                  <Input
                    id="staff-phone"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="0241234567"
                    aria-invalid={Boolean(errors.phone)}
                    {...register("phone")}
                  />
                  <FieldError message={errors.phone?.message} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="staff-email">Email (optional)</Label>
                <Input
                  id="staff-email"
                  type="email"
                  autoComplete="email"
                  aria-invalid={Boolean(errors.email)}
                  {...register("email")}
                />
                <FieldError message={errors.email?.message} />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="staff-category">Category</Label>
                  <Controller
                    control={control}
                    name="category"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={(value) =>
                          field.onChange(value as StaffCategory)
                        }
                      >
                        <SelectTrigger
                          id="staff-category"
                          className="w-full"
                          aria-invalid={Boolean(errors.category)}
                        >
                          <SelectValue placeholder="Choose a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {STAFF_CATEGORY_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <FieldError message={errors.category?.message} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="staff-specialty">Specialty (optional)</Label>
                  <Input
                    id="staff-specialty"
                    aria-invalid={Boolean(errors.specialty)}
                    {...register("specialty")}
                  />
                  <FieldError message={errors.specialty?.message} />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">Licences</p>
                    <p className="text-xs text-muted-foreground">
                      {requiresLicence
                        ? "At least one licence is mandatory for this category."
                        : "Optional for this category. Renewals are appended later."}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => licenceFields.append(emptyLicence())}
                    disabled={licenceFields.fields.length >= 10}
                  >
                    <Plus aria-hidden="true" />
                    Add licence
                  </Button>
                </div>
                <FieldError
                  message={
                    typeof errors.licences?.message === "string"
                      ? errors.licences.message
                      : errors.licences?.root?.message
                  }
                />
                {licenceFields.fields.length === 0 ? (
                  <p className="rounded-lg border border-dashed px-3 py-4 text-sm text-muted-foreground">
                    No licences recorded.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {licenceFields.fields.map((licence, index) => (
                      <div key={licence.id} className="rounded-lg border p-3">
                        <div className="mb-3 flex items-center justify-between">
                          <p className="text-sm font-medium">
                            Licence {index + 1}
                          </p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => licenceFields.remove(index)}
                          >
                            <Trash2 aria-hidden="true" />
                            Remove
                          </Button>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1.5">
                            <Label htmlFor={`licence-body-${index}`}>
                              Licensing body
                            </Label>
                            <Input
                              id={`licence-body-${index}`}
                              placeholder="e.g. MDC"
                              aria-invalid={Boolean(
                                errors.licences?.[index]?.body,
                              )}
                              {...register(`licences.${index}.body`)}
                            />
                            <FieldError
                              message={errors.licences?.[index]?.body?.message}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor={`licence-number-${index}`}>
                              Licence number
                            </Label>
                            <Input
                              id={`licence-number-${index}`}
                              aria-invalid={Boolean(
                                errors.licences?.[index]?.number,
                              )}
                              {...register(`licences.${index}.number`)}
                            />
                            <FieldError
                              message={errors.licences?.[index]?.number?.message}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor={`licence-issued-${index}`}>
                              Issued on
                            </Label>
                            <Input
                              id={`licence-issued-${index}`}
                              type="date"
                              aria-invalid={Boolean(
                                errors.licences?.[index]?.issuedOn,
                              )}
                              {...register(`licences.${index}.issuedOn`)}
                            />
                            <FieldError
                              message={
                                errors.licences?.[index]?.issuedOn?.message
                              }
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor={`licence-expires-${index}`}>
                              Expires on
                            </Label>
                            <Input
                              id={`licence-expires-${index}`}
                              type="date"
                              aria-invalid={Boolean(
                                errors.licences?.[index]?.expiresOn,
                              )}
                              {...register(`licences.${index}.expiresOn`)}
                            />
                            <FieldError
                              message={
                                errors.licences?.[index]?.expiresOn?.message
                              }
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-3 rounded-lg border p-3">
                <div>
                  <p className="font-medium">Initial posting (optional)</p>
                  <p className="text-xs text-muted-foreground">
                    A primary posting moves the current primary assignment to
                    the new unit. You can also add postings from the record
                    later.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="staff-initial-unit">Unit</Label>
                    <Controller
                      control={control}
                      name="initialUnitId"
                      render={({ field }) => (
                        <Select
                          value={field.value || "NONE"}
                          onValueChange={(value) => {
                            const unitId = value === "NONE" ? "" : value;
                            field.onChange(unitId);
                            if (!unitId) {
                              setValue("initialFrom", "", {
                                shouldValidate: true,
                              });
                              setValue("initialPrimary", false, {
                                shouldValidate: true,
                              });
                            }
                          }}
                          disabled={units.isPending}
                        >
                          <SelectTrigger
                            id="staff-initial-unit"
                            className="w-full"
                            aria-invalid={Boolean(errors.initialUnitId)}
                          >
                            <SelectValue placeholder="No initial posting" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NONE">No initial posting</SelectItem>
                            {(units.data ?? [])
                              .filter((unit) => unit.active)
                              .map((unit) => (
                                <SelectItem key={unit.id} value={unit.id}>
                                  {unit.name} ({unit.code})
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <FieldError message={errors.initialUnitId?.message} />
                    {!canReadFacility && (
                      <p className="text-xs text-muted-foreground">
                        The unit list requires facility read access. You can
                        register without a posting and add one later.
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="staff-initial-from">Start date</Label>
                    <Input
                      id="staff-initial-from"
                      type="date"
                      disabled={!initialUnitId}
                      aria-invalid={Boolean(errors.initialFrom)}
                      {...register("initialFrom")}
                    />
                    <FieldError message={errors.initialFrom?.message} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Controller
                    control={control}
                    name="initialPrimary"
                    render={({ field }) => (
                      <Checkbox
                        id="staff-initial-primary"
                        checked={field.value}
                        onCheckedChange={(checked) =>
                          field.onChange(checked === true)
                        }
                        disabled={!initialUnitId}
                      />
                    )}
                  />
                  <Label htmlFor="staff-initial-primary">
                    Make this the primary posting
                  </Label>
                </div>
              </div>

              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <p className="font-medium">Review</p>
                <dl className="mt-2 grid gap-1 text-muted-foreground sm:grid-cols-2">
                  <div>
                    <dt className="inline font-medium text-foreground">Name: </dt>
                    <dd className="inline">
                      {firstName} {lastName}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline font-medium text-foreground">
                      Category:{" "}
                    </dt>
                    <dd className="inline">
                      {STAFF_CATEGORY_LABELS[category] ?? category}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline font-medium text-foreground">
                      Licences:{" "}
                    </dt>
                    <dd className="inline">{licences.length}</dd>
                  </div>
                  <div>
                    <dt className="inline font-medium text-foreground">
                      Initial posting:{" "}
                    </dt>
                    <dd className="inline">
                      {initialUnitId
                        ? (units.data?.find((unit) => unit.id === initialUnitId)
                            ?.name ?? initialUnitId)
                        : "None"}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep((current) => Math.max(0, current - 1))}
              disabled={step === 0 || pending}
            >
              <ArrowLeft aria-hidden="true" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" type="button">
                <Link href="/admin/staff">Cancel</Link>
              </Button>
              {step < 2 ? (
                <Button type="button" onClick={next} disabled={pending}>
                  Next
                  <ArrowRight aria-hidden="true" />
                </Button>
              ) : (
                <Button type="submit" disabled={pending}>
                  {pending ? (
                    <Loader2 aria-hidden="true" className="animate-spin" />
                  ) : (
                    <CheckCircle2 aria-hidden="true" />
                  )}
                  {createdStaffId ? "Retry / finish" : "Register staff"}
                </Button>
              )}
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
