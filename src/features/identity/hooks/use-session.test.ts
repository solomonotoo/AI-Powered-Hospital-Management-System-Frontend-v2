import { beforeEach, describe, expect, it, vi } from "vitest";
import { bootstrapSession } from "./use-session";

const mocks = vi.hoisted(() => ({
  getAccessToken: vi.fn(),
  getSessionId: vi.fn(),
  clearSession: vi.fn(),
  refreshAccessToken: vi.fn(),
}));

vi.mock("@/lib/http", () => ({
  api: { get: vi.fn() },
  refreshAccessToken: mocks.refreshAccessToken,
}));

vi.mock("@/lib/auth-store", () => ({
  clearSession: mocks.clearSession,
  getAccessToken: mocks.getAccessToken,
  getSessionId: mocks.getSessionId,
  subscribeAuth: vi.fn(),
}));

beforeEach(() => {
  mocks.getAccessToken.mockReset().mockReturnValue(null);
  mocks.getSessionId.mockReset().mockReturnValue(null);
  mocks.clearSession.mockReset();
  mocks.refreshAccessToken.mockReset().mockResolvedValue(undefined);
});

describe("bootstrapSession", () => {
  it("does nothing when an access token is already in memory", async () => {
    mocks.getAccessToken.mockReturnValue("access-token");
    mocks.getSessionId.mockReturnValue("session-1");

    await bootstrapSession();

    expect(mocks.refreshAccessToken).not.toHaveBeenCalled();
  });

  it("does nothing when there is no persisted session id", async () => {
    await bootstrapSession();

    expect(mocks.refreshAccessToken).not.toHaveBeenCalled();
  });

  it("exchanges the refresh cookie when a session id exists", async () => {
    mocks.getSessionId.mockReturnValue("session-1");

    await bootstrapSession();

    expect(mocks.refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(mocks.clearSession).not.toHaveBeenCalled();
  });

  it("clears the session when the server refuses the refresh", async () => {
    mocks.getSessionId.mockReturnValue("session-1");
    mocks.refreshAccessToken.mockRejectedValue({
      isAxiosError: true,
      response: { status: 401 },
    });

    await expect(bootstrapSession()).resolves.toBeUndefined();

    expect(mocks.clearSession).toHaveBeenCalledTimes(1);
  });

  it("keeps the session id when the refresh failed without a response", async () => {
    mocks.getSessionId.mockReturnValue("session-1");
    mocks.refreshAccessToken.mockRejectedValue({ isAxiosError: true });

    await expect(bootstrapSession()).resolves.toBeUndefined();

    expect(mocks.clearSession).not.toHaveBeenCalled();
  });

  it("single-flights concurrent bootstrap attempts", async () => {
    mocks.getSessionId.mockReturnValue("session-1");
    let resolveRefresh!: () => void;
    mocks.refreshAccessToken.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveRefresh = resolve;
      }),
    );

    const first = bootstrapSession();
    const second = bootstrapSession();

    expect(mocks.refreshAccessToken).toHaveBeenCalledTimes(1);
    resolveRefresh();
    await Promise.all([first, second]);
  });
});
