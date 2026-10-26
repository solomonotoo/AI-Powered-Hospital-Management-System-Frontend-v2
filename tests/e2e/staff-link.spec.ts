import { expect, test } from "@playwright/test";
import {
  installApiStub,
  PENDING_STAFF_KEY,
} from "./support/api-stub";
import { signIn } from "./support/session";

test("recovers a failed first-admin link after reload and reconciles a 409", async ({
  page,
}) => {
  const api = await installApiStub(page);

  // Accept the form's beforeunload confirmation when the test deliberately
  // reloads after the first link failure.
  page.on("dialog", (dialog) => void dialog.accept());

  await signIn(page);
  await page.goto("/admin/setup");

  await expect(
    page.getByRole("heading", { name: "Facility setup" }),
  ).toBeVisible();
  await expect(
    page.locator('[data-slot="card-title"]', {
      hasText: "Complete your workforce profile",
    }),
  ).toBeVisible();

  await page.getByLabel("First name").fill("Ama");
  await page.getByLabel("Last name").fill("Mensah");
  await page.locator("#staff-sex").click();
  await page.getByRole("option", { name: "Female" }).click();
  await page.getByLabel("Date of birth").fill("1990-01-01");
  await page.getByLabel("Phone").fill("0241234567");

  const createButton = page.getByRole("button", {
    name: "Create and link profile",
  });
  await expect(createButton).toBeEnabled();
  await createButton.click();

  // The staff row is created, but the first link response is lost.
  await expect(
    page.locator('[data-slot="alert-title"]', {
      hasText: "Staff record created; link failed",
    }),
  ).toBeVisible();
  expect(api.state.createStaffCalls).toBe(1);
  expect(api.state.linkStaffCalls).toBe(1);

  // Reload recovery: the pending id restores the link action instead of
  // offering a second create.
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Facility setup" }),
  ).toBeVisible();
  await expect(
    page.locator('[data-slot="alert-title"]', {
      hasText: "Staff record created",
    }),
  ).toBeVisible();
  const linkButton = page.getByRole("button", { name: "Link staff record" });
  await expect(linkButton).toBeVisible();
  expect(api.state.createStaffCalls).toBe(1);

  // The retry gets a 409 because the first request actually committed.
  // The UI reads the staff row back, confirms it belongs to this account,
  // and lets /identity/me reflect the link.
  await linkButton.click();

  await expect(
    page.locator('[data-slot="card-title"]', {
      hasText: "Workforce profile linked",
    }),
  ).toBeVisible({ timeout: 12_000 });
  await expect(page.getByText("STF-0001")).toBeVisible();

  expect(api.state.createStaffCalls).toBe(1);
  expect(api.state.linkStaffCalls).toBe(2);
  expect(api.state.getStaffCalls).toBeGreaterThanOrEqual(1);
  await expect
    .poll(() =>
      page.evaluate((key) => window.localStorage.getItem(key), PENDING_STAFF_KEY),
    )
    .toBeNull();
});
