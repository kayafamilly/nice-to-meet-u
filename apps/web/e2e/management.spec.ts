import { expect, test } from "@playwright/test";

test("management is private and excluded from indexing", async ({ page }) => {
  await page.goto("/management");
  await expect(page).toHaveURL(/\/management\/login$/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.getByRole("heading", { name: "Pilotage NiceToMeetU" })).toBeVisible();
});

test("management rejects an incorrect password", async ({ page }) => {
  await page.goto("/management/login");
  await page.getByLabel("Mot de passe administrateur").fill("definitely-incorrect");
  await page.getByRole("button", { name: "Ouvrir le dashboard" }).click();
  await expect(page.locator('p[role="alert"]')).toContainText("Mot de passe incorrect");
  await expect(page).toHaveURL(/\/management\/login$/);
});

test("owner can authenticate, inspect the dashboard and log out", async ({ page }) => {
  test.skip(!process.env.MANAGEMENT_E2E_PASSWORD, "MANAGEMENT_E2E_PASSWORD is required for authenticated management coverage");
  await page.goto("/management/login");
  await page.getByLabel("Mot de passe administrateur").fill(process.env.MANAGEMENT_E2E_PASSWORD!);
  await page.getByRole("button", { name: "Ouvrir le dashboard" }).click();
  await expect(page).toHaveURL(/\/management$/);
  await expect(page.getByRole("heading", { name: "Vue d’ensemble" })).toBeVisible();
  await page.getByRole("button", { name: "Se déconnecter" }).click();
  await expect(page).toHaveURL(/\/management\/login$/);
});
