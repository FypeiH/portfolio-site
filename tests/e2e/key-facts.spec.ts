import { expect, test } from "@playwright/test";

test("private case study shows problem → solution → impact once, right after the diagram (spec §3.4)", async ({ page }) => {
  await page.goto("/projects/email-scraper");
  const facts = page.locator("[data-key-facts]");
  await expect(facts).toHaveCount(1);
  const followsFigure = await facts.evaluate((el) => el.previousElementSibling?.tagName === "FIGURE");
  expect(followsFigure).toBe(true);
});

test("public case study has no key facts block", async ({ page }) => {
  await page.goto("/projects/fidu-bot");
  await expect(page.locator("[data-key-facts]")).toHaveCount(0);
});
