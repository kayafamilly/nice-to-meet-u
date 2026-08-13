import { expect, test } from "@playwright/test";

test("home page explains the speaking-practice problem and solution", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Don't just learn a language. Keep speaking it." })).toBeVisible();
  await expect(page.getByText("2–4 people")).toBeVisible();
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "How it works" }).click();
  await expect(page).toHaveURL(/\/how-it-works$/);
  await expect(page.getByRole("heading", { name: "The practice your language course cannot give you." })).toBeVisible();
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Guides" }).click();
  await expect(page).toHaveURL(/\/guides$/);
  await expect(page.getByRole("heading", { name: "Make room for the conversations that move a language forward." })).toBeVisible();
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Pen pals" }).click();
  await expect(page).toHaveURL(/\/pen-pals$/);
  await expect(page.getByRole("heading", { name: "Keep the curiosity of a pen pal exchange moving forward." })).toBeVisible();
});

test("home page stays usable on a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Don't just learn a language. Keep speaking it." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Start practising" }).first()).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);

  await page.goto("/guides/spanish-speaking-practice");
  await expect(page.getByRole("heading", { name: "How to practise Spanish speaking when you need real conversation" })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);

  await page.goto("/pen-pals/pen-pal-conversation-starters");
  await expect(page.getByRole("heading", { name: "Pen pal conversation starters that lead to real exchanges" })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
});

test("speaking guide exposes a canonical article and interactive practice planner", async ({ page }) => {
  await page.goto("/guides/spanish-speaking-practice");

  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "http://127.0.0.1:3000/guides/spanish-speaking-practice");
  await expect.poll(() => page.locator('script[type="application/ld+json"]').evaluateAll(
    (scripts) => scripts.some((script) => script.textContent?.includes('"@type":"Article"'))
  )).toBe(true);
  await expect(page.getByRole("heading", { name: "Build a 30-minute Spanish conversation" })).toBeVisible();

  await page.getByLabel("Conversation theme").selectOption("travel");
  await expect(page.getByText("Que lugar recuerdas con mas carino?")).toBeVisible();
  await page.getByRole("button", { name: "Try another prompt" }).click();
  await expect(page.getByText("Que recomendarias a alguien que visita tu ciudad?")).toBeVisible();
});

test("pen-pal resource exposes a canonical article and static prompt picker", async ({ page }) => {
  await page.goto("/pen-pals/pen-pal-conversation-starters");

  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "http://127.0.0.1:3000/pen-pals/pen-pal-conversation-starters");
  await expect.poll(() => page.locator('script[type="application/ld+json"]').evaluateAll(
    (scripts) => scripts.some((script) => script.textContent?.includes('"@type":"Article"'))
  )).toBe(true);
  await expect(page.getByRole("heading", { name: "Choose a question worth answering" })).toBeVisible();

  await page.getByLabel("Conversation theme").selectOption("culture-and-interests");
  await expect(page.getByText("What song, film, or book would you recommend from your country?")).toBeVisible();
  await page.getByRole("button", { name: "Try another question" }).click();
  await expect(page.getByText("Is there a local tradition that visitors often find surprising?")).toBeVisible();
});

test("search discovery exposes canonical public guides and excludes private pages", async ({ page, request }) => {
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
  expect(sitemapText).toContain("<loc>http://127.0.0.1:3000/guides</loc>");
  expect(sitemapText).toContain("<loc>http://127.0.0.1:3000/pen-pals</loc>");
  for (const slug of [
    "spanish-speaking-practice",
    "english-speaking-practice",
    "french-speaking-practice",
    "german-speaking-practice",
    "japanese-speaking-practice",
    "korean-speaking-practice"
  ]) {
    expect(sitemapText).toContain(`<loc>http://127.0.0.1:3000/guides/${slug}</loc>`);
  }
  for (const slug of [
    "find-language-pen-pals",
    "pen-pal-conversation-starters",
    "safe-online-language-exchange"
  ]) {
    expect(sitemapText).toContain(`<loc>http://127.0.0.1:3000/pen-pals/${slug}</loc>`);
  }
  expect(sitemapText).not.toContain("/app/");
  expect(sitemapText).not.toContain("/login");

  await page.goto("/");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /^http:\/\/127\.0\.0\.1:3000\/?$/);
  await page.goto("/login");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});
