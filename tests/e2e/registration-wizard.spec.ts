import { expect, test } from "@playwright/test";
import { installApiStub } from "./support/api-stub";
import { signIn } from "./support/session";

// Regression: advancing a registration wizard must be navigation, not a
// save. Before the fix the Next and Register buttons shared one DOM
// node, so the click that advanced the step also activated the submit
// button React left behind and posted the record before the review step
// could be read.
test("staff registration reaches posting and review without saving", async ({
  page,
}) => {
  const api = await installApiStub(page);

  await signIn(page);
  await page.goto("/admin/staff/new");
  await expect(
    page.getByRole("heading", { name: "Register staff" }),
  ).toBeVisible();

  await page.getByLabel("First name").fill("Ama");
  await page.getByLabel("Last name").fill("Mensah");
  await page.getByLabel("Date of birth").fill("1990-01-01");
  await page.getByLabel("Phone").fill("0241234567");
  await page.getByRole("button", { name: "Next" }).click();

  await expect(page.getByLabel("Licensing body")).toBeVisible();
  await page.getByLabel("Licensing body").fill("MDC");
  await page.getByLabel("Licence number").fill("MDC-123");
  await page.getByLabel("Issued on").fill("2020-01-01");
  await page.getByLabel("Expires on").fill("2027-01-01");
  await page.getByRole("button", { name: "Next" }).click();

  // The review step must remain on screen; the same click must not have
  // registered the staff member and navigated to the profile page.
  await expect(page.getByText("Initial posting (optional)")).toBeVisible();
  await page.waitForTimeout(1_500);
  await expect(page.getByText("Initial posting (optional)")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Register staff" }),
  ).toBeVisible();
  expect(api.state.createStaffCalls).toBe(0);
  await expect(page).toHaveURL(/\/admin\/staff\/new$/);

  // The review step's own button is the save action.
  await page.getByRole("button", { name: "Register staff" }).click();
  await expect
    .poll(() => api.state.createStaffCalls)
    .toBe(1);
});
