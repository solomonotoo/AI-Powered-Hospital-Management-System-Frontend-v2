import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readPendingStaffLink, savePendingStaffLink } from "../pending-staff-link";
import { FirstAdminStaffLink } from "./first-admin-staff-link";

const mocks = vi.hoisted(() => ({
  session: {
    userId: "user-1",
    username: "admin@example.test",
    accountType: "STAFF",
    staffId: null as string | null,
    mustChangePassword: false,
    facilityId: "facility-1",
    facilities: ["facility-1"],
    permissions: ["STAFF_REGISTER", "STAFF_UPDATE", "CONFIG_READ"],
  },
  refetch: vi.fn(),
  onboard: vi.fn(),
  link: vi.fn(),
}));

vi.mock("@/features/identity/hooks/use-session", () => ({
  useSession: () => ({
    data: mocks.session,
    isPending: false,
    refetch: mocks.refetch,
  }),
}));

vi.mock("@/features/configuration/hooks/use-configuration", () => ({
  useSequences: () => ({
    data: [{ type: "STAFF_NUMBER", configured: true }],
    isPending: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
  }),
}));

vi.mock("../hooks/use-staff", () => ({
  useStaff: () => ({ isPending: true }),
  useOnboardStaff: () => ({
    isPending: false,
    mutateAsync: mocks.onboard,
  }),
  useLinkStaffUser: () => ({
    isPending: false,
    isError: false,
    isSuccess: false,
    mutateAsync: mocks.link,
  }),
}));

beforeEach(() => {
  window.localStorage.clear();
  mocks.session.staffId = null;
  mocks.refetch.mockReset();
  mocks.onboard.mockReset();
  mocks.link.mockReset();
});

describe("FirstAdminStaffLink", () => {
  it("recovers a pending staff record after a reload and offers to link it", () => {
    savePendingStaffLink("user-1", "facility-1", "staff-1");

    render(<FirstAdminStaffLink />);

    expect(screen.getByText("Staff record created")).toBeInTheDocument();
    expect(screen.getByText("staff-1")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Link staff record" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Create and link profile" }),
    ).not.toBeInTheDocument();
  });

  it("clears the pending record once the session reports a linked staff id", () => {
    savePendingStaffLink("user-1", "facility-1", "staff-1");
    mocks.session.staffId = "staff-1";

    render(<FirstAdminStaffLink />);

    expect(readPendingStaffLink("user-1", "facility-1")).toBeNull();
  });
});
