import { expect, test } from "@playwright/test";
import { isMobile } from "./helpers";

test.describe("scroll-spy (desktop nav)", () => {
  test.beforeEach(({}, testInfo) => test.skip(isMobile(testInfo), "desktop menu only"));

  test("marks the section in view, none in the hero, contact at the end", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Primary" }).locator("ul").first();
    await expect(nav.locator('[aria-current="true"]')).toHaveCount(0);

    await page.locator("#experience-heading").scrollIntoViewIfNeeded();
    await page.evaluate(() => document.getElementById("experience")?.scrollIntoView({ behavior: "instant" }));
    await expect(nav.getByRole("link", { name: "Experience" })).toHaveAttribute("aria-current", "true");

    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" }));
    await expect(nav.getByRole("link", { name: "Contact" })).toHaveAttribute("aria-current", "true");
    await expect(nav.locator('[aria-current="true"]')).toHaveCount(1);
  });

  test("is off on case studies", async ({ page }) => {
    await page.goto("/projects/email-scraper");
    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" }));
    await expect(page.locator('nav [aria-current="true"]')).toHaveCount(0);
  });
});
