import { expect, test } from "@playwright/test";

test("management is private and excluded from indexing", async ({ page }) => {
  await page.goto("/management");
  await expect(page).toHaveURL(/\/management\/login$/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.getByRole("heading", { name: "Platform management" })).toBeVisible();
});

test("management rejects an incorrect password", async ({ page }) => {
  await page.goto("/management/login");
  await page.getByLabel("Owner password").fill("definitely-incorrect");
  await page.getByRole("button", { name: "Open management" }).click();
  await expect(page.locator('p[role="alert"]')).toContainText("Incorrect password");
  await expect(page).toHaveURL(/\/management\/login$/);
});

test("owner can authenticate, inspect the dashboard and log out", async ({ page }) => {
  test.skip(!process.env.MANAGEMENT_E2E_PASSWORD, "MANAGEMENT_E2E_PASSWORD is required for authenticated management coverage");
  await page.goto("/management/login");
  await page.getByLabel("Owner password").fill(process.env.MANAGEMENT_E2E_PASSWORD!);
  await page.getByRole("button", { name: "Open management" }).click();
  await expect(page).toHaveURL(/\/management$/);
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/management\/login$/);
});
