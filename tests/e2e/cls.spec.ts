import { expect, test, type Page } from "@playwright/test";

/**
 * Deep links land with a marquee h2 in view while it is still in the fallback face; when Anton takes
 * over after load, the copies after the title must not move (Sonar m2: CLS 0.05 on /#projects with an
 * unmatched fallback). The fallback faces are metric-matched in styles/globals.css.
 *
 * Each face is forced in turn by injecting a stylesheet into the HTML response, so the three faces are
 * covered on any machine that has Arial Narrow (or Liberation Sans Narrow / Nimbus Sans Narrow), Arial
 * (or Liberation Sans / Arimo) and Roboto. A face whose local font is missing is skipped, not passed.
 */
const HASHES = ["#projects", "#experience", "#skills"];
const MAX_CLS = 0.01;
const FACES = ["Anton Fallback Narrow", "Anton Fallback", "Anton Fallback Roboto"];

type ClsWindow = Window & { __cls: number };

/**
 * Desktop runs use 1350×940: at Playwright's default 1280×720 the copies that move on /#projects are
 * outside the viewport, so even an unmatched fallback measures ~0 (the control test below checks the
 * measurement can see a shift).
 */
const DESKTOP_VIEWPORT = { width: 1350, height: 940 };

async function measure(page: Page, url: string, family?: string, isMobile = false) {
  if (!isMobile) await page.setViewportSize(DESKTOP_VIEWPORT);
  if (family) {
    const stack = family === "monospace" ? family : `"${family}", sans-serif`;
    // Both the pre-load stack and Anton's own (next/font appends its fallbacks to --font-anton), so the
    // forced face is the only one used before and during the swap.
    const css = `<style>:root{--font-display-fallback:${stack} !important;--font-anton:"anton",${stack} !important;--font-display:var(--font-anton) !important}</style>`;
    await page.route(url.split("#")[0] ?? url, async (route) => {
      const response = await route.fetch();
      await route.fulfill({ response, body: (await response.text()).replace("</head>", `${css}</head>`) });
    });
  }
  await page.addInitScript(() => {
    const w = window as unknown as ClsWindow;
    w.__cls = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
        if (!entry.hadRecentInput) w.__cls += entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
  await page.goto(url, { waitUntil: "load" });
  await page.waitForFunction(() => document.documentElement.classList.contains("fonts-ready"));
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });
  const loaded = await page.evaluate(() => [...document.fonts].filter((font) => font.status === "loaded").map((font) => font.family.replace(/["']/g, "")));
  const cls = await page.evaluate(() => (window as unknown as ClsWindow).__cls);
  return { loaded, cls };
}

test.describe("layout shift from the marquee font swap", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "the Layout Instability API is Chromium-only");

  for (const hash of HASHES) {
    test(`/${hash} stays under CLS ${MAX_CLS} through the font swap`, async ({ page, baseURL, isMobile }) => {
      const { loaded, cls } = await measure(page, `${baseURL}/${hash}`, undefined, isMobile);
      // Anton really replaced the fallback (otherwise the test proves nothing).
      expect(loaded).toContain("anton");
      expect(cls).toBeLessThan(MAX_CLS);
    });
  }

  for (const family of FACES) {
    test(`forced "${family}": /#projects stays under CLS ${MAX_CLS}`, async ({ page, baseURL, isMobile }) => {
      const { loaded, cls } = await measure(page, `${baseURL}/#projects`, family, isMobile);
      test.skip(!loaded.includes(family), `no local font behind "${family}" on this machine`);
      expect(loaded).toContain("anton");
      expect(cls).toBeLessThan(MAX_CLS);
    });
  }

  test("control: an unmatched fallback would shift (the measurement can see it)", async ({ page, baseURL, isMobile }) => {
    test.skip(isMobile, "the marquee copies that move are off-screen on a phone");
    const { cls } = await measure(page, `${baseURL}/#projects`, "monospace");
    expect(cls).toBeGreaterThan(MAX_CLS);
  });
});
