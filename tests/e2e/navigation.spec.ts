import { expect, test } from "@playwright/test";
import { CASE_STUDY, expectHeadingBelowHeader, navLink, openNavIfNeeded } from "./helpers";

const LABELS = { projects: "Projects", experience: "Experience", skills: "Skills", about: "About", contact: "Contact" } as const;

test.describe("anchor navigation", () => {
  for (const [id, label] of Object.entries(LABELS)) {
    test(`home → #${id}`, async ({ page }, testInfo) => {
      await page.goto("/");
      await openNavIfNeeded(page, testInfo);
      await navLink(page, testInfo, label).click();
      await expect(page).toHaveURL(new RegExp(`/#${id}$`));
      await expectHeadingBelowHeader(page, id);
    });
  }

  test("case study → /#experience", async ({ page }, testInfo) => {
    await page.goto(CASE_STUDY);
    await openNavIfNeeded(page, testInfo);
    await navLink(page, testInfo, "Experience").click();
    await expect(page).toHaveURL(/\/#experience$/);
    await expectHeadingBelowHeader(page, "experience");
  });

  test("hero CTAs jump to projects and contact", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "View projects" }).click();
    await expectHeadingBelowHeader(page, "projects");
    await page.goto("/");
    await page.getByRole("link", { name: "Contact me" }).click();
    await expectHeadingBelowHeader(page, "contact");
  });

  test("skip link targets main", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeFocused();
    await expect(skip).toHaveAttribute("href", "#main");
  });
});

test.describe("routes", () => {
  test("/projects redirects to /#projects", async ({ page }) => {
    await page.goto("/projects");
    await expect(page).toHaveURL(/\/#projects$/);
  });

  test("unknown project slug is a 404 with Home, Projects and Contact links", async ({ page }) => {
    const response = await page.goto("/projects/does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
    const main = page.getByRole("main");
    for (const name of ["Home", "Projects", "Contact"]) await expect(main.getByRole("link", { name, exact: true })).toBeVisible();
  });

  test("every card links to an existing case study", async ({ page, request }) => {
    await page.goto("/");
    const hrefs = await page.locator("#projects h3 a").evaluateAll((links) => links.map((a) => a.getAttribute("href")));
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) expect((await request.get(href!)).status()).toBe(200);
  });

  test("skill and experience links only point to existing case studies", async ({ page, request }) => {
    await page.goto("/");
    const hrefs = await page.locator('#skills a[href^="/projects/"], #experience a[href^="/projects/"]').evaluateAll((links) =>
      [...new Set(links.map((a) => a.getAttribute("href")))],
    );
    for (const href of hrefs) expect((await request.get(href!)).status()).toBe(200);
  });
});

test.describe("back navigation (spec §2.7)", () => {
  test("home → card → All projects returns to the card", async ({ page }) => {
    await page.goto("/");
    const card = page.locator("#projects h3 a").last();
    const title = (await card.textContent()) ?? "";
    await card.scrollIntoViewIfNeeded();
    await card.click();
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await page.getByRole("link", { name: "← All projects" }).click();
    await expect(page).toHaveURL(/\/$|\/#projects$/);
    await expect(page.locator("#projects h3 a", { hasText: title })).toBeInViewport();
  });

  test("direct entry → All projects lands on /#projects", async ({ page }) => {
    await page.goto(CASE_STUDY);
    await page.getByRole("link", { name: "← All projects" }).click();
    await expect(page).toHaveURL(/\/#projects$/);
    await expectHeadingBelowHeader(page, "projects");
  });
});
