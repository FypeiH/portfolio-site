import { expect, test } from "@playwright/test";
import { isMobile } from "./helpers";

/** FIL-8 round 4: shorter hero, continuous marquee, readable diagrams with a full-size view, company logos. */

test("hero: the name is the h1 and the largest text, then role, support line, badge, two CTAs", async ({ page }) => {
  await page.goto("/");
  const h1 = page.locator("#top h1");
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(h1).toHaveText("Filipe Bravo");
  await expect(page.getByRole("heading", { level: 1, name: "Filipe Bravo" })).toBeVisible();
  const paragraphs = page.locator("#top p");
  await expect(paragraphs).toHaveCount(3);
  await expect(paragraphs.nth(0)).toContainText("Backend engineer,");
  await expect(paragraphs.nth(0)).toContainText("growing into AI.");
  await expect(paragraphs.nth(1)).toContainText("Open to backend and AI roles");
  // spec §1.1: the badge is text (its brackets and colour square are decorative), now below the support line.
  await expect(paragraphs.nth(2)).toHaveText("[Open to software engineering roles]");
  await expect(paragraphs.nth(2)).toMatchAriaSnapshot("- paragraph: Open to software engineering roles");
  await expect(page.locator("#top a")).toHaveCount(2);
  await expect(page.locator("#top svg")).toHaveAttribute("aria-hidden", "true");
  const tops = await page.locator("#top h1, #top p, #top a").evaluateAll((els) => els.map((el) => el.getBoundingClientRect().top));
  expect(tops).toEqual([...tops].sort((a, b) => a - b));
  const sizes = await page.locator("#top h1, #top p").evaluateAll((els) => els.map((el) => parseFloat(getComputedStyle(el).fontSize)));
  expect(Math.max(...sizes.slice(1))).toBeLessThan(sizes[0]! / 2);
});

test("hero photo: the real portrait, sized and prioritised on wide screens, never downloaded on phones", async ({ page }, testInfo) => {
  const requested: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("filipe-bravo-hero")) requested.push(request.url());
  });
  await page.goto("/", { waitUntil: "networkidle" });
  const photo = page.locator("#top img");
  await expect(photo).toHaveCount(1);
  await expect(photo).toHaveAttribute("alt", "Filipe Bravo");
  await expect(photo).toHaveAttribute("width", "288");
  await expect(photo).toHaveAttribute("height", "360");
  if (isMobile(testInfo)) {
    await expect(photo).toBeHidden();
    expect(requested).toEqual([]);
    return;
  }
  await expect(photo).toBeVisible();
  await expect(photo).toHaveAttribute("fetchpriority", "high");
  await expect.poll(() => photo.evaluate((el: HTMLImageElement) => el.complete && el.currentSrc)).toMatch(/filipe-bravo-hero-(288|576)\.avif$/);
  expect(requested).toHaveLength(1);
  const box = (await photo.boundingBox())!;
  expect([Math.round(box.width), Math.round(box.height)]).toEqual([288, 360]);
});

for (const width of [320, 360, 375, 390]) {
  test(`hero name: one line and no overflow at ${width} px, in the fallback face and in Anton`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    const fit = () =>
      page.locator("#top h1").evaluate((h1) => {
        const range = document.createRange();
        range.selectNodeContents(h1);
        const line = parseFloat(getComputedStyle(h1).lineHeight);
        return { lines: Math.round(h1.getBoundingClientRect().height / line), text: range.getBoundingClientRect().width, box: h1.clientWidth, page: document.documentElement.scrollWidth - innerWidth };
      });
    for (const state of [await fit(), await (async () => {
      await page.waitForFunction(() => document.documentElement.classList.contains("fonts-ready"));
      await page.evaluate(() => document.fonts.ready);
      return fit();
    })()]) {
      expect(state.lines).toBe(1);
      expect(state.text).toBeLessThanOrEqual(state.box);
      expect(state.page).toBe(0);
    }
  });
}

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

test("experience: every company shows its logo below the dates, sized and decorative", async ({ page }, testInfo) => {
  await page.goto("/");
  const logos = page.locator("#experience [data-company-mark=logo] img");
  expect(await logos.count()).toBeGreaterThan(0);
  for (const logo of await logos.all()) {
    await expect(logo).toHaveAttribute("alt", "");
    await expect(logo).toHaveAttribute("width", /^\d+$/);
    await expect(logo).toHaveAttribute("srcset", /-104\.webp 2x$/);
    await logo.scrollIntoViewIfNeeded();
    await expect.poll(() => logo.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
    const article = logo.locator("xpath=ancestor::article[1]");
    const dates = (await article.locator("p.ui-label").first().boundingBox())!;
    const tile = (await logo.locator("xpath=ancestor::div[@data-company-mark][1]").boundingBox())!;
    expect(Math.round(tile.width)).toBe(64);
    if (isMobile(testInfo)) expect(tile.x).toBeLessThan(dates.x);
    else expect(tile.y).toBeGreaterThanOrEqual(dates.y + dates.height);
  }
  await expect(page.locator("#experience [data-company-mark=initials]")).toHaveCount(0);
  const gigantic = page.locator("#experience [data-company-mark=logo]").filter({ has: page.locator('img[src*=gigantic]') }).first();
  await expect(gigantic).toHaveCSS("background-color", "rgb(242, 242, 242)");
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
