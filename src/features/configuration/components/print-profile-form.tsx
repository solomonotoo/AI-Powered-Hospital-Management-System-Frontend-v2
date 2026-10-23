"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Info, Loader2, Printer, Save } from "lucide-react";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentFacility } from "@/features/facility/hooks/use-facilities";
import type { FacilityView } from "@/features/facility/types";
import { useCan } from "@/features/identity/hooks/use-session";
import { fieldErrorsOf, problemOf } from "@/lib/http";
import { usePrintProfile, useUpdatePrintProfile } from "../hooks/use-configuration";
import {
  isPrintProfileFormField,
  printProfileSchema,
  printProfileToFormValues,
  toUpdatePrintProfileInput,
  type PrintProfileFormValues,
} from "../schemas/print-profile";
import type { PrintProfileView } from "../types";

// Print identity editor (blueprint 8.6). The live preview shows what the
// header/footer will look like on printed documents; the backend remains
// authoritative for the stored values.

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-sm text-destructive">
      {message}
    </p>
  );
}

function PrintPreview({ values }: { values: Partial<PrintProfileFormValues> }) {
  const displayName = values.displayName?.trim() ?? "";
  const addressLine1 = values.addressLine1?.trim() ?? "";
  const addressLine2 = values.addressLine2?.trim() ?? "";
  const addressCity = values.addressCity?.trim() ?? "";
  const addressCountry = values.addressCountry?.trim() ?? "";
  const phone = values.phone?.trim() ?? "";
  const email = values.email?.trim() ?? "";
  const receiptFooter = values.receiptFooter?.trim() ?? "";

  const addressLines = [
    addressLine1,
    addressLine2,
    [addressCity, addressCountry].filter(Boolean).join(", "),
  ].filter((line) => line.trim().length > 0);

  return (
    <Card className="lg:sticky lg:top-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Printer aria-hidden="true" className="size-4" />
          Live preview
        </CardTitle>
        <CardDescription>
          How the header and footer appear on printed documents.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border bg-white p-4 text-slate-900 shadow-sm">
          <div className="flex items-start gap-3 border-b pb-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded border bg-slate-50 text-[10px] font-medium text-slate-500">
              Logo
            </div>
            <div className="min-w-0 space-y-0.5">
              <p className="truncate font-heading text-sm font-semibold">
                {displayName || "Facility name"}
              </p>
              {addressLines.map((line, index) => (
                <p
                  key={`${index}-${line}`}
                  className="truncate text-[11px] text-slate-600"
                >
                  {line}
                </p>
              ))}
              {(phone || email) && (
                <p className="truncate text-[11px] text-slate-600">
                  {[phone, email].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2 py-3">
            <div className="flex items-center justify-between text-[11px] font-medium">
              <span>Receipt preview</span>
              <span className="font-mono text-slate-500">R-000001</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-600">
              <span>Consultation</span>
              <span className="font-mono">GHS 50.00</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between text-[11px] font-semibold">
              <span>Total</span>
              <span className="font-mono">GHS 50.00</span>
            </div>
          </div>

          <p className="border-t pt-2 text-center text-[10px] text-slate-500">
            {receiptFooter || "Receipt footer appears here."}
          </p>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Sample amounts are illustrative; this is not a real receipt. Logo upload
          arrives with the document module, so an existing logo reference is preserved.
        </p>
      </CardContent>
    </Card>
  );
}

function PrintProfileEditor({
  profile,
  facility,
  canUpdate,
}: {
  profile: PrintProfileView;
  facility: Partial<FacilityView>;
  canUpdate: boolean;
}) {
  const update = useUpdatePrintProfile();
  const {
    register,
    handleSubmit,
    setError,
    reset,
    control,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<PrintProfileFormValues>({
    resolver: zodResolver(printProfileSchema),
    defaultValues: printProfileToFormValues(profile, facility),
    mode: "onTouched",
  });

  const pending = isSubmitting || update.isPending;
  const values = useWatch({
    control,
    defaultValue: printProfileToFormValues(profile, facility),
  });
  const saveDisabled = pending || (profile.configured && !isDirty);

  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  const submit = handleSubmit(async (formValues) => {
    try {
      await update.mutateAsync(toUpdatePrintProfileInput(formValues));
      reset(formValues);
      toast.success("Print profile saved");
    } catch (error) {
      const problem = problemOf(error);
      let firstInvalid: string | null = null;

      for (const [field, message] of Object.entries(fieldErrorsOf(error))) {
        if (isPrintProfileFormField(field)) {
          setError(field, { type: "server", message });
          firstInvalid ??= field;
        }
      }

      if (firstInvalid) {
        toast.error("Check the highlighted fields");
      } else {
        toast.error(problem.message ?? "Could not save the print profile");
      }
    }
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle>Print identity</CardTitle>
          <CardDescription>
            This header and footer head every receipt, patient card, label and report.
            Changes are audited as configuration updates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!canUpdate && (
            <Alert className="mb-6">
              <Info aria-hidden="true" />
              <AlertTitle>Read-only</AlertTitle>
              <AlertDescription>
                Editing the print profile requires CONFIG_UPDATE. You can review the
                current values here.
              </AlertDescription>
            </Alert>
          )}

          <form noValidate onSubmit={submit} className="space-y-6">
            <input type="hidden" {...register("logoObjectKey")} />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="print-display-name">Document name</Label>
                <Input
                  id="print-display-name"
                  autoComplete="organization"
                  aria-invalid={Boolean(errors.displayName)}
                  disabled={!canUpdate || pending}
                  {...register("displayName")}
                />
                <p className="text-xs text-muted-foreground">
                  The name printed at the top of every document, usually the facility
                  name.
                </p>
                <FieldError message={errors.displayName?.message} />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="print-address-line1">Street address</Label>
                <Input
                  id="print-address-line1"
                  autoComplete="address-line1"
                  aria-invalid={Boolean(errors.addressLine1)}
                  disabled={!canUpdate || pending}
                  {...register("addressLine1")}
                />
                <FieldError message={errors.addressLine1?.message} />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="print-address-line2">Address line 2</Label>
                <Input
                  id="print-address-line2"
                  autoComplete="address-line2"
                  aria-invalid={Boolean(errors.addressLine2)}
                  disabled={!canUpdate || pending}
                  {...register("addressLine2")}
                />
                <FieldError message={errors.addressLine2?.message} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="print-address-city">City or town</Label>
                <Input
                  id="print-address-city"
                  autoComplete="address-level2"
                  aria-invalid={Boolean(errors.addressCity)}
                  disabled={!canUpdate || pending}
                  {...register("addressCity")}
                />
                <FieldError message={errors.addressCity?.message} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="print-address-country">Country</Label>
                <Input
                  id="print-address-country"
                  autoComplete="country-name"
                  aria-invalid={Boolean(errors.addressCountry)}
                  disabled={!canUpdate || pending}
                  {...register("addressCountry")}
                />
                <FieldError message={errors.addressCountry?.message} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="print-phone">Phone</Label>
                <Input
                  id="print-phone"
                  type="tel"
                  autoComplete="tel"
                  aria-invalid={Boolean(errors.phone)}
                  disabled={!canUpdate || pending}
                  {...register("phone")}
                />
                <FieldError message={errors.phone?.message} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="print-email">Email</Label>
                <Input
                  id="print-email"
                  type="email"
                  autoComplete="email"
                  aria-invalid={Boolean(errors.email)}
                  disabled={!canUpdate || pending}
                  {...register("email")}
                />
                <FieldError message={errors.email?.message} />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="print-receipt-footer">Receipt footer</Label>
                <Textarea
                  id="print-receipt-footer"
                  rows={3}
                  placeholder="e.g. Thank you for choosing our hospital. Keep this receipt for your records."
                  aria-invalid={Boolean(errors.receiptFooter)}
                  disabled={!canUpdate || pending}
                  {...register("receiptFooter")}
                />
                <p className="text-xs text-muted-foreground">
                  A short line printed at the bottom of receipts.
                </p>
                <FieldError message={errors.receiptFooter?.message} />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                {profile.configured
                  ? "Changes apply to documents printed after saving."
                  : "Saving creates this facility's print profile."}
              </p>
              {canUpdate && (
                <Button type="submit" disabled={saveDisabled}>
                  {pending ? (
                    <Loader2 aria-hidden="true" className="animate-spin" />
                  ) : (
                    <Save aria-hidden="true" />
                  )}
                  {pending ? "Saving…" : "Save print profile"}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <PrintPreview values={values} />
    </div>
  );
}

export function PrintProfileForm() {
  const canUpdate = useCan("CONFIG_UPDATE");
  const canReadFacility = useCan("FACILITY_READ");
  const profileQuery = usePrintProfile();
  const facilityQuery = useCurrentFacility(canReadFacility);
  const facilityPending = canReadFacility && facilityQuery.isPending;

  if (profileQuery.isPending || facilityPending) {
    return (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Skeleton className="h-[36rem] w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (profileQuery.isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Could not load the print profile</CardTitle>
          <CardDescription>
            {problemOf(profileQuery.error).message ??
              "The print profile is unavailable."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            disabled={profileQuery.isFetching}
            onClick={() => void profileQuery.refetch()}
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <PrintProfileEditor
      profile={profileQuery.data}
      // The registry is a prefill convenience, not a requirement for
      // viewing the print profile: a CONFIG_READ-only role still gets a
      // usable editor.
      facility={facilityQuery.data ?? {}}
      canUpdate={canUpdate}
    />
  );
}
