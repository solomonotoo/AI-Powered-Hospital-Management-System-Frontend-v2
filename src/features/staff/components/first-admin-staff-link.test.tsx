import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  readPendingStaffLink,
  savePendingStaffLink,
} from "../pending-staff-link";
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
  getStaff: vi.fn(),
}));

vi.mock("@/features/identity/hooks/use-session", () => ({
  sessionQueryKey: ["session"],
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

vi.mock("../api/staff", () => ({
  onboardStaff: mocks.onboard,
  linkStaffUser: mocks.link,
  getStaff: mocks.getStaff,
}));

const staffDetail = {
  id: "staff-1",
  userId: "user-1",
  displayName: "Ama Mensah",
  staffNumber: "STF-0001",
  category: "ADMINISTRATOR",
  employmentStatus: "ACTIVE",
};

function renderCard() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={client}>
      <FirstAdminStaffLink />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
  mocks.session.staffId = null;
  mocks.refetch.mockReset();
  mocks.refetch.mockResolvedValue({
    data: { ...mocks.session, staffId: "staff-1" },
  });
  mocks.onboard.mockReset();
  mocks.onboard.mockResolvedValue("staff-1");
  mocks.link.mockReset();
  mocks.link.mockResolvedValue(undefined);
  mocks.getStaff.mockReset();
  mocks.getStaff.mockResolvedValue(staffDetail);
});

describe("FirstAdminStaffLink", () => {
  it("recovers a pending staff record after a reload and offers to link it", () => {
    savePendingStaffLink("user-1", "facility-1", "staff-1");

    renderCard();

    expect(screen.getByText("Staff record created")).toBeInTheDocument();
    expect(screen.getByText("staff-1")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Link staff record" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Create and link profile" }),
    ).not.toBeInTheDocument();
  });

  it("clears the pending record once the session reports a linked staff id", async () => {
    savePendingStaffLink("user-1", "facility-1", "staff-1");
    mocks.session.staffId = "staff-1";

    renderCard();

    await waitFor(() =>
      expect(readPendingStaffLink("user-1", "facility-1")).toBeNull(),
    );
  });

  it("links the recovered staff id and records success", async () => {
    savePendingStaffLink("user-1", "facility-1", "staff-1");
    renderCard();

    fireEvent.click(
      screen.getByRole("button", { name: "Link staff record" }),
    );

    await waitFor(() =>
      expect(mocks.link).toHaveBeenCalledWith("staff-1", "user-1"),
    );
    expect(await screen.findByText("Link recorded")).toBeInTheDocument();
  });

  it("treats a 409 as success when the staff record is linked to this user", async () => {
    savePendingStaffLink("user-1", "facility-1", "staff-1");
    mocks.link.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 409,
        data: { status: 409, code: "CONFLICT", message: "Already linked" },
      },
    });
    mocks.getStaff.mockResolvedValue({ ...staffDetail, userId: "user-1" });
    renderCard();

    fireEvent.click(
      screen.getByRole("button", { name: "Link staff record" }),
    );

    await waitFor(() => expect(mocks.getStaff).toHaveBeenCalledWith("staff-1"));
    expect(await screen.findByText("Link recorded")).toBeInTheDocument();
  });

  it("does not reconcile a 409 for a different user", async () => {
    savePendingStaffLink("user-1", "facility-1", "staff-1");
    mocks.link.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 409,
        data: { status: 409, code: "CONFLICT", message: "Already linked" },
      },
    });
    mocks.getStaff.mockResolvedValue({
      ...staffDetail,
      userId: "different-user",
    });
    renderCard();

    fireEvent.click(
      screen.getByRole("button", { name: "Link staff record" }),
    );

    await waitFor(() => expect(mocks.getStaff).toHaveBeenCalledWith("staff-1"));
    expect(
      await screen.findByText("Staff record created; link failed"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Retry link" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Link recorded")).not.toBeInTheDocument();
  });

  it("keeps the retry action after a non-conflict link failure", async () => {
    savePendingStaffLink("user-1", "facility-1", "staff-1");
    mocks.link.mockRejectedValue(new Error("network unavailable"));
    renderCard();

    fireEvent.click(
      screen.getByRole("button", { name: "Link staff record" }),
    );

    expect(
      await screen.findByText("Staff record created; link failed"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Retry link" }),
    ).toBeInTheDocument();
  });
});
