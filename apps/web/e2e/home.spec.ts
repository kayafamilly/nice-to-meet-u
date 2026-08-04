import { expect, test } from "@playwright/test";

test("home page explains the speaking-practice problem and solution", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Don't just learn a language. Keep speaking it." })).toBeVisible();
  await expect(page.getByText("2–4 people")).toBeVisible();
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "How it works" }).click();
  await expect(page).toHaveURL(/\/how-it-works$/);
  await expect(page.getByRole("heading", { name: "The practice your language course cannot give you." })).toBeVisible();
});

test("home page stays usable on a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Don't just learn a language. Keep speaking it." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Start practising" }).first()).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
});

test("search discovery exposes only canonical public pages", async ({ page, request }) => {
  const robots = await request.get("/robots.txt");
  expect(robots.ok()).toBe(true);
  const robotsText = await robots.text();
  expect(robotsText).toContain("Disallow: /api/");
  expect(robotsText).toContain("Disallow: /app/");
  expect(robotsText).toContain("Sitemap: http://127.0.0.1:3000/sitemap.xml");

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBe(true);
  const sitemapText = await sitemap.text();
  expect(sitemapText).toContain("<loc>http://127.0.0.1:3000/</loc>");
  expect(sitemapText).toContain("<loc>http://127.0.0.1:3000/how-it-works</loc>");
  expect(sitemapText).not.toContain("/app/");
  expect(sitemapText).not.toContain("/login");

  await page.goto("/");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /^http:\/\/127\.0\.0\.1:3000\/?$/);
  await page.goto("/login");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});
