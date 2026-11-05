import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StaffEndPostingDialog } from "./staff-end-posting-dialog";
import { StaffUnlinkUserDialog } from "./staff-unlink-user-dialog";

const mocks = vi.hoisted(() => ({
  end: vi.fn(),
  unlink: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("../hooks/use-staff", () => ({
  useEndStaffPosting: () => ({ mutateAsync: mocks.end, isPending: false }),
  useUnlinkStaffUser: () => ({ mutateAsync: mocks.unlink, isPending: false }),
}));

const assignment = {
  unitId: "unit-1",
  from: "2026-01-01",
  to: null,
  primary: true,
  open: true,
};

beforeEach(() => {
  mocks.end.mockReset();
  mocks.unlink.mockReset();
});

describe("StaffEndPostingDialog", () => {
  it("closes the posting with the unit and the reason that was entered", async () => {
    mocks.end.mockResolvedValue(undefined);
    render(
      <StaffEndPostingDialog
        staffId="staff-1"
        assignment={assignment}
        unitName="Ward A (WA)"
        open
        onOpenChange={() => {}}
      />,
    );

    fireEvent.change(screen.getByLabelText("End date"), {
      target: { value: "2026-02-01" },
    });
    fireEvent.change(screen.getByLabelText("Reason"), {
      target: { value: "Recorded against the wrong unit" },
    });
    fireEvent.click(screen.getByRole("button", { name: /close posting/i }));

    await waitFor(() => expect(mocks.end).toHaveBeenCalledTimes(1));
    expect(mocks.end).toHaveBeenCalledWith({
      unitId: "unit-1",
      end: "2026-02-01",
      reason: "Recorded against the wrong unit",
    });
  });

  it("refuses to close a posting without a reason", async () => {
    render(
      <StaffEndPostingDialog
        staffId="staff-1"
        assignment={assignment}
        unitName="Ward A (WA)"
        open
        onOpenChange={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /close posting/i }));

    await screen.findByText("Record why this posting is being corrected");
    expect(mocks.end).not.toHaveBeenCalled();
  });
});

describe("StaffUnlinkUserDialog", () => {
  it("revokes the link with the reason that was entered", async () => {
    mocks.unlink.mockResolvedValue(undefined);
    render(
      <StaffUnlinkUserDialog
        staffId="staff-1"
        userId="user-1"
        open
        onOpenChange={() => {}}
      />,
    );

    fireEvent.change(screen.getByLabelText("Reason"), {
      target: { value: "Linked the wrong account" },
    });
    fireEvent.click(screen.getByRole("button", { name: /revoke link/i }));

    await waitFor(() => expect(mocks.unlink).toHaveBeenCalledTimes(1));
    expect(mocks.unlink).toHaveBeenCalledWith("Linked the wrong account");
  });

  it("refuses to revoke without a reason", async () => {
    render(
      <StaffUnlinkUserDialog
        staffId="staff-1"
        userId="user-1"
        open
        onOpenChange={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /revoke link/i }));

    await screen.findByText("Record why the link is being revoked");
    expect(mocks.unlink).not.toHaveBeenCalled();
  });
});
