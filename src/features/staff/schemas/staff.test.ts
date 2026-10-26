import { describe, expect, it } from "vitest";
import {
  changeEmploymentStatusSchema,
  firstAdminStaffSchema,
  isBlankLicence,
  staffRegistrationSchema,
  toFullOnboardStaffInput,
  toOnboardStaffInput,
  toUpdateStaffInput,
} from "./staff";

const validValues = {
  firstName: "Ama",
  lastName: "Mensah",
  sex: "FEMALE" as const,
  dateOfBirth: "1990-01-01",
  phone: "0241234567",
  email: "",
  specialty: "",
};

describe("firstAdminStaffSchema", () => {
  it("accepts a complete first-administrator profile", () => {
    expect(firstAdminStaffSchema.safeParse(validValues).success).toBe(true);
  });

  it("requires the identity fields and a valid Ghana phone number", () => {
    const result = firstAdminStaffSchema.safeParse({
      ...validValues,
      firstName: "",
      sex: undefined,
      phone: "12345",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.issues.map((issue) => issue.path[0]);
      expect(fields).toEqual(expect.arrayContaining(["firstName", "sex", "phone"]));
    }
  });

  it("rejects an impossible or future date of birth", () => {
    expect(
      firstAdminStaffSchema.safeParse({
        ...validValues,
        dateOfBirth: "1990-02-30",
      }).success,
    ).toBe(false);

    expect(
      firstAdminStaffSchema.safeParse({
        ...validValues,
        dateOfBirth: "2999-01-01",
      }).success,
    ).toBe(false);
  });

  it("rejects an invalid email when one is supplied", () => {
    expect(
      firstAdminStaffSchema.safeParse({
        ...validValues,
        email: "not-an-email",
      }).success,
    ).toBe(false);
  });

  it("maps optional blanks to null and forces the administrator category", () => {
    const values = firstAdminStaffSchema.parse(validValues);

    expect(toOnboardStaffInput(values)).toMatchObject({
      firstName: "Ama",
      lastName: "Mensah",
      email: null,
      specialty: null,
      category: "ADMINISTRATOR",
      licences: [],
    });
  });
});

const registrationValues = {
  firstName: "Ama",
  lastName: "Mensah",
  maidenName: "",
  sex: "FEMALE" as const,
  dateOfBirth: "1990-01-01",
  phone: "0241234567",
  email: "",
  addressLine1: "",
  addressLine2: "",
  addressCity: "",
  addressCountry: "Ghana",
  specialty: "",
  category: "DOCTOR" as const,
  licences: [
    {
      body: "MDC",
      number: "MDC-123",
      issuedOn: "2020-01-01",
      expiresOn: "2027-01-01",
    },
  ],
  initialUnitId: "",
  initialFrom: "",
  initialPrimary: false,
};

describe("staffRegistrationSchema", () => {
  it("requires a licence for a licensed clinical category", () => {
    const result = staffRegistrationSchema.safeParse({
      ...registrationValues,
      licences: [],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path[0])).toContain(
        "licences",
      );
    }
  });

  it("allows a non-licensed category without a licence", () => {
    expect(
      staffRegistrationSchema.safeParse({
        ...registrationValues,
        category: "RECORDS_OFFICER",
        licences: [],
      }).success,
    ).toBe(true);
  });

  it("recognises and drops a blank optional licence row", () => {
    const blank = {
      body: "",
      number: "",
      issuedOn: "",
      expiresOn: "",
    };
    expect(isBlankLicence(blank)).toBe(true);
    expect(
      toFullOnboardStaffInput({
        ...registrationValues,
        category: "RECORDS_OFFICER",
        licences: [blank],
      }).licences,
    ).toEqual([]);
  });

  it("rejects a licence that expires before it was issued", () => {
    expect(
      staffRegistrationSchema.safeParse({
        ...registrationValues,
        licences: [
          {
            body: "MDC",
            number: "MDC-123",
            issuedOn: "2027-01-01",
            expiresOn: "2020-01-01",
          },
        ],
      }).success,
    ).toBe(false);
  });

  it("requires a start date when an initial posting unit is chosen", () => {
    expect(
      staffRegistrationSchema.safeParse({
        ...registrationValues,
        initialUnitId: "unit-1",
        initialFrom: "",
      }).success,
    ).toBe(false);
  });
});

describe("staff profile and status forms", () => {
  it("maps optional profile blanks to null", () => {
    const values = staffRegistrationSchema.parse({
      ...registrationValues,
      email: "",
      addressLine1: "",
      specialty: "",
    });

    expect(
      toUpdateStaffInput({
        firstName: values.firstName,
        lastName: values.lastName,
        maidenName: values.maidenName,
        sex: values.sex,
        dateOfBirth: values.dateOfBirth,
        phone: values.phone,
        email: values.email,
        addressLine1: values.addressLine1,
        addressLine2: values.addressLine2,
        addressCity: values.addressCity,
        addressCountry: values.addressCountry,
        specialty: values.specialty,
      }),
    ).toMatchObject({
      email: null,
      addressLine1: null,
      specialty: null,
    });
  });

  it("requires a reason when employment status changes", () => {
    expect(
      changeEmploymentStatusSchema.safeParse({ status: "SUSPENDED", reason: "" })
        .success,
    ).toBe(false);
    expect(
      changeEmploymentStatusSchema.safeParse({
        status: "SUSPENDED",
        reason: "Pending investigation",
      }).success,
    ).toBe(true);
  });
});
