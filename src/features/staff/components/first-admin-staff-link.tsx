"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  BadgeCheck,
  IdCard,
  Loader2,
  RefreshCw,
  UserRoundPlus,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useSequences } from "@/features/configuration/hooks/use-configuration";
import { useSession } from "@/features/identity/hooks/use-session";
import type { Session } from "@/lib/auth-store";
import { fieldErrorsOf, problemOf } from "@/lib/http";
import { getStaff } from "../api/staff";
import { useLinkStaffUser, useOnboardStaff, useStaff } from "../hooks/use-staff";
import {
  firstAdminStaffSchema,
  isFirstAdminStaffFormField,
  toOnboardStaffInput,
  type FirstAdminStaffFormValues,
} from "../schemas/staff";
import {
  STAFF_CATEGORY_LABELS,
  STAFF_SEX_OPTIONS,
  type StaffCategory,
} from "../types";

// First-administrator staff completion (blueprint 8.7 joiner flow).
//
// The invitation creates the FACILITY_ADMIN login before any workforce
// row exists, so the account starts with `staffId = null`. This card
// closes that gap: it creates one ADMINISTRATOR staff record and links
// it to the signed-in account. The backend owns both the staff number
// sequence and the one-time link rule; this screen only sequences the
// two calls and keeps the created id so a failed link never causes a
// duplicate staff row.

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

function categoryLabel(category: StaffCategory): string {
  return STAFF_CATEGORY_LABELS[category] ?? category;
}

/** Linked state: the account has a staff record; confirm it reads back. */
function LinkedStaffCard({ staffId }: { staffId: string }) {
  const staff = useStaff(staffId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BadgeCheck aria-hidden="true" className="size-4 text-emerald-600" />
          Workforce profile linked
        </CardTitle>
        <CardDescription>
          Your login is linked to a staff record, so clinical and administrative
          actions are attributed to you.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {staff.isPending ? (
          <Skeleton className="h-16 w-full" />
        ) : staff.isError ? (
          <div className="space-y-3">
            <p className="text-sm text-destructive">
              {problemOf(staff.error).message ??
                "The linked staff record could not be loaded."}
            </p>
            <Button
              variant="outline"
              size="sm"
              disabled={staff.isFetching}
              onClick={() => void staff.refetch()}
            >
              <RefreshCw aria-hidden="true" />
              Retry
            </Button>
          </div>
        ) : (
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Name</dt>
              <dd className="font-medium">{staff.data.displayName}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Staff number</dt>
              <dd className="font-mono">{staff.data.staffNumber}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Category</dt>
              <dd>{categoryLabel(staff.data.category)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Employment status</dt>
              <dd>{staff.data.employmentStatus}</dd>
            </div>
          </dl>
        )}
      </CardContent>
    </Card>
  );
}

function CompleteStaffProfileCard({ session }: { session: Session }) {
  const canRegister = session.permissions.includes("STAFF_REGISTER");
  const canLink = session.permissions.includes("STAFF_UPDATE");
  const canReadConfig = session.permissions.includes("CONFIG_READ");

  const onboard = useOnboardStaff();
  const link = useLinkStaffUser();
  const sessionQuery = useSession();
  const sequences = useSequences(canReadConfig);
  const [createdStaffId, setCreatedStaffId] = useState<string | null>(null);
  const [linkReconciled, setLinkReconciled] = useState(false);

  const emailPrefill = session.username.includes("@") ? session.username : "";

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<FirstAdminStaffFormValues>({
    resolver: zodResolver(firstAdminStaffSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      // Keep every schema field in defaults; an omitted key makes RHF
      // report the untouched form as dirty.
      sex: undefined,
      dateOfBirth: "",
      phone: "",
      email: emailPrefill,
      specialty: "",
    },
    mode: "onTouched",
  });

  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  const staffNumber = sequences.data?.find(
    (sequence) => sequence.type === "STAFF_NUMBER",
  );
  const sequenceChecking = canReadConfig && sequences.isPending;
  const sequenceUnavailable = canReadConfig && sequences.isError;
  const sequenceReady = !canReadConfig || staffNumber?.configured === true;
  const sequenceBlocked =
    canReadConfig &&
    !sequenceChecking &&
    !sequenceUnavailable &&
    !sequenceReady;

  const pending = isSubmitting || onboard.isPending || link.isPending;
  const linking = link.isPending;
  const linkFailed = link.isError && !linkReconciled;
  const linkRecorded = link.isSuccess || linkReconciled;

  const waitForSessionLink = async (): Promise<boolean> => {
    // The account side is latched by an async modulith event. A short
    // poll lets the card switch to the linked state without a reload;
    // the backend remains authoritative if the poll times out.
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const result = await sessionQuery.refetch();
      if (result.data?.staffId) return true;
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    return false;
  };

  const submit = handleSubmit(async (values) => {
    if (!sequenceReady) {
      toast.error("Configure the staff number sequence first");
      return;
    }

    try {
      let staffId = createdStaffId;
      if (!staffId) {
        staffId = await onboard.mutateAsync(toOnboardStaffInput(values));
        setCreatedStaffId(staffId);
      }

      await link.mutateAsync({ staffId, userId: session.userId });

      if (await waitForSessionLink()) {
        toast.success("Workforce profile created and linked");
      } else {
        toast.message("Link recorded", {
          description:
            "Your session may take a moment to show the staff link. Refresh the page if it still looks unlinked.",
        });
      }
    } catch (error) {
      const problem = problemOf(error);
      let firstInvalid: string | null = null;

      for (const [field, message] of Object.entries(fieldErrorsOf(error))) {
        if (isFirstAdminStaffFormField(field)) {
          setError(field, { type: "server", message });
          firstInvalid ??= field;
        }
      }

      if (firstInvalid) {
        toast.error("Check the highlighted fields");
      } else {
        toast.error(problem.message ?? "Could not complete the staff profile");
      }
    }
  });

  const retryLink = async () => {
    if (!createdStaffId) return;
    try {
      await link.mutateAsync({ staffId: createdStaffId, userId: session.userId });
      if (await waitForSessionLink()) {
        toast.success("Workforce profile linked");
      } else {
        toast.message("Link recorded", {
          description:
            "Your session may take a moment to show the staff link. Refresh the page if it still looks unlinked.",
        });
      }
    } catch (error) {
      const problem = problemOf(error);

      // A retry can arrive after the server committed the one-time link but
      // the response was lost. Read the record back and treat a 409 as
      // success only when it is linked to this same account.
      if (problem.status === 409) {
        try {
          const staff = await getStaff(createdStaffId);
          if (staff.userId === session.userId) {
            setLinkReconciled(true);
            if (await waitForSessionLink()) {
              toast.success("Workforce profile linked");
            } else {
              toast.message("Link recorded", {
                description:
                  "Your session may take a moment to show the staff link. Refresh the page if it still looks unlinked.",
              });
            }
            return;
          }
        } catch {
          // Fall through to the original conflict message.
        }
      }

      toast.error(problem.message ?? "Could not link the staff record");
    }
  };

  const refreshSessionLink = async () => {
    if (await waitForSessionLink()) {
      toast.success("Session updated");
    } else {
      toast.message("Still not reflected", {
        description:
          "The link is saved on the server. Refresh the page in a moment if the card still looks unlinked.",
      });
    }
  };

  if (!canRegister || !canLink) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Staff permissions are not in this session</CardTitle>
          <CardDescription>
            Your login is not linked to a workforce record yet, but this session
            does not include the staff permissions needed to create and link one.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTitle>Sign in again after the role update</AlertTitle>
            <AlertDescription>
              Sign out and sign back in to pick up the updated administrator
              permissions, then return to facility setup.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IdCard aria-hidden="true" className="size-4" />
          Complete your workforce profile
        </CardTitle>
        <CardDescription>
          Your administrator login is not linked to a staff record yet. Create it
          once, then link it to this account so every action is attributed to you.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {createdStaffId ? (
          <div className="space-y-4">
            <Alert variant={linkFailed ? "destructive" : undefined}>
              <AlertTitle>
                {linking
                  ? "Linking the staff record…"
                  : linkFailed
                    ? "Staff record created; link failed"
                    : linkRecorded
                      ? "Link recorded"
                      : "Staff record created"}
              </AlertTitle>
              <AlertDescription>
                {linking
                  ? "The workforce record exists. Attaching it to your login now."
                  : linkFailed
                    ? "The workforce record exists, but linking it to your account did not finish. Retry the link. Do not submit the form again — that would create a second staff record."
                    : linkRecorded
                      ? "The account link is saved. Your session may take a moment to show it."
                      : "The workforce record exists and is ready to link."}
              </AlertDescription>
            </Alert>
            <p className="text-xs text-muted-foreground">
              Staff record{" "}
              <span className="font-mono break-all">{createdStaffId}</span>
            </p>
            {linkFailed && (
              <Button
                type="button"
                disabled={linking}
                onClick={() => void retryLink()}
              >
                {linking ? (
                  <Loader2 aria-hidden="true" className="animate-spin" />
                ) : (
                  <RefreshCw aria-hidden="true" />
                )}
                {linking ? "Linking…" : "Retry link"}
              </Button>
            )}
            {linkRecorded && (
              <Button
                type="button"
                variant="outline"
                onClick={() => void refreshSessionLink()}
              >
                <RefreshCw aria-hidden="true" />
                Refresh session
              </Button>
            )}
          </div>
        ) : (
          <>
            {sequenceChecking && (
              <p className="text-sm text-muted-foreground">
                Checking the staff number format…
              </p>
            )}

            {sequenceUnavailable && (
              <Alert variant="destructive">
                <AlertTitle>Could not verify the staff number format</AlertTitle>
                <AlertDescription className="space-y-2">
                  <p>
                    Onboarding mints a staff number, so the sequence must be
                    readable before a record can be created.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={sequences.isFetching}
                    onClick={() => void sequences.refetch()}
                  >
                    <RefreshCw aria-hidden="true" />
                    Retry check
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {sequenceBlocked && (
              <Alert>
                <AlertTitle>Staff number sequence is not configured</AlertTitle>
                <AlertDescription className="space-y-2">
                  <p>
                    Creating a staff record mints a staff number. Configure the
                    STAFF_NUMBER sequence first, then return to this card.
                  </p>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/admin/setup/sequences">
                      Configure number sequences
                    </Link>
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            <form noValidate onSubmit={submit} className="space-y-4">
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
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
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
                          <SelectValue placeholder="Choose a sex" />
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
                  <Label htmlFor="staff-date-of-birth">Date of birth</Label>
                  <Input
                    id="staff-date-of-birth"
                    type="date"
                    max={todayIso()}
                    aria-invalid={Boolean(errors.dateOfBirth)}
                    {...register("dateOfBirth")}
                  />
                  <FieldError message={errors.dateOfBirth?.message} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="staff-phone">Phone</Label>
                  <Input
                    id="staff-phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="0241234567"
                    aria-invalid={Boolean(errors.phone)}
                    {...register("phone")}
                  />
                  <p className="text-xs text-muted-foreground">
                    Ghana numbers may be entered as 024…, 233… or +233….
                  </p>
                  <FieldError message={errors.phone?.message} />
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
                  <p className="text-xs text-muted-foreground">
                    Prefilled from your login; change it if the workforce contact
                    address is different.
                  </p>
                  <FieldError message={errors.email?.message} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="staff-specialty">Specialty (optional)</Label>
                <Input
                  id="staff-specialty"
                  placeholder="e.g. Hospital administration"
                  aria-invalid={Boolean(errors.specialty)}
                  {...register("specialty")}
                />
                <FieldError message={errors.specialty?.message} />
              </div>

              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-sm font-medium">Category: Administrator</p>
                <p className="text-xs text-muted-foreground">
                  The bootstrap account is registered as an administrator. The full
                  staff directory will record clinical categories, licences and
                  unit postings.
                </p>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  {isDirty
                    ? "You have unsaved changes."
                    : "The record is created once; the link step attaches it to this login."}
                </p>
                <Button
                  type="submit"
                  disabled={
                    pending ||
                    sequenceChecking ||
                    sequenceBlocked ||
                    sequenceUnavailable
                  }
                >
                  {pending ? (
                    <Loader2 aria-hidden="true" className="animate-spin" />
                  ) : (
                    <UserRoundPlus aria-hidden="true" />
                  )}
                  {pending ? "Saving…" : "Create and link profile"}
                </Button>
              </div>
            </form>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Setup-page card. Renders only for a STAFF session: the platform tier
 * has no workforce record by design.
 */
export function FirstAdminStaffLink() {
  const { data: session, isPending } = useSession();

  if (isPending) return <Skeleton className="h-40 w-full" />;
  if (!session || session.accountType !== "STAFF") return null;

  if (session.staffId) return <LinkedStaffCard staffId={session.staffId} />;
  return <CompleteStaffProfileCard session={session} />;
}
