import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import matter from "gray-matter";
import { publishedAssetPaths, readProjectAssets } from "../../lib/publish-assets";

const PROJECTS_DIR = "content/projects";

/** Reads the status from the content itself, so the test follows drafts being published. */
const projects = fs
  .readdirSync(PROJECTS_DIR)
  .filter((name) => name.endsWith(".mdx") && !name.startsWith("_"))
  .map((name) => ({
    slug: name.slice(0, -".mdx".length),
    published: matter(fs.readFileSync(path.join(PROJECTS_DIR, name), "utf8")).data.status === "published",
  }));
const drafts = projects.filter((p) => !p.published).map((p) => p.slug);
const published = projects.filter((p) => p.published).map((p) => p.slug);

async function hrefs(page: Page): Promise<string[]> {
  return page.locator("a[href]").evaluateAll((links) => links.map((link) => (link as HTMLAnchorElement).pathname));
}

test.describe("drafts", () => {
  // Once every project is published there is nothing to hide; the other checks still run.
  test.skip(drafts.length === 0, "no drafts left");
  for (const slug of drafts) {
    test(`draft "${slug}" is a 404, page and OG image`, async ({ request }) => {
      expect((await request.get(`/projects/${slug}`)).status()).toBe(404);
      expect((await request.get(`/projects/${slug}/opengraph-image`)).status()).toBe(404);
      expect((await request.get(`/projects/${slug}/opengraph-image/card`)).status()).toBe(404);
    });
  }
});

test("an unknown slug's OG image is a 404", async ({ request }) => {
  expect((await request.get("/projects/does-not-exist/opengraph-image")).status()).toBe(404);
  expect((await request.get("/projects/does-not-exist/opengraph-image/card")).status()).toBe(404);
  expect((await request.get(`/projects/${published[0]}/opengraph-image/other`)).status()).toBe(404);
});

test("published OG images render", async ({ request }) => {
  for (const slug of published) {
    const response = await request.get(`/projects/${slug}/opengraph-image/card`);
    expect(response.status(), slug).toBe(200);
    expect(response.headers()["content-type"]).toContain("image/png");
  }
});

test("no page links to a draft", async ({ page }) => {
  for (const route of ["/", ...published.map((slug) => `/projects/${slug}`)]) {
    await page.goto(route);
    const linked = await hrefs(page);
    for (const slug of drafts) expect(linked, `${route} links to ${slug}`).not.toContain(`/projects/${slug}`);
  }
});

test("the sitemap lists published case studies only", async ({ request }) => {
  const sitemap = await (await request.get("/sitemap.xml")).text();
  for (const slug of published) expect(sitemap).toContain(`/projects/${slug}`);
  for (const slug of drafts) expect(sitemap).not.toContain(`/projects/${slug}<`);
});

test("no draft badge in production", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Draft", { exact: true })).toHaveCount(0);
});

test.describe("rendered assets (Sonar f49)", () => {
  const all = publishedAssetPaths(readProjectAssets(process.cwd()), true);
  const shipped = publishedAssetPaths(readProjectAssets(process.cwd()), false);
  const draftAssets = all.filter((src) => !shipped.includes(src));

  test("draft covers and diagrams are a 404", async ({ request }) => {
    test.skip(draftAssets.length === 0, "no drafts left");
    for (const src of draftAssets) expect((await request.get(src)).status(), src).toBe(404);
  });

  test("published covers and diagrams are served with the locked-down CSP", async ({ request }) => {
    expect(shipped.length).toBeGreaterThan(0);
    for (const src of shipped) {
      const response = await request.get(src);
      expect(response.status(), src).toBe(200);
      expect(response.headers()["content-security-policy"], src).toBe("default-src 'none'; style-src 'unsafe-inline'");
    }
  });

  test("covers, diagrams and the portrait still render through <img>", async ({ page }) => {
    for (const route of ["/", ...published.map((slug) => `/projects/${slug}`)]) {
      await page.goto(route);
      const images = page.locator("main img");
      const count = await images.count();
      for (let i = 0; i < count; i++) {
        const image = images.nth(i);
        await image.scrollIntoViewIfNeeded();
        await expect.poll(() => image.evaluate((el) => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth), `${route} img ${i}`).toBeGreaterThan(0);
      }
    }
  });
});

test("case studies have their own og:image:alt and twitter:image:alt, and the image they point at renders (QA r2 N3)", async ({ page, request }) => {
  const alts = new Set<string>();
  for (const slug of published) {
    await page.goto(`/projects/${slug}`);
    const title = (await page.locator("h1").first().textContent())?.trim() ?? "";
    const ogAlt = await page.locator('meta[property="og:image:alt"]').getAttribute("content");
    const twAlt = await page.locator('meta[name="twitter:image:alt"]').getAttribute("content");
    expect(title.length, slug).toBeGreaterThan(0);
    expect(ogAlt, slug).toContain(title);
    expect(twAlt, slug).toBe(ogAlt);
    alts.add(ogAlt ?? "");
    const image = new URL((await page.locator('meta[property="og:image"]').getAttribute("content")) ?? "");
    expect(image.pathname, slug).toBe(`/projects/${slug}/opengraph-image/card`);
    const response = await request.get(image.pathname);
    expect(response.status(), slug).toBe(200);
  }
  expect(alts.size).toBe(published.length);
});
