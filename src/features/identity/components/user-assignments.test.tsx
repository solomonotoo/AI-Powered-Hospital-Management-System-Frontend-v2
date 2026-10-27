import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UserAssignments } from "./user-assignments";

const mocks = vi.hoisted(() => ({
  rows: [
    {
      assignmentId: "assignment-1",
      roleCode: "FACILITY_ADMIN",
      roleName: "Facility Administrator",
      facilityId: "facility-1",
      unitId: "unit-1",
      status: "ACTIVE",
      validFrom: "2026-10-27T08:00:00Z",
      validTo: null,
      grantedBy: "user-2",
      approvedBy: "user-3",
      bootstrapGrant: true,
    },
    {
      assignmentId: "assignment-2",
      roleCode: "MEDICAL_DIRECTOR",
      roleName: "Medical Director",
      facilityId: "facility-1",
      unitId: null,
      status: "PENDING_APPROVAL",
      validFrom: "2026-11-01T08:00:00Z",
      validTo: null,
      grantedBy: "user-2",
      approvedBy: null,
      bootstrapGrant: false,
    },
  ],
  refetch: vi.fn(),
}));

vi.mock("../hooks/use-users", () => ({
  useUserAssignments: () => ({
    data: {
      content: mocks.rows,
      page: 0,
      size: 20,
      totalElements: mocks.rows.length,
      totalPages: 1,
      first: true,
      last: true,
    },
    isPending: false,
    isError: false,
    isFetching: false,
    error: null,
    refetch: mocks.refetch,
  }),
}));

describe("UserAssignments", () => {
  it("shows active, pending and bootstrap evidence from the facility history", () => {
    render(<UserAssignments userId="user-1" />);

    expect(screen.getByText("Facility Administrator")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Medical Director")).toBeInTheDocument();
    expect(screen.getByText("Pending Approval")).toBeInTheDocument();
    expect(screen.getByText("Awaiting approval")).toBeInTheDocument();
    expect(screen.getByText("Bootstrap")).toBeInTheDocument();
    expect(screen.getByText("2 assignments")).toBeInTheDocument();
  });
});
