import { expect, type Page } from "@playwright/test";
import { TEST_USER } from "./api-stub";

/** Sign in through the real login form and wait for the facility shell. */
export async function signIn(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Username or email").fill(TEST_USER.username);
  await page.getByLabel("Password").fill(TEST_USER.password);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole("heading", { name: `Welcome, ${TEST_USER.username}` }),
  ).toBeVisible();
}
