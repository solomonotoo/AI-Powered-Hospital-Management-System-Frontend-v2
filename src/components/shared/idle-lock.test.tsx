import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IdleLock } from "./idle-lock";

const mocks = vi.hoisted(() => ({
  session: {
    username: "admin@example.test",
  },
  login: vi.fn(),
  logout: vi.fn(),
  setMfaToken: vi.fn(),
  replace: vi.fn(),
  pathname: "/admin/setup",
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
  usePathname: () => mocks.pathname,
}));

vi.mock("@/features/identity/api/auth", () => ({
  login: mocks.login,
  logout: mocks.logout,
}));

vi.mock("@/features/identity/hooks/use-session", () => ({
  sessionQueryKey: ["session"],
  useSession: () => ({ data: mocks.session }),
}));

vi.mock("@/lib/auth-store", () => ({
  setMfaToken: mocks.setMfaToken,
}));

function renderLock() {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <IdleLock timeoutMs={1_000} />
    </QueryClientProvider>,
  );
}

function lockScreen() {
  act(() => {
    vi.advanceTimersByTime(1_000);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  mocks.login.mockReset();
  mocks.login.mockResolvedValue({ mfaRequired: false });
  mocks.logout.mockReset();
  mocks.logout.mockResolvedValue(undefined);
  mocks.setMfaToken.mockReset();
  mocks.replace.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("IdleLock", () => {
  it("shows the lock screen after the idle timeout", () => {
    renderLock();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    lockScreen();

    expect(
      screen.getByRole("dialog", { name: "Session locked" }),
    ).toBeInTheDocument();
  });

  it("unlocks and clears the session cache after password re-entry", async () => {
    renderLock();
    lockScreen();
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "correct-password" },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Unlock" }));
    });

    expect(mocks.login).toHaveBeenCalledWith(
      "admin@example.test",
      "correct-password",
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("routes MFA accounts to verification instead of resuming", async () => {
    mocks.login.mockResolvedValue({
      mfaRequired: true,
      mfaToken: "mfa-token",
    });
    renderLock();
    lockScreen();
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "correct-password" },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Unlock" }));
    });

    expect(mocks.setMfaToken).toHaveBeenCalledWith("mfa-token");
    expect(mocks.replace).toHaveBeenCalledWith(
      "/mfa?returnUrl=%2Fadmin%2Fsetup",
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the backend error and stays locked after a bad password", async () => {
    mocks.login.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 401,
        data: { message: "Invalid username or password" },
      },
    });
    renderLock();
    lockScreen();
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "wrong-password" },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Unlock" }));
    });

    expect(
      screen.getByText("Invalid username or password"),
    ).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
