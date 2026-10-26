import { describe, expect, it } from "vitest";
import { firstAdminStaffSchema, toOnboardStaffInput } from "./staff";

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
