import { expect, test } from "@playwright/test";
import { isMobile } from "./helpers";

test.describe("mobile menu (spec §2.5)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!isMobile(testInfo), "mobile viewport only");
    await page.goto("/");
  });

  test("button opens and closes, focus goes to the first link", async ({ page }) => {
    const button = page.getByRole("button", { name: "Menu" });
    await expect(button).toHaveAttribute("aria-expanded", "false");
    await button.click();
    await expect(page.getByRole("button", { name: "Close" })).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator("#mobile-nav a").first()).toBeFocused();
    await page.getByRole("button", { name: "Close" }).click();
    await expect(page.locator("#mobile-nav")).toBeHidden();
  });

  test("Esc closes and returns focus to the button", async ({ page }) => {
    await page.getByRole("button", { name: "Menu" }).click();
    await page.keyboard.press("Escape");
    await expect(page.locator("#mobile-nav")).toBeHidden();
    await expect(page.getByRole("button", { name: "Menu" })).toBeFocused();
  });

  test("clicking a link closes it and scrolls", async ({ page }) => {
    await page.getByRole("button", { name: "Menu" }).click();
    await page.locator("#mobile-nav").getByRole("link", { name: "Skills" }).click();
    await expect(page.locator("#mobile-nav")).toBeHidden();
    await expect(page.locator("#skills-heading")).toBeInViewport();
  });

  test("clicking outside closes it", async ({ page }) => {
    await page.getByRole("button", { name: "Menu" }).click();
    await page.mouse.click(10, 600);
    await expect(page.locator("#mobile-nav")).toBeHidden();
  });

  test("resizing to desktop closes it", async ({ page }) => {
    await page.getByRole("button", { name: "Menu" }).click();
    await page.setViewportSize({ width: 1024, height: 800 });
    await expect(page.getByRole("button", { name: /Menu|Close/ })).toBeHidden();
    await page.setViewportSize({ width: 390, height: 800 });
    await expect(page.getByRole("button", { name: "Menu" })).toHaveAttribute("aria-expanded", "false");
  });
});
