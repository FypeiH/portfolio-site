import { expect, test } from "@playwright/test";
import { CASE_STUDY } from "./helpers";

test.describe("canonical and og:url (QA FIL-8 item 5)", () => {
  test("home and case study point at themselves", async ({ page }) => {
    for (const path of ["/", CASE_STUDY]) {
      await page.goto(path);
      const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
      expect(new URL(canonical ?? "").pathname).toBe(path);
      const ogUrl = await page.locator('meta[property="og:url"]').getAttribute("content");
      expect(new URL(ogUrl ?? "").pathname).toBe(path);
    }
  });

  test("404 pages have no canonical or og:url", async ({ page }) => {
    const response = await page.goto("/does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
    await expect(page.locator('meta[property="og:url"]')).toHaveCount(0);
  });
});
