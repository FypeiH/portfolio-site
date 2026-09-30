import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import matter from "gray-matter";

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
    });
  }
});

test("an unknown slug's OG image is a 404", async ({ request }) => {
  expect((await request.get("/projects/does-not-exist/opengraph-image")).status()).toBe(404);
});

test("published OG images render", async ({ request }) => {
  for (const slug of published) {
    const response = await request.get(`/projects/${slug}/opengraph-image`);
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
