import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { CASE_STUDY } from "./helpers";

for (const path of ["/", CASE_STUDY, "/projects/benched", "/does-not-exist"]) {
  test(`axe: no serious or critical violations on ${path}`, async ({ page }) => {
    await page.goto(path);
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    const blocking = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(blocking.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
  });
}

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
  const photo = page.getByRole("img", { name: "Portrait of Filipe Bravo" });
  await expect(photo).toHaveAttribute("width", "112");
  await expect(photo).toHaveAttribute("height", "112");
});
