"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save } from "lucide-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fieldErrorsOf, problemOf } from "@/lib/http";
import { useUpdateStaff } from "../hooks/use-staff";
import {
  staffProfileSchema,
  toUpdateStaffInput,
  type StaffProfileFormValues,
} from "../schemas/staff";
import {
  STAFF_SEXES,
  STAFF_SEX_OPTIONS,
  type StaffDetailView,
  type StaffSex,
} from "../types";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-sm text-destructive">
      {message}
    </p>
  );
}

function sexOf(value: string): StaffSex {
  return (STAFF_SEXES as readonly string[]).includes(value)
    ? (value as StaffSex)
    : "OTHER";
}

function profileValues(staff: StaffDetailView): StaffProfileFormValues {
  return {
    firstName: staff.firstName,
    lastName: staff.lastName,
    maidenName: staff.maidenName ?? "",
    sex: sexOf(staff.sex),
    dateOfBirth: staff.dateOfBirth,
    phone: staff.phone,
    email: staff.email ?? "",
    addressLine1: staff.addressLine1 ?? "",
    addressLine2: staff.addressLine2 ?? "",
    addressCity: staff.addressCity ?? "",
    addressCountry: staff.addressCountry ?? "",
    specialty: staff.specialty ?? "",
  };
}

/**
 * Profile tab of the staff record. Category is deliberately not editable:
 * changing occupation can alter licence requirements, so it belongs to a
 * separate guarded workflow rather than a casual profile save.
 */
export function StaffProfileForm({ staff }: { staff: StaffDetailView }) {
  const update = useUpdateStaff(staff.id);
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<StaffProfileFormValues>({
    resolver: zodResolver(staffProfileSchema),
    defaultValues: profileValues(staff),
    mode: "onTouched",
  });

  useEffect(() => {
    reset(profileValues(staff));
  }, [reset, staff]);

  const submit = handleSubmit(async (values) => {
    try {
      await update.mutateAsync(toUpdateStaffInput(values));
      toast.success("Staff profile updated");
    } catch (error) {
      const problem = problemOf(error);
      let firstInvalid = false;
      for (const [field, message] of Object.entries(fieldErrorsOf(error))) {
        if (field in profileValues(staff)) {
          setError(field as keyof StaffProfileFormValues, {
            type: "server",
            message,
          });
          firstInvalid = true;
        }
      }
      if (!firstInvalid) {
        toast.error(problem.message ?? "Could not update the profile");
      }
    }
  });

  return (
    <form noValidate onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="profile-first-name">First name</Label>
          <Input
            id="profile-first-name"
            aria-invalid={Boolean(errors.firstName)}
            {...register("firstName")}
          />
          <FieldError message={errors.firstName?.message} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="profile-last-name">Last name</Label>
          <Input
            id="profile-last-name"
            aria-invalid={Boolean(errors.lastName)}
            {...register("lastName")}
          />
          <FieldError message={errors.lastName?.message} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="profile-maiden-name">Maiden name</Label>
          <Input
            id="profile-maiden-name"
            aria-invalid={Boolean(errors.maidenName)}
            {...register("maidenName")}
          />
          <FieldError message={errors.maidenName?.message} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="profile-sex">Sex</Label>
          <Controller
            control={control}
            name="sex"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger
                  id="profile-sex"
                  className="w-full"
                  aria-invalid={Boolean(errors.sex)}
                >
                  <SelectValue />
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
          <Label htmlFor="profile-dob">Date of birth</Label>
          <Input
            id="profile-dob"
            type="date"
            aria-invalid={Boolean(errors.dateOfBirth)}
            {...register("dateOfBirth")}
          />
          <FieldError message={errors.dateOfBirth?.message} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="profile-phone">Phone</Label>
          <Input
            id="profile-phone"
            inputMode="tel"
            aria-invalid={Boolean(errors.phone)}
            {...register("phone")}
          />
          <FieldError message={errors.phone?.message} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="profile-email">Email</Label>
        <Input
          id="profile-email"
          type="email"
          aria-invalid={Boolean(errors.email)}
          {...register("email")}
        />
        <FieldError message={errors.email?.message} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="profile-address1">Address line 1</Label>
          <Input
            id="profile-address1"
            aria-invalid={Boolean(errors.addressLine1)}
            {...register("addressLine1")}
          />
          <FieldError message={errors.addressLine1?.message} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="profile-address2">Address line 2</Label>
          <Input
            id="profile-address2"
            aria-invalid={Boolean(errors.addressLine2)}
            {...register("addressLine2")}
          />
          <FieldError message={errors.addressLine2?.message} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="profile-city">City / town</Label>
          <Input
            id="profile-city"
            aria-invalid={Boolean(errors.addressCity)}
            {...register("addressCity")}
          />
          <FieldError message={errors.addressCity?.message} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="profile-country">Country</Label>
          <Input
            id="profile-country"
            aria-invalid={Boolean(errors.addressCountry)}
            {...register("addressCountry")}
          />
          <FieldError message={errors.addressCountry?.message} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="profile-specialty">Specialty</Label>
        <Input
          id="profile-specialty"
          aria-invalid={Boolean(errors.specialty)}
          {...register("specialty")}
        />
        <FieldError message={errors.specialty?.message} />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={update.isPending}>
          {update.isPending ? (
            <Loader2 aria-hidden="true" className="animate-spin" />
          ) : (
            <Save aria-hidden="true" />
          )}
          Save profile
        </Button>
      </div>
    </form>
  );
}
