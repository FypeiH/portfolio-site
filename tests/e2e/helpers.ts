import { expect, type Page, type TestInfo } from "@playwright/test";

export const SECTIONS = ["projects", "experience", "skills", "about", "contact"] as const;
export const CASE_STUDY = "/projects/email-scraper";

export const isMobile = (testInfo: TestInfo) => testInfo.project.name.startsWith("mobile");

/** Opens the mobile menu when the viewport needs it, so nav links are reachable on every project. */
export async function openNavIfNeeded(page: Page, testInfo: TestInfo): Promise<void> {
  if (!isMobile(testInfo)) return;
  await page.getByRole("button", { name: "Menu" }).click();
  await expect(page.locator("#mobile-nav")).toBeVisible();
}

export function navLink(page: Page, testInfo: TestInfo, label: string) {
  const scope = isMobile(testInfo) ? page.locator("#mobile-nav") : page.getByRole("navigation", { name: "Primary" }).locator("ul").first();
  return scope.getByRole("link", { name: label, exact: true });
}

/** The section heading sits below the 64 px sticky header (scroll-margin-top). */
export async function expectHeadingBelowHeader(page: Page, id: string): Promise<void> {
  const heading = page.locator(`#${id}-heading`);
  await expect(heading).toBeInViewport();
  await expect.poll(async () => (await heading.boundingBox())?.y ?? -1).toBeGreaterThanOrEqual(63);
}
