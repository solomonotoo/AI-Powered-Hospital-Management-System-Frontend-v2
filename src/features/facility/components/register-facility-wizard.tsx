"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import {
  Controller,
  useForm,
  type FieldErrors,
  type FieldPath,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FACILITY_OWNERSHIP_OPTIONS,
  FACILITY_OWNERSHIP_LABELS,
  FACILITY_TYPE_OPTIONS,
  FACILITY_TYPE_LABELS,
} from "@/features/facility/types";
import { useRegisterFacility } from "@/features/facility/hooks/use-facilities";
import {
  facilitySchema,
  isFacilityFormField,
  toRegisterFacilityInput,
  type FacilityFormValues,
} from "@/features/facility/schemas/facility";
import { fieldErrorsOf, problemOf } from "@/lib/http";
import { cn } from "@/lib/utils";

// Blueprint registration wizard: profile -> location -> licence ->
// review. A wizard (not one long form) because Day-0 operators are
// entering regulatory data; grouping prevents the licence fields from
// being skipped silently.
//
// The backend creates the facility in PROVISIONING and applies the
// standard unit template. Nothing here sends a status: lifecycle is a
// separate, audited command.

const STEPS: Array<{
  title: string;
  description: string;
  fields: FieldPath<FacilityFormValues>[];
}> = [
  {
    title: "Profile",
    description: "Identity and ownership",
    fields: ["code", "name", "type", "ownership", "timezone"],
  },
  {
    title: "Location",
    description: "Address and contacts",
    fields: [
      "region",
      "district",
      "addressLine1",
      "addressLine2",
      "addressCity",
      "addressCountry",
      "contactPhone",
      "contactEmail",
    ],
  },
  {
    title: "Licence",
    description: "Regulatory identifiers",
    fields: ["licenceNumber", "licenceBody", "nhiaAccreditationCode"],
  },
  {
    title: "Review",
    description: "Confirm and register",
    fields: [],
  },
];

const DEFAULT_VALUES: FacilityFormValues = {
  code: "",
  name: "",
  type: "DISTRICT_HOSPITAL",
  ownership: "GOVERNMENT",
  timezone: "Africa/Accra",
  region: "",
  district: "",
  addressLine1: "",
  addressLine2: "",
  addressCity: "",
  addressCountry: "Ghana",
  contactPhone: "",
  contactEmail: "",
  licenceNumber: "",
  licenceBody: "",
  nhiaAccreditationCode: "",
};

function stepForField(field: string): number {
  const index = STEPS.findIndex((step) =>
    step.fields.some((candidate) => candidate === field),
  );
  return index === -1 ? 0 : index;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-sm text-destructive">
      {message}
    </p>
  );
}

function ReviewRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="grid gap-0.5 border-b py-2 last:border-b-0 sm:grid-cols-[10rem_1fr] sm:gap-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm break-words">{value && value.length > 0 ? value : "—"}</dd>
    </div>
  );
}

export function RegisterFacilityWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const registerMutation = useRegisterFacility();

  const {
    register,
    control,
    handleSubmit,
    trigger,
    setError,
    reset,
    getValues,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<FacilityFormValues>({
    resolver: zodResolver(facilitySchema),
    defaultValues: DEFAULT_VALUES,
    mode: "onTouched",
  });

  // Only the review step needs the whole model. Reading it on render is
  // enough because entering the step is a state change; no live binding
  // (and no watch()) is required.
  const reviewValues = step === STEPS.length - 1 ? getValues() : undefined;
  const pending = isSubmitting || registerMutation.isPending;

  // Browser-level unsaved-change warning. In-app navigation is not
  // blocked by the App Router; the review step and the disabled submit
  // keep accidental double registration unlikely.
  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  const nextStep = async () => {
    const valid = await trigger(STEPS[step].fields);
    if (valid) setStep((current) => Math.min(current + 1, STEPS.length - 1));
  };

  const submit = handleSubmit(
    async (formValues) => {
      try {
        const facilityId = await registerMutation.mutateAsync(
          toRegisterFacilityInput(formValues),
        );
        reset(formValues);
        toast.success("Facility registered", {
          description: `${formValues.name} is now provisioning. Invite its first administrator next.`,
        });
        router.replace(`/platform/facilities/${facilityId}`);
      } catch (error) {
        const problem = problemOf(error);
        let firstInvalid: string | null = null;

        for (const [field, message] of Object.entries(fieldErrorsOf(error))) {
          if (isFacilityFormField(field)) {
            setError(field, { type: "server", message });
            firstInvalid ??= field;
          }
        }

        if (problem.code === "FACILITY_CODE_EXISTS") {
          setError("code", {
            type: "server",
            message: problem.message ?? "Facility code already registered",
          });
          firstInvalid ??= "code";
        }

        if (firstInvalid) {
          setStep(stepForField(firstInvalid));
          toast.error("Check the highlighted fields");
        } else {
          toast.error(problem.message ?? "Could not register the facility");
        }
      }
    },
    (formErrors: FieldErrors<FacilityFormValues>) => {
      const first = Object.keys(formErrors)[0];
      if (first) setStep(stepForField(first));
      toast.error("Check the highlighted fields");
    },
  );

  // Enter must never skip the review step. Before the last step the
  // form's submit event advances (after validating that step) instead
  // of calling the mutation.
  const onFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (step < STEPS.length - 1) {
      event.preventDefault();
      void nextStep();
      return;
    }
    void submit(event);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Register a facility</CardTitle>
        <CardDescription>
          Creates the facility in Provisioning and applies the standard unit template.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <ol className="grid gap-2 sm:grid-cols-4">
          {STEPS.map((item, index) => {
            const active = index === step;
            const done = index < step;
            return (
              <li
                key={item.title}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "flex items-start gap-2 rounded-lg border p-3",
                  active && "border-primary bg-primary/5",
                  done && "bg-muted/40",
                )}
              >
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                    active && "border-primary bg-primary text-primary-foreground",
                    done && "border-emerald-600 bg-emerald-600 text-white",
                  )}
                >
                  {done ? <Check aria-hidden="true" className="size-3.5" /> : index + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
              </li>
            );
          })}
        </ol>

        <form noValidate onSubmit={onFormSubmit} className="space-y-6">
          {step === 0 && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="code">Facility code</Label>
                  <Input
                    id="code"
                    autoComplete="off"
                    placeholder="e.g. KBTH-01"
                    aria-invalid={Boolean(errors.code)}
                    {...register("code")}
                  />
                  <p className="text-xs text-muted-foreground">
                    Unique across the platform. Letters, numbers and symbols, no spaces.
                  </p>
                  <FieldError message={errors.code?.message} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="name">Facility name</Label>
                  <Input
                    id="name"
                    autoComplete="organization"
                    placeholder="e.g. Korle Bu Teaching Hospital"
                    aria-invalid={Boolean(errors.name)}
                    {...register("name")}
                  />
                  <FieldError message={errors.name?.message} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="type">Facility type</Label>
                  <Controller
                    control={control}
                    name="type"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger
                          id="type"
                          className="w-full"
                          aria-invalid={Boolean(errors.type)}
                        >
                          <SelectValue placeholder="Choose a facility type" />
                        </SelectTrigger>
                        <SelectContent>
                          {FACILITY_TYPE_OPTIONS.map((option) => (
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

                <div className="space-y-1.5">
                  <Label htmlFor="ownership">Ownership</Label>
                  <Controller
                    control={control}
                    name="ownership"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger
                          id="ownership"
                          className="w-full"
                          aria-invalid={Boolean(errors.ownership)}
                        >
                          <SelectValue placeholder="Choose ownership" />
                        </SelectTrigger>
                        <SelectContent>
                          {FACILITY_OWNERSHIP_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <FieldError message={errors.ownership?.message} />
                </div>
              </div>

              <div className="space-y-1.5 sm:max-w-xs">
                <Label htmlFor="timezone">Timezone</Label>
                <Input
                  id="timezone"
                  placeholder="Africa/Accra"
                  aria-invalid={Boolean(errors.timezone)}
                  {...register("timezone")}
                />
                <p className="text-xs text-muted-foreground">
                  IANA timezone. The frontend displays Ghana time by default.
                </p>
                <FieldError message={errors.timezone?.message} />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="region">Region</Label>
                  <Input
                    id="region"
                    placeholder="e.g. Greater Accra"
                    aria-invalid={Boolean(errors.region)}
                    {...register("region")}
                  />
                  <FieldError message={errors.region?.message} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="district">District</Label>
                  <Input
                    id="district"
                    placeholder="e.g. Accra Metropolitan"
                    aria-invalid={Boolean(errors.district)}
                    {...register("district")}
                  />
                  <FieldError message={errors.district?.message} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Region and district are free text until the verified GSS reference data is
                wired to this form.
              </p>

              <div className="space-y-1.5">
                <Label htmlFor="addressLine1">Street address</Label>
                <Input
                  id="addressLine1"
                  autoComplete="address-line1"
                  aria-invalid={Boolean(errors.addressLine1)}
                  {...register("addressLine1")}
                />
                <FieldError message={errors.addressLine1?.message} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="addressLine2">Address line 2</Label>
                <Input
                  id="addressLine2"
                  autoComplete="address-line2"
                  aria-invalid={Boolean(errors.addressLine2)}
                  {...register("addressLine2")}
                />
                <FieldError message={errors.addressLine2?.message} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="addressCity">City / town</Label>
                  <Input
                    id="addressCity"
                    autoComplete="address-level2"
                    aria-invalid={Boolean(errors.addressCity)}
                    {...register("addressCity")}
                  />
                  <FieldError message={errors.addressCity?.message} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="addressCountry">Country</Label>
                  <Input
                    id="addressCountry"
                    autoComplete="country-name"
                    aria-invalid={Boolean(errors.addressCountry)}
                    {...register("addressCountry")}
                  />
                  <FieldError message={errors.addressCountry?.message} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="contactPhone">Contact phone</Label>
                  <Input
                    id="contactPhone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="+233..."
                    aria-invalid={Boolean(errors.contactPhone)}
                    {...register("contactPhone")}
                  />
                  <FieldError message={errors.contactPhone?.message} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contactEmail">Contact email</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    autoComplete="email"
                    aria-invalid={Boolean(errors.contactEmail)}
                    {...register("contactEmail")}
                  />
                  <FieldError message={errors.contactEmail?.message} />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <Alert>
                <AlertTitle>Optional now</AlertTitle>
                <AlertDescription>
                  Licence and accreditation details can be completed later by the facility
                  administrator. Enter what is available today.
                </AlertDescription>
              </Alert>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="licenceNumber">Licence number</Label>
                  <Input
                    id="licenceNumber"
                    aria-invalid={Boolean(errors.licenceNumber)}
                    {...register("licenceNumber")}
                  />
                  <FieldError message={errors.licenceNumber?.message} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="licenceBody">Issuing body</Label>
                  <Input
                    id="licenceBody"
                    placeholder="e.g. Health Facilities Regulatory Agency"
                    aria-invalid={Boolean(errors.licenceBody)}
                    {...register("licenceBody")}
                  />
                  <FieldError message={errors.licenceBody?.message} />
                </div>
              </div>

              <div className="space-y-1.5 sm:max-w-md">
                <Label htmlFor="nhiaAccreditationCode">NHIA accreditation code</Label>
                <Input
                  id="nhiaAccreditationCode"
                  aria-invalid={Boolean(errors.nhiaAccreditationCode)}
                  {...register("nhiaAccreditationCode")}
                />
                <FieldError message={errors.nhiaAccreditationCode?.message} />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <dl>
                <ReviewRow label="Facility code" value={reviewValues?.code} />
                <ReviewRow label="Name" value={reviewValues?.name} />
                <ReviewRow
                  label="Type"
                  value={
                    reviewValues
                      ? FACILITY_TYPE_LABELS[reviewValues.type]
                      : undefined
                  }
                />
                <ReviewRow
                  label="Ownership"
                  value={
                    reviewValues
                      ? FACILITY_OWNERSHIP_LABELS[reviewValues.ownership]
                      : undefined
                  }
                />
                <ReviewRow label="Timezone" value={reviewValues?.timezone} />
                <ReviewRow label="Region" value={reviewValues?.region} />
                <ReviewRow label="District" value={reviewValues?.district} />
                <ReviewRow
                  label="Address"
                  value={[
                    reviewValues?.addressLine1 ?? "",
                    reviewValues?.addressLine2 ?? "",
                    reviewValues?.addressCity ?? "",
                    reviewValues?.addressCountry ?? "",
                  ]
                    .filter((part) => part.trim().length > 0)
                    .join(", ")}
                />
                <ReviewRow
                  label="Contact"
                  value={[
                    reviewValues?.contactPhone ?? "",
                    reviewValues?.contactEmail ?? "",
                  ]
                    .filter((part) => part.trim().length > 0)
                    .join(" · ")}
                />
                <ReviewRow
                  label="Licence number"
                  value={reviewValues?.licenceNumber}
                />
                <ReviewRow
                  label="Issuing body"
                  value={reviewValues?.licenceBody}
                />
                <ReviewRow
                  label="NHIA accreditation"
                  value={reviewValues?.nhiaAccreditationCode}
                />
              </dl>

              <Alert>
                <AlertTitle>What happens next</AlertTitle>
                <AlertDescription>
                  The facility is created in Provisioning with the standard unit template.
                  Go to the facility page to invite its first administrator. Go-live stays
                  blocked until the readiness checklist passes.
                </AlertDescription>
              </Alert>
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="outline"
              disabled={step === 0 || pending}
              onClick={() => setStep((current) => Math.max(0, current - 1))}
            >
              <ArrowLeft aria-hidden="true" />
              Back
            </Button>

            {step < STEPS.length - 1 ? (
              <Button type="button" onClick={nextStep} disabled={pending}>
                Next
                <ArrowRight aria-hidden="true" />
              </Button>
            ) : (
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 aria-hidden="true" className="animate-spin" />}
                {pending ? "Registering…" : "Register facility"}
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
