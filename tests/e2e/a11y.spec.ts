import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { CASE_STUDY } from "./helpers";

for (const path of ["/", CASE_STUDY, "/projects/benched", "/does-not-exist"]) {
  test(`axe: no serious or critical violations on ${path}`, async ({ page }) => {
    // Reveal transitions animate opacity; axe would measure contrast mid-fade (seen in Firefox).
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(path);
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    const blocking = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(blocking.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
  });
}

test("hover states keep AA contrast (skills rows, project cards)", async ({ page, isMobile }) => {
  test.skip(isMobile, "hover only");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const targets = [page.locator("#skills .skills-row").first(), page.locator("#projects article").first()];
  for (const target of targets) {
    await target.scrollIntoViewIfNeeded();
    await target.hover();
    const { violations } = await new AxeBuilder({ page }).include("#skills").include("#projects").withRules(["color-contrast"]).analyze();
    expect(violations.flatMap((v) => v.nodes.map((n) => n.target.join(" ")))).toEqual([]);
  }
});

test("private projects show a badge, not a Source link; public ones show Source", async ({ page }) => {
  await page.goto("/");
  const privateCard = page.locator("#projects article", { hasText: "Email Scraper" });
  await expect(privateCard.getByText("Private project")).toBeVisible();
  await expect(privateCard.getByRole("link", { name: /Source/ })).toHaveCount(0);
  const publicCard = page.locator("#projects article", { hasText: "Crypto Trading Bot" });
  await expect(publicCard.getByRole("link", { name: /Source/ })).toBeVisible();
});

test("Benched shows its App Store link", async ({ page }) => {
  await page.goto("/projects/benched");
  await expect(page.getByRole("link", { name: /App Store/ }).first()).toHaveAttribute("href", /apps\.apple\.com/);
});

test("the photo has alt text and explicit dimensions", async ({ page }) => {
  await page.goto("/");
  const photo = page.locator("#about").getByRole("img", { name: "Portrait of Filipe Bravo" });
  await expect(photo).toHaveAttribute("width", "224");
  await expect(photo).toHaveAttribute("height", "224");
  await expect(page.locator("#about").getByRole("img", { name: "Portrait of Filipe Bravo" })).toHaveCount(1);
  // The hero portrait is ASCII art (wide screens only), a <pre role="img"> with its own label, not a second photo.
  await expect(page.locator("#top img")).toHaveCount(0);
  await expect(page.getByRole("img", { name: "Portrait of Filipe Bravo" })).toHaveCount(1);
  await expect(page.locator("#top pre[role='img']")).toHaveAttribute("aria-label", "Filipe's face in ASCII art");
});

test("the hero paints without the web font: Anton only after load, on the name only (LCP rule)", async ({ page }) => {
  type Probe = Window & { __heroFonts: string[] };
  await page.addInitScript(() => {
    addEventListener("DOMContentLoaded", () => {
      (window as unknown as Probe).__heroFonts = [...document.querySelectorAll("#top, #top *")].map((el) => getComputedStyle(el).fontFamily);
    });
  });
  await page.goto("/");
  // Before load the name uses the local "Anton Fallback*" faces, never Anton itself.
  const beforeLoad = await page.evaluate(() => (window as unknown as Probe).__heroFonts);
  expect(beforeLoad.length).toBeGreaterThan(0);
  expect(beforeLoad.map((family) => family.replace(/"Anton Fallback[^"]*"/g, "")).filter((family) => /anton/i.test(family))).toEqual([]);
  await page.waitForFunction(() => document.documentElement.classList.contains("fonts-ready"));
  // The font is requested after the load event, so it can't sit in the LCP chain.
  const fontAfterLoad = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
    return performance.getEntriesByType("resource").filter((r) => r.name.endsWith(".woff2")).map((r) => r.startTime >= nav.loadEventStart);
  });
  expect(fontAfterLoad).not.toContain(false);
  await expect.poll(() => page.locator("#top h1").evaluate((el) => getComputedStyle(el).fontFamily)).toMatch(/anton/i);
  const rest = await page.locator("#top *:not(h1)").evaluateAll((els) => els.map((el) => getComputedStyle(el).fontFamily));
  expect(rest.filter((family) => /anton/i.test(family))).toEqual([]);
  await expect.poll(() => page.locator("#projects-heading .marquee-track").evaluate((el) => getComputedStyle(el).fontFamily)).toMatch(/anton/i);
});

test("marquee headings keep a single accessible name", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 2, name: "Selected projects", exact: true })).toBeVisible();
  const copies = page.locator('#projects-heading [aria-hidden="true"]');
  expect(await copies.count()).toBeGreaterThanOrEqual(3);
  // Crawlers see one copy: the copies are CSS-painted, so the heading's DOM text is the title once.
  expect(await page.locator("#projects-heading").textContent()).toBe("Selected projects");
  for (const id of ["experience", "skills", "about", "contact"]) {
    const heading = page.locator(`#${id}-heading`);
    const text = (await heading.textContent()) ?? "";
    expect(text.length, id).toBeGreaterThan(0);
    expect((await heading.locator(".marquee-copy").first().evaluate((el) => getComputedStyle(el, "::after").content)).replaceAll('"', "")).toBe(text);
  }
});
