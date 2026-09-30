import { expect, test, type Page } from "@playwright/test";

async function scrollThrough(page: Page): Promise<void> {
  const height = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y <= height; y += 400) await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), y);
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" }));
}

async function hiddenReveals(page: Page): Promise<number> {
  return page.locator("[data-reveal]").evaluateAll((els) => els.filter((el) => Number(getComputedStyle(el).opacity) < 1).length);
}

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("every reveal is visible and nav links work", async ({ page }) => {
    await page.goto("/");
    await scrollThrough(page);
    await expect.poll(() => hiddenReveals(page)).toBe(0);
    await page.goto("/");
    await page.getByRole("navigation", { name: "Primary" }).locator("ul").first().getByRole("link", { name: "Contact" }).click();
    await expect(page).toHaveURL(/\/#contact$/);
  });
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("no smooth scroll and no hidden content", async ({ page }) => {
    await page.goto("/");
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe("auto");
    await expect.poll(() => hiddenReveals(page)).toBe(0);
    await expect(page.locator(".scroll-progress")).toBeHidden();
  });
});

test("print shows everything", async ({ page }) => {
  await page.goto("/");
  await page.emulateMedia({ media: "print" });
  await expect.poll(() => hiddenReveals(page)).toBe(0);
});

test("the email copy button is only rendered with JavaScript", async ({ page, browserName }) => {
  await page.goto("/");
  const copy = page.getByRole("button", { name: "Copy email address" });
  await expect(copy).toBeVisible();
  if (browserName === "chromium") {
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    await copy.click();
    await expect(page.getByText("Copied", { exact: true })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("filipe.abravo@gmail.com");
  }
});
