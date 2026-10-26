import { describe, expect, it } from "vitest";
import {
  assignRoleSchema,
  groupPermissions,
  inviteUserSchema,
  roleCreateSchema,
  toAssignRoleInput,
} from "./admin";
import type { PermissionView } from "../types/admin";

describe("inviteUserSchema", () => {
  it("requires a valid email address", () => {
    expect(inviteUserSchema.safeParse({ email: "admin@example.test" }).success).toBe(
      true,
    );
    expect(inviteUserSchema.safeParse({ email: "not-an-email" }).success).toBe(
      false,
    );
  });
});

describe("roleCreateSchema", () => {
  it("accepts an upper-snake role code and a name", () => {
    expect(
      roleCreateSchema.safeParse({
        code: "CASHIER_NIGHT",
        name: "Night cashier",
        permissions: ["BILLING_PAYMENT_COLLECT"],
      }).success,
    ).toBe(true);
  });

  it("rejects lower-case or spaced role codes", () => {
    expect(
      roleCreateSchema.safeParse({
        code: "cashier night",
        name: "Night cashier",
        permissions: [],
      }).success,
    ).toBe(false);
  });
});

describe("assignRoleSchema", () => {
  const base = {
    roleCode: "DOCTOR",
    unitId: "",
    validFrom: "",
    validTo: "",
  };

  it("accepts open-ended and bounded assignments", () => {
    expect(assignRoleSchema.safeParse(base).success).toBe(true);
    expect(
      assignRoleSchema.safeParse({
        ...base,
        validFrom: "2026-01-01",
        validTo: "2026-12-31",
      }).success,
    ).toBe(true);
  });

  it("rejects an end date before the start date", () => {
    const result = assignRoleSchema.safeParse({
      ...base,
      validFrom: "2026-12-31",
      validTo: "2026-01-01",
    });
    expect(result.success).toBe(false);
  });

  it("maps date-only fields to instants and blank scope to null", () => {
    expect(
      toAssignRoleInput(
        {
          roleCode: "DOCTOR",
          unitId: "",
          validFrom: "2026-01-01",
          validTo: "2026-12-31",
        },
        "user-1",
        "facility-1",
      ),
    ).toEqual({
      userId: "user-1",
      roleCode: "DOCTOR",
      facilityId: "facility-1",
      unitId: null,
      validFrom: "2026-01-01T00:00:00.000Z",
      // The backend's validTo check is inclusive, so the UI sends end-of-day.
      validTo: "2026-12-31T23:59:59.999Z",
    });
  });

  it("leaves unspecified dates open-ended", () => {
    expect(
      toAssignRoleInput(
        {
          roleCode: "DOCTOR",
          unitId: "unit-1",
          validFrom: "",
          validTo: "",
        },
        "user-1",
        "facility-1",
      ),
    ).toEqual({
      userId: "user-1",
      roleCode: "DOCTOR",
      facilityId: "facility-1",
      unitId: "unit-1",
      validFrom: null,
      validTo: null,
    });
  });
});

describe("groupPermissions", () => {
  const permissions: PermissionView[] = [
    {
      code: "STAFF_READ",
      module: "STAFF",
      description: "Read staff",
      sensitivity: "NORMAL",
      requiresReason: false,
    },
    {
      code: "AUDIT_READ",
      module: "AUDIT",
      description: "Read audit",
      sensitivity: "SENSITIVE",
      requiresReason: false,
    },
    {
      code: "STAFF_UPDATE",
      module: "STAFF",
      description: "Update staff",
      sensitivity: "NORMAL",
      requiresReason: false,
    },
  ];

  it("groups by module and sorts modules and codes", () => {
    const groups = groupPermissions(permissions);
    expect(groups.map((group) => group.module)).toEqual(["AUDIT", "STAFF"]);
    expect(groups[1].permissions.map((permission) => permission.code)).toEqual([
      "STAFF_READ",
      "STAFF_UPDATE",
    ]);
  });
});
