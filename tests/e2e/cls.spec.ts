import { expect, test } from "@playwright/test";

/**
 * Deep links land with a marquee h2 in view while it is still in the fallback face; when Anton takes
 * over after load, the copies after the title must not move (Sonar m2: CLS 0.05 on /#projects with an
 * unmatched fallback). The fallback faces are metric-matched in styles/globals.css.
 */
const HASHES = ["#projects", "#experience", "#skills"];
const MAX_CLS = 0.01;

test.describe("layout shift from the marquee font swap", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "the Layout Instability API is Chromium-only");

  for (const hash of HASHES) {
    test(`/${hash} stays under CLS ${MAX_CLS} through the font swap`, async ({ page }) => {
      await page.addInitScript(() => {
        const w = window as unknown as { __cls: number };
        w.__cls = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
            if (!entry.hadRecentInput) w.__cls += entry.value;
          }
        }).observe({ type: "layout-shift", buffered: true });
      });
      await page.goto(`/${hash}`, { waitUntil: "load" });
      await page.waitForFunction(() => document.documentElement.classList.contains("fonts-ready"));
      await page.evaluate(async () => {
        await document.fonts.ready;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      });
      // Anton really replaced the fallback (otherwise the test proves nothing).
      expect(await page.evaluate(() => [...document.fonts].some((font) => font.family.replace(/["']/g, "") === "anton" && font.status === "loaded"))).toBe(true);
      const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
      expect(cls).toBeLessThan(MAX_CLS);
    });
  }
});
