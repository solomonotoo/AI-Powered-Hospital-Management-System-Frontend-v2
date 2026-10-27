import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserSessions } from "./user-sessions";

const mocks = vi.hoisted(() => ({
  rows: [
    {
      sessionId: "session-1234567890",
      userId: "user-1",
      facilityId: "facility-1",
      ipAddress: "10.0.0.7",
      userAgent: "Mozilla/5.0 (Windows NT 10.0)",
      createdAt: "2026-10-27T08:00:00Z",
      lastUsedAt: "2026-10-27T09:00:00Z",
      expiresAt: "2026-10-27T17:00:00Z",
      current: true,
    },
    {
      sessionId: "session-2",
      userId: "user-1",
      facilityId: "facility-1",
      ipAddress: "10.0.0.8",
      userAgent: "Mozilla/5.0 (Linux)",
      createdAt: "2026-10-27T07:00:00Z",
      lastUsedAt: "2026-10-27T08:30:00Z",
      expiresAt: "2026-10-27T16:30:00Z",
      current: false,
    },
  ],
  refetch: vi.fn(),
  revoke: vi.fn(),
  canRevoke: true,
  currentUserId: "admin-1",
}));

vi.mock("../hooks/use-users", () => ({
  useUserSessions: () => ({
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
  useRevokeUserSessions: () => ({
    mutateAsync: mocks.revoke,
    isPending: false,
  }),
}));

vi.mock("../hooks/use-session", () => ({
  useCan: () => mocks.canRevoke,
  useSession: () => ({ data: { userId: mocks.currentUserId } }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

beforeEach(() => {
  mocks.refetch.mockReset();
  mocks.revoke.mockReset();
  mocks.revoke.mockResolvedValue(undefined);
  mocks.canRevoke = true;
  mocks.currentUserId = "admin-1";
});

describe("UserSessions", () => {
  it("marks the caller's own session and shows the facility-scoped device data", () => {
    render(<UserSessions userId="user-1" />);

    expect(screen.getByText("This session")).toBeInTheDocument();
    expect(screen.getByText("10.0.0.7")).toBeInTheDocument();
    expect(screen.getByText("10.0.0.8")).toBeInTheDocument();
    expect(
      screen.getByText("Mozilla/5.0 (Windows NT 10.0)"),
    ).toBeInTheDocument();
    expect(screen.getByText("2 sessions")).toBeInTheDocument();
  });

  it("revokes every usable session after confirmation", async () => {
    render(<UserSessions userId="user-1" />);

    fireEvent.click(screen.getByRole("button", { name: "Revoke sessions" }));
    expect(
      screen.getByRole("heading", { name: "Revoke all sessions" }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Confirm revocation" }),
    );

    await waitFor(() => expect(mocks.revoke).toHaveBeenCalledWith("user-1"));
  });

  it("lets a user revoke their own sessions without the admin permission", () => {
    mocks.canRevoke = false;
    mocks.currentUserId = "user-1";

    render(<UserSessions userId="user-1" />);

    expect(
      screen.getByRole("button", { name: "Revoke sessions" }),
    ).toBeInTheDocument();
  });

  it("hides revocation when the caller has neither the permission nor self-scope", () => {
    mocks.canRevoke = false;
    mocks.currentUserId = "admin-1";

    render(<UserSessions userId="user-1" />);

    expect(
      screen.queryByRole("button", { name: "Revoke sessions" }),
    ).not.toBeInTheDocument();
  });
});
