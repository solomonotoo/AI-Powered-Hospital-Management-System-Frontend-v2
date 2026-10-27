import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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
}));

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
});
