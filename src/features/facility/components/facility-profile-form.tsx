"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save } from "lucide-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
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
import { useCurrentFacility, useUpdateCurrentFacility } from "../hooks/use-facilities";
import {
  FACILITY_OWNERSHIP_OPTIONS,
  FACILITY_OWNERSHIP_LABELS,
  FACILITY_TYPE_OPTIONS,
  FACILITY_TYPE_LABELS,
  type FacilityView,
} from "../types";
import {
  facilityProfileSchema,
  facilityToProfileFormValues,
  isFacilityProfileFormField,
  toUpdateFacilityInput,
  type FacilityProfileFormValues,
} from "../schemas/facility";
import { fieldErrorsOf, problemOf } from "@/lib/http";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-sm text-destructive">
      {message}
    </p>
  );
}

function ProfileForm({ facility }: { facility: FacilityView }) {
  const update = useUpdateCurrentFacility();
  const {
    register,
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<FacilityProfileFormValues>({
    resolver: zodResolver(facilityProfileSchema),
    defaultValues: facilityToProfileFormValues(facility),
    mode: "onTouched",
  });

  const pending = isSubmitting || update.isPending;

  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  const submit = handleSubmit(async (values) => {
    try {
      await update.mutateAsync(toUpdateFacilityInput(values));
      reset(values);
      toast.success("Facility profile saved");
    } catch (error) {
      const problem = problemOf(error);
      let firstInvalid: string | null = null;

      for (const [field, message] of Object.entries(fieldErrorsOf(error))) {
        if (isFacilityProfileFormField(field)) {
          setError(field, { type: "server", message });
          firstInvalid ??= field;
        }
      }

      if (firstInvalid) {
        toast.error("Check the highlighted fields");
      } else {
        toast.error(problem.message ?? "Could not save the facility profile");
      }
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Facility profile</CardTitle>
        <CardDescription>
          Registry identity, location, contacts and regulatory details. Changes are
          audited as facility updates.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form noValidate onSubmit={submit} className="space-y-8">
          <section className="space-y-4">
            <div>
              <h2 className="font-heading text-sm font-medium">Identity</h2>
              <p className="text-xs text-muted-foreground">
                The facility code is permanent and owned by the platform registry.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="facility-code">Facility code</Label>
                <Input
                  id="facility-code"
                  value={facility.code}
                  readOnly
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="facility-name">Facility name</Label>
                <Input
                  id="facility-name"
                  autoComplete="organization"
                  aria-invalid={Boolean(errors.name)}
                  {...register("name")}
                />
                <FieldError message={errors.name?.message} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="facility-type">Facility type</Label>
                <Controller
                  control={control}
                  name="type"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        id="facility-type"
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
                <Label htmlFor="facility-ownership">Ownership</Label>
                <Controller
                  control={control}
                  name="ownership"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        id="facility-ownership"
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
              <Label htmlFor="facility-timezone">Timezone</Label>
              <Input
                id="facility-timezone"
                placeholder="Africa/Accra"
                aria-invalid={Boolean(errors.timezone)}
                {...register("timezone")}
              />
              <p className="text-xs text-muted-foreground">
                IANA timezone. The UI displays Ghana time by default.
              </p>
              <FieldError message={errors.timezone?.message} />
            </div>
          </section>

          <section className="space-y-4 border-t pt-6">
            <div>
              <h2 className="font-heading text-sm font-medium">Location</h2>
              <p className="text-xs text-muted-foreground">
                Region and district are free text until verified GSS reference data is
                wired in.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="facility-region">Region</Label>
                <Input
                  id="facility-region"
                  placeholder="e.g. Greater Accra"
                  aria-invalid={Boolean(errors.region)}
                  {...register("region")}
                />
                <FieldError message={errors.region?.message} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="facility-district">District</Label>
                <Input
                  id="facility-district"
                  placeholder="e.g. Accra Metropolitan"
                  aria-invalid={Boolean(errors.district)}
                  {...register("district")}
                />
                <FieldError message={errors.district?.message} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="facility-address-line1">Street address</Label>
              <Input
                id="facility-address-line1"
                autoComplete="address-line1"
                aria-invalid={Boolean(errors.addressLine1)}
                {...register("addressLine1")}
              />
              <FieldError message={errors.addressLine1?.message} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="facility-address-line2">Address line 2</Label>
              <Input
                id="facility-address-line2"
                autoComplete="address-line2"
                aria-invalid={Boolean(errors.addressLine2)}
                {...register("addressLine2")}
              />
              <FieldError message={errors.addressLine2?.message} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="facility-address-city">City / town</Label>
                <Input
                  id="facility-address-city"
                  autoComplete="address-level2"
                  aria-invalid={Boolean(errors.addressCity)}
                  {...register("addressCity")}
                />
                <FieldError message={errors.addressCity?.message} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="facility-address-country">Country</Label>
                <Input
                  id="facility-address-country"
                  autoComplete="country-name"
                  aria-invalid={Boolean(errors.addressCountry)}
                  {...register("addressCountry")}
                />
                <FieldError message={errors.addressCountry?.message} />
              </div>
            </div>
          </section>

          <section className="space-y-4 border-t pt-6">
            <div>
              <h2 className="font-heading text-sm font-medium">Contacts</h2>
              <p className="text-xs text-muted-foreground">
                Facility contact details, not patient information.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="facility-contact-phone">Contact phone</Label>
                <Input
                  id="facility-contact-phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+233..."
                  aria-invalid={Boolean(errors.contactPhone)}
                  {...register("contactPhone")}
                />
                <FieldError message={errors.contactPhone?.message} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="facility-contact-email">Contact email</Label>
                <Input
                  id="facility-contact-email"
                  type="email"
                  autoComplete="email"
                  aria-invalid={Boolean(errors.contactEmail)}
                  {...register("contactEmail")}
                />
                <FieldError message={errors.contactEmail?.message} />
              </div>
            </div>
          </section>

          <section className="space-y-4 border-t pt-6">
            <div>
              <h2 className="font-heading text-sm font-medium">Licence and accreditation</h2>
              <p className="text-xs text-muted-foreground">
                Optional regulatory identifiers; the backend remains authoritative.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="facility-licence-number">Licence number</Label>
                <Input
                  id="facility-licence-number"
                  aria-invalid={Boolean(errors.licenceNumber)}
                  {...register("licenceNumber")}
                />
                <FieldError message={errors.licenceNumber?.message} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="facility-licence-body">Issuing body</Label>
                <Input
                  id="facility-licence-body"
                  placeholder="e.g. Health Facilities Regulatory Agency"
                  aria-invalid={Boolean(errors.licenceBody)}
                  {...register("licenceBody")}
                />
                <FieldError message={errors.licenceBody?.message} />
              </div>
            </div>

            <div className="space-y-1.5 sm:max-w-md">
              <Label htmlFor="facility-nhia">NHIA accreditation code</Label>
              <Input
                id="facility-nhia"
                aria-invalid={Boolean(errors.nhiaAccreditationCode)}
                {...register("nhiaAccreditationCode")}
              />
              <FieldError message={errors.nhiaAccreditationCode?.message} />
            </div>
          </section>

          <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {isDirty
                ? "You have unsaved changes."
                : `Last loaded profile for ${FACILITY_TYPE_LABELS[facility.type] ?? facility.type} · ${FACILITY_OWNERSHIP_LABELS[facility.ownership] ?? facility.ownership}.`}
            </p>
            <Button type="submit" disabled={pending || !isDirty}>
              {pending ? (
                <Loader2 aria-hidden="true" className="animate-spin" />
              ) : (
                <Save aria-hidden="true" />
              )}
              {pending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/**
 * Facility profile editor (blueprint 8.6 /admin/facility). Reads the
 * current facility from the token-scoped endpoint, so a facility admin
 * cannot edit another hospital by changing an id.
 */
export function FacilityProfileForm() {
  const facilityQuery = useCurrentFacility();

  if (facilityQuery.isPending) return <Skeleton className="h-96 w-full" />;

  if (facilityQuery.isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Could not load the facility profile</CardTitle>
          <CardDescription>
            {problemOf(facilityQuery.error).message ??
              "The facility profile is unavailable."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            disabled={facilityQuery.isFetching}
            onClick={() => void facilityQuery.refetch()}
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return <ProfileForm facility={facilityQuery.data} />;
}
