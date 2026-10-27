import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApprovalsQueue } from "./approvals-queue";

const mocks = vi.hoisted(() => ({
  rows: [
    {
      assignmentId: "assignment-1",
      userId: "user-1",
      username: "ama@example.test",
      roleCode: "FACILITY_ADMIN",
      roleName: "Facility Administrator",
      unitId: null,
      validFrom: "2026-10-27T08:00:00Z",
      validTo: null,
      grantedBy: "user-2",
      grantedByUsername: "kojo@example.test",
    },
  ],
  approve: vi.fn(),
  reject: vi.fn(),
  refetch: vi.fn(),
}));

vi.mock("../hooks/use-roles", () => ({
  usePendingAssignments: () => ({
    data: {
      content: mocks.rows,
      page: 0,
      size: 20,
      totalElements: mocks.rows.length,
      totalPages: mocks.rows.length === 0 ? 0 : 1,
      first: true,
      last: true,
    },
    isPending: false,
    isError: false,
    isFetching: false,
    error: null,
    refetch: mocks.refetch,
  }),
  useApproveAssignment: () => ({
    mutateAsync: mocks.approve,
    isPending: false,
  }),
  useRejectAssignment: () => ({
    mutateAsync: mocks.reject,
    isPending: false,
  }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

beforeEach(() => {
  mocks.approve.mockReset();
  mocks.approve.mockResolvedValue(undefined);
  mocks.reject.mockReset();
  mocks.reject.mockResolvedValue(undefined);
  mocks.refetch.mockReset();
});

describe("ApprovalsQueue", () => {
  it("shows the requester, role and facility scope for a pending grant", () => {
    render(<ApprovalsQueue />);

    expect(screen.getByText("ama@example.test")).toBeInTheDocument();
    expect(screen.getByText("Facility Administrator")).toBeInTheDocument();
    expect(screen.getByText("Facility-wide")).toBeInTheDocument();
    expect(screen.getByText("kojo@example.test")).toBeInTheDocument();
    expect(screen.getByText("1 pending request")).toBeInTheDocument();
  });

  it("approves the selected assignment after confirmation", async () => {
    render(<ApprovalsQueue />);

    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    expect(
      screen.getByRole("heading", { name: "Approve privileged assignment" }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Confirm approval" }),
    );

    await waitFor(() =>
      expect(mocks.approve).toHaveBeenCalledWith("assignment-1"),
    );
  });

  it("rejects the selected assignment after confirmation", async () => {
    render(<ApprovalsQueue />);

    fireEvent.click(screen.getByRole("button", { name: "Reject" }));
    expect(
      screen.getByRole("heading", { name: "Reject privileged assignment" }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Confirm rejection" }),
    );

    await waitFor(() =>
      expect(mocks.reject).toHaveBeenCalledWith("assignment-1"),
    );
  });
});
