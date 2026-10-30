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
  await expect(page.locator("#top svg")).toHaveCount(0); // the decorative HeroGrid SVG was removed with the ASCII portrait
  const tops = await page.locator("#top h1, #top p, #top a").evaluateAll((els) => els.map((el) => el.getBoundingClientRect().top));
  expect(tops).toEqual([...tops].sort((a, b) => a - b));
  const sizes = await page.locator("#top h1, #top p").evaluateAll((els) => els.map((el) => parseFloat(getComputedStyle(el).fontSize)));
  expect(Math.max(...sizes.slice(1))).toBeLessThan(sizes[0]! / 2);
});

test("hero portrait: ASCII art loaded on the client at lg only, in a reserved box, no image downloaded", async ({ page }, testInfo) => {
  const requested: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("filipe-bravo-hero")) requested.push(request.url());
  });
  let prerendered = "";
  page.on("response", async (response) => {
    if (response.request().resourceType() === "document") prerendered = await response.text();
  });
  await page.goto("/", { waitUntil: "networkidle" });
  expect(prerendered).toContain('aria-label="Filipe&#x27;s face in ASCII art"');
  expect(prerendered).not.toContain("@@@@@@@@@@");
  await expect(page.locator("#top img")).toHaveCount(0);
  const portrait = page.locator("#top pre.hero-photo-ascii");
  await expect(portrait).toHaveCount(1);
  await expect(portrait).toHaveAttribute("role", "img");
  await expect(portrait).toHaveAttribute("aria-label", "Filipe's face in ASCII art");
  expect(requested).toEqual([]);
  if (isMobile(testInfo)) {
    await expect(portrait).toBeHidden();
    await expect(portrait).toHaveText("");
    return;
  }
  await expect(portrait).toBeVisible();
  await expect(portrait).not.toHaveText("");
  const box = await portrait.evaluate((pre) => {
    const filled = pre.getBoundingClientRect();
    const text = pre.textContent;
    pre.textContent = "";
    const empty = pre.getBoundingClientRect();
    pre.textContent = text;
    return { filled: [filled.width, filled.height], empty: [empty.width, empty.height], scroll: [pre.scrollWidth, pre.scrollHeight], client: [pre.clientWidth, pre.clientHeight] };
  });
  expect(box.empty).toEqual(box.filled);
  expect(box.scroll[1]!).toBeLessThanOrEqual(box.client[1]! + 2); // client floors, scroll rounds the fractional lh height
});

test("hero portrait: below lg the art is never fetched", async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 800 });
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.locator("#top pre.hero-photo-ascii")).toBeHidden();
  await expect(page.locator("#top pre.hero-photo-ascii")).toHaveText("");
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

test("hero name at 320 px with 200% text zoom: still one line inside its column (a rem minimum made it 412 px wide)", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/");
  // Text-only zoom (browser font-size setting): rem and em double, viewport and container units do not.
  await page.evaluate(() => (document.documentElement.style.fontSize = "200%"));
  for (const fontsReady of [false, true]) {
    if (fontsReady) {
      await page.waitForFunction(() => document.documentElement.classList.contains("fonts-ready"));
      await page.evaluate(() => document.fonts.ready);
    }
    const state = await page.locator("#top h1").evaluate((h1) => {
      const range = document.createRange();
      range.selectNodeContents(h1);
      const text = range.getBoundingClientRect();
      const line = parseFloat(getComputedStyle(h1).lineHeight);
      return { text: text.width, right: text.right, box: h1.clientWidth, overflow: h1.scrollWidth - h1.clientWidth, lines: Math.round(h1.getBoundingClientRect().height / line) };
    });
    expect(state.lines).toBe(1);
    expect(state.text).toBeLessThanOrEqual(state.box);
    expect(state.overflow).toBe(0);
    expect(state.right).toBeLessThanOrEqual(320);
  }
});

for (const path of ["/", "/projects/contacts-report"]) {
  test(`whole page at 320 px with 200% text zoom (${path}): no horizontal scroll, header name and Menu apart, Menu tappable`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(path);
    await page.evaluate(() => (document.documentElement.style.fontSize = "200%"));
    await page.waitForFunction(() => document.documentElement.classList.contains("fonts-ready"));
    await page.evaluate(() => document.fonts.ready);
    const menu = page.locator('header button[aria-controls="mobile-nav"]');
    await expect(menu).toBeVisible();
    const state = await page.evaluate(() => {
      const button = document.querySelector<HTMLButtonElement>('header button[aria-controls="mobile-nav"]')!;
      const name = document.querySelector("header .site-name");
      const m = button.getBoundingClientRect();
      // The name hides itself when the header is too narrow; if shown, it must not reach the Menu button.
      const n = name && getComputedStyle(name).display !== "none" ? name.getBoundingClientRect() : null;
      const hit = document.elementFromPoint(m.left + m.width / 2, m.top + m.height / 2);
      const overflowing = [button, ...document.querySelectorAll("#top p")].filter((el) => el.scrollWidth > el.clientWidth || el.getBoundingClientRect().right > innerWidth);
      return {
        page: document.documentElement.scrollWidth - innerWidth,
        apart: !n || n.right <= m.left || n.bottom <= m.top || n.top >= m.bottom,
        hitIsMenu: !!hit && button.contains(hit),
        overflowing: overflowing.map((el) => el.textContent),
      };
    });
    expect(state.page).toBeLessThanOrEqual(0);
    expect(state.apart).toBe(true);
    expect(state.hitIsMenu).toBe(true);
    expect(state.overflowing).toEqual([]);
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

test("experience: every company shows its logo below the dates, sized, decorative (empty alt: the h3 names the company)", async ({ page }) => {
  await page.goto("/");
  const logos = page.locator("#experience [data-company-mark=logo] img");
  expect(await logos.count()).toBeGreaterThan(0);
  for (const logo of await logos.all()) {
    await expect(logo).toHaveAttribute("alt", "");
    await expect(logo).toHaveAttribute("width", /^\d+$/);
    await expect(logo).toHaveAttribute("srcset", /-1x\.webp 1x, .+-2x\.webp 2x$/);
    await logo.scrollIntoViewIfNeeded();
    await expect.poll(() => logo.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
    const article = logo.locator("xpath=ancestor::article[1]");
    const dates = (await article.locator("p.ui-label").first().boundingBox())!;
    const tile = (await logo.locator("xpath=ancestor::div[@data-company-mark][1]").boundingBox())!;
    expect([Math.round(tile.width), Math.round(tile.height)]).toEqual([128, 128]);
    expect(tile.y).toBeGreaterThanOrEqual(dates.y + dates.height);
    expect(Math.abs(tile.x - dates.x)).toBeLessThanOrEqual(1);
  }
  await expect(page.locator("#experience [data-company-mark=initials]")).toHaveCount(0);
  const gigantic = page.locator("#experience [data-company-mark=logo]").filter({ has: page.locator('img[src*=gigantic]') }).first();
  const altyra = page.locator("#experience [data-company-mark=logo]").filter({ has: page.locator("img[src*=altyra]") }).first();
  const tileBackground = await altyra.evaluate((el) => getComputedStyle(el).backgroundColor);
  await expect(gigantic).toHaveCSS("background-color", tileBackground);
  await expect(gigantic.locator("img")).toHaveAttribute("alt", "");
  await expect(gigantic.locator("img")).not.toHaveClass(/company-logo-mono/);
});

test("the OCR name is spelled correctly in every text and alt (the misspelling lives only inside its logo image)", async ({ page }) => {
  await page.goto("/");
  expect(await page.content()).not.toMatch(/Tecnology/i);
  await expect(page.locator("#experience h3").filter({ hasText: "OCR – Technology and Productivity" })).toHaveCount(1);
  await expect(page.locator("#experience [data-company-mark=logo] img[src*=ocr-technology]")).toHaveAttribute("alt", "");
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

test("header: the FB monogram sits before the name inside the home link, which keeps the name as its accessible name", async ({ page }) => {
  await page.goto("/");
  const home = page.locator("header a[href='/#top']").first();
  await expect(home).toHaveAccessibleName(/^Filipe Bravo/);
  const mark = home.locator("svg.site-monogram");
  await expect(mark).toHaveAttribute("aria-hidden", "true");
  await expect(mark).toBeVisible();
  const box = (await mark.boundingBox())!;
  expect([Math.round(box.width), Math.round(box.height)]).toEqual([36, 36]);
});

test("favicons: SVG, ICO (16 + 32), PNG 32 and apple-touch 180, all served", async ({ page, request }) => {
  await page.goto("/");
  const icons = await page.locator("head link[rel='icon'], head link[rel='apple-touch-icon']").evaluateAll((links) =>
    links.map((link) => ({ rel: link.getAttribute("rel"), href: link.getAttribute("href")!, sizes: link.getAttribute("sizes"), type: link.getAttribute("type") })),
  );
  expect(icons.some((icon) => icon.href.startsWith("/favicon.ico"))).toBe(true);
  expect(icons.some((icon) => icon.type === "image/svg+xml")).toBe(true);
  expect(icons.some((icon) => icon.type === "image/png" && icon.sizes === "32x32")).toBe(true);
  expect(icons.some((icon) => icon.rel === "apple-touch-icon" && icon.sizes === "180x180")).toBe(true);
  for (const icon of icons) expect((await request.get(icon.href)).status()).toBe(200);
});

for (const width of [320, 390]) {
  test(`experience at ${width} px: the 128 px tiles fit, nothing overflows and the dates and titles keep their width`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    await page.locator("#experience").scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    for (const article of await page.locator("#experience article").all()) {
      const box = (await article.boundingBox())!;
      const dates = article.locator("p.ui-label").first();
      const lineHeight = await dates.evaluate((el) => parseFloat(getComputedStyle(el).lineHeight));
      expect((await dates.boundingBox())!.height).toBeLessThanOrEqual(lineHeight * 1.5);
      const tile = (await article.locator("[data-company-mark]").boundingBox())!;
      expect(tile.x + tile.width).toBeLessThanOrEqual(box.x + box.width);
      const title = (await article.locator("h3").boundingBox())!;
      expect(title.width).toBeGreaterThanOrEqual(box.width * 0.9);
      expect(await article.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    }
  });
}

for (const width of [320, 360, 375, 390]) {
  for (const zoom of ["100%", "200%"]) {
    test(`availability badge at ${width} px, ${zoom} text: one line, nothing cut, no horizontal scroll`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/");
      await page.evaluate((z) => (document.documentElement.style.fontSize = z), zoom);
      await page.waitForFunction(() => document.documentElement.classList.contains("fonts-ready"));
      await page.evaluate(() => document.fonts.ready);
      const badge = page.locator("#top p").nth(2);
      await expect(badge).toHaveText("[Open to software engineering roles]");
      const state = await badge.evaluate((p) => {
        // Flex items are separate boxes, so count line boxes per text node and compare their vertical centres.
        const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
        const rects: DOMRect[] = [];
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          const range = document.createRange();
          range.selectNodeContents(node);
          rects.push(...[...range.getClientRects()].filter((r) => r.width > 0));
        }
        const style = getComputedStyle(p);
        const centres = rects.map((r) => r.top + r.height / 2);
        const sameLine = Math.max(...centres) - Math.min(...centres) < parseFloat(style.lineHeight) / 2;
        return {
          lines: sameLine && rects.length === 3 ? 1 : rects.length,
          height: p.getBoundingClientRect().height,
          lineHeight: parseFloat(style.lineHeight),
          fontSize: parseFloat(style.fontSize),
          overflow: p.scrollWidth - p.clientWidth,
          right: p.getBoundingClientRect().right,
          docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      });
      expect(state.lines).toBe(1);
      expect(state.height).toBeLessThan(state.lineHeight * 1.5);
      expect(state.fontSize).toBeGreaterThanOrEqual(10.5);
      expect(state.overflow).toBe(0);
      expect(state.right).toBeLessThanOrEqual(width);
      expect(state.docOverflow).toBeLessThanOrEqual(0);
    });
  }
}

test("FIL-40: the contact email link is a target of at least 24×24 px at 360 px (WCAG 2.5.8)", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  const link = page.locator('#contact a[href^="mailto:"]');
  await link.scrollIntoViewIfNeeded();
  const rects = await link.evaluate((el) => [...el.getClientRects()].map((r) => ({ width: r.width, height: r.height })));
  expect(rects.length).toBeGreaterThan(0);
  for (const rect of rects) {
    expect(rect.width).toBeGreaterThanOrEqual(24);
    expect(rect.height).toBeGreaterThanOrEqual(24);
  }
});
