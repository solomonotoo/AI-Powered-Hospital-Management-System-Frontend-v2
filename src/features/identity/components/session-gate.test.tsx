import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SessionGate } from "./session-gate";

type MockSession = {
  userId: string;
  username: string;
  accountType: "STAFF" | "PLATFORM";
  staffId: string | null;
  mustChangePassword: boolean;
  facilityId: string | null;
  facilities: string[];
  permissions: string[];
};

const mocks = vi.hoisted(() => ({
  session: null as MockSession | null,
  isLoading: false,
  ready: true,
  pathname: "/admin/setup",
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
  usePathname: () => mocks.pathname,
}));

vi.mock("@/features/identity/hooks/use-session", () => ({
  useSession: () => ({ data: mocks.session, isLoading: mocks.isLoading }),
  useSessionBootstrap: () => mocks.ready,
}));

function session(overrides: Partial<MockSession> = {}): MockSession {
  return {
    userId: "user-1",
    username: "admin@example.test",
    accountType: "STAFF",
    staffId: null,
    mustChangePassword: false,
    facilityId: "facility-1",
    facilities: ["facility-1"],
    permissions: [],
    ...overrides,
  };
}

function renderGate(tier: "FACILITY" | "PLATFORM") {
  return render(
    <SessionGate tier={tier}>
      <div>protected content</div>
    </SessionGate>,
  );
}

beforeEach(() => {
  mocks.session = session();
  mocks.isLoading = false;
  mocks.ready = true;
  mocks.pathname = "/admin/setup";
  mocks.replace.mockReset();
});

describe("SessionGate", () => {
  it("renders children for a staff account in the facility tier", () => {
    renderGate("FACILITY");

    expect(screen.getByText("protected content")).toBeInTheDocument();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("renders children for a platform account in the platform tier", () => {
    mocks.session = session({
      accountType: "PLATFORM",
      facilityId: null,
      facilities: [],
    });

    renderGate("PLATFORM");

    expect(screen.getByText("protected content")).toBeInTheDocument();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("sends an unauthenticated visitor to login with a return URL", async () => {
    mocks.session = null;

    renderGate("FACILITY");

    await waitFor(() =>
      expect(mocks.replace).toHaveBeenCalledWith(
        "/login?returnUrl=%2Fadmin%2Fsetup",
      ),
    );
    expect(screen.queryByText("protected content")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      /Redirecting to sign in/,
    );
  });

  it("forces a password change before rendering protected content", async () => {
    mocks.session = session({ mustChangePassword: true });

    renderGate("FACILITY");

    await waitFor(() =>
      expect(mocks.replace).toHaveBeenCalledWith("/reset-password?forced=1"),
    );
    expect(screen.queryByText("protected content")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      /Password change required/,
    );
  });

  it("moves a platform account out of the facility tier", async () => {
    mocks.session = session({
      accountType: "PLATFORM",
      facilityId: null,
      facilities: [],
    });

    renderGate("FACILITY");

    await waitFor(() =>
      expect(mocks.replace).toHaveBeenCalledWith("/platform"),
    );
    expect(screen.queryByText("protected content")).not.toBeInTheDocument();
  });

  it("moves a staff account out of the platform tier", async () => {
    renderGate("PLATFORM");

    await waitFor(() =>
      expect(mocks.replace).toHaveBeenCalledWith("/dashboard"),
    );
    expect(screen.queryByText("protected content")).not.toBeInTheDocument();
  });

  it("shows the restoring splash while bootstrap is still running", () => {
    mocks.isLoading = true;

    renderGate("FACILITY");

    expect(mocks.replace).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent(
      /Restoring your session/,
    );
  });
});
