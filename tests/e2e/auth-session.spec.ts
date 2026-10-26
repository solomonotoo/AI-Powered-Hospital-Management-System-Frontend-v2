import { expect, test } from "@playwright/test";
import {
  installApiStub,
  TEST_USER,
} from "./support/api-stub";
import { signIn } from "./support/session";

test.describe("login and session bootstrap", () => {
  test("signs in and resumes the session after a reload", async ({ page }) => {
    const api = await installApiStub(page);

    await signIn(page);
    expect(api.state.loginCalls).toBe(1);
    expect(api.state.refreshCalls).toBe(0);

    // A reload loses the in-memory access token. The persisted session id
    // plus the refresh endpoint must mint a new token before /identity/me
    // can restore the shell.
    await page.reload();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole("heading", { name: `Welcome, ${TEST_USER.username}` }),
    ).toBeVisible();
    await expect
      .poll(() => api.state.refreshCalls)
      .toBeGreaterThanOrEqual(1);
    expect(api.state.loginCalls).toBe(1);
  });

  test("locks after the idle timeout and unlocks with the password", async ({
    page,
  }) => {
    const api = await installApiStub(page);

    await signIn(page);

    const lock = page.getByRole("dialog", { name: "Session locked" });
    await expect(lock).toBeVisible({ timeout: 12_000 });

    await page.getByLabel("Password").fill(TEST_USER.password);
    await page.getByRole("button", { name: "Unlock" }).click();

    await expect(lock).toBeHidden();
    await expect(
      page.getByRole("heading", { name: `Welcome, ${TEST_USER.username}` }),
    ).toBeVisible();
    expect(api.state.loginCalls).toBe(2);
  });
});
