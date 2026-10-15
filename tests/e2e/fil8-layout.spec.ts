import { expect, test } from "@playwright/test";
import { isMobile } from "./helpers";

/** FIL-8 round 4: shorter hero, continuous marquee, readable diagrams with a full-size view, company logos. */

test("hero: one h1 (name label + two-line title), a support line, two CTAs, no image", async ({ page }) => {
  await page.goto("/");
  const h1 = page.locator("#top h1");
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(h1).toContainText("Filipe Bravo");
  await expect(h1).toContainText("Backend engineer,");
  await expect(h1).toContainText("growing into AI.");
  await expect(page.locator("#top p")).toHaveCount(1);
  await expect(page.locator("#top a")).toHaveCount(2);
  await expect(page.locator("#top img")).toHaveCount(0);
  await expect(page.locator("#top svg")).toHaveAttribute("aria-hidden", "true");
});

test("about shows the role as its eyebrow", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#about .ui-label").first()).toHaveText(/\S/);
});

test.describe("marquee", () => {
  test("loops continuously and pauses on hover", async ({ page }, testInfo) => {
    await page.goto("/");
    const track = page.locator("#projects-heading .marquee-track");
    expect(await track.evaluate((el) => getComputedStyle(el).animationName)).toBe("marquee-x");
    expect(await track.evaluate((el) => getComputedStyle(el).animationIterationCount)).toBe("infinite");
    await expect(page.locator("#projects-heading .marquee-group")).toHaveCount(2);
    await expect(page.locator("#projects-heading .marquee-group").nth(1)).toHaveAttribute("aria-hidden", "true");
    if (!isMobile(testInfo)) {
      await page.locator("#projects-heading").hover();
      await expect.poll(() => track.evaluate((el) => getComputedStyle(el).animationPlayState)).toBe("paused");
    }
  });

  test.describe("with reduced motion", () => {
    test.use({ reducedMotion: "reduce" });
    test("is a static band", async ({ page }) => {
      await page.goto("/");
      const track = page.locator("#projects-heading .marquee-track");
      expect(await track.evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
      expect(await track.evaluate((el) => getComputedStyle(el).transform)).toBe("none");
      await expect(page.locator("#projects-heading .marquee-group").nth(1)).toBeHidden();
      await expect(page.locator("#projects-heading")).toHaveText(await page.locator("#projects-heading").textContent() ?? "");
    });
  });
});

test.describe("case-study diagram", () => {
  for (const slug of ["email-scraper", "fidu-bot", "portfolio-site", "contacts-report"]) {
    test(`${slug}: labels render at >= 14 px on desktop`, async ({ page }, testInfo) => {
      test.skip(isMobile(testInfo), "desktop rule; phones scale the diagram to the screen");
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`/projects/${slug}`);
      const img = page.locator(".diagram-img");
      await img.scrollIntoViewIfNeeded();
      await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
      const [rendered, intrinsic] = await img.evaluate((el: HTMLImageElement) => [el.getBoundingClientRect().width, Number(el.getAttribute("width"))]);
      // Mermaid draws labels at 18 px, so a scale of 14/18 keeps them at 14 px or more.
      expect(rendered / intrinsic).toBeGreaterThanOrEqual(14 / 18 - 0.01);
    });
  }

  test("full-size view opens, closes with Esc and returns focus", async ({ page }) => {
    await page.goto("/projects/email-scraper");
    const open = page.getByRole("button", { name: "View full size" });
    await open.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Close" })).toBeFocused();
    await expect(dialog.locator("img")).toHaveAttribute("src", /\/diagrams\/email-scraper\.svg/);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(open).toBeFocused();
    await open.click();
    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(dialog).toBeHidden();
    await expect(open).toBeFocused();
  });

  test("raw SVG link opens in a new tab", async ({ page }) => {
    await page.goto("/projects/email-scraper");
    const link = page.getByRole("link", { name: "Open SVG in a new tab" });
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", /noopener/);
    await expect(link).toHaveAttribute("href", /\/diagrams\/email-scraper\.svg/);
  });
});

test("experience: every company shows its logo, decorative with fixed dimensions, and the name stays as text", async ({ page }) => {
  await page.goto("/");
  const logos = page.locator("#experience [data-company-mark=logo] img");
  expect(await logos.count()).toBeGreaterThan(0);
  for (const logo of await logos.all()) {
    await expect(logo).toHaveAttribute("alt", "");
    await expect(logo).toHaveAttribute("width", /^\d+$/);
    await expect(logo).toHaveAttribute("height", /^\d+$/);
    await logo.scrollIntoViewIfNeeded();
    await expect.poll(() => logo.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
    await expect(logo.locator("xpath=ancestor::div[1]/following-sibling::h3")).toContainText(/Altyra Solutions|Gigantic Digital Growth|OCR – Technology and Productivity/);
  }
  await expect(page.locator("#experience [data-company-mark=initials]")).toHaveCount(0);
});

test("contacts-report: the screenshots gallery shows three lazy, sized images with descriptive alt text", async ({ page }) => {
  await page.goto("/projects/contacts-report");
  const gallery = page.getByRole("region", { name: "Screenshots" });
  const images = gallery.locator("img");
  await expect(images).toHaveCount(3);
  for (const image of await images.all()) {
    await expect(image).toHaveAttribute("loading", "lazy");
    await expect(image).toHaveAttribute("width", "1600");
    await expect(image).toHaveAttribute("alt", /\(demo data\)\.$/);
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
  }
});
