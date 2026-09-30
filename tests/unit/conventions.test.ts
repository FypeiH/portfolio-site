import { describe, expect, it } from "vitest";
import { avatarThumbPath, isYearMonth, projectFile, SLUG_PATTERN } from "@/lib/content/conventions";

describe("content conventions", () => {
  it("derives the 224 px avatar thumbnail path", () => {
    expect(avatarThumbPath("/images/profile/filipe-bravo.webp")).toBe("/images/profile/filipe-bravo-224.webp");
    expect(avatarThumbPath("/images/me.jpg")).toBe("/images/me-224.webp");
  });

  it("accepts calendar months only", () => {
    expect(isYearMonth("2026-09")).toBe(true);
    expect(isYearMonth("2026-13")).toBe(false);
    expect(isYearMonth("{{TODO}}")).toBe(false);
  });

  it("matches kebab-case slugs and maps them to MDX files", () => {
    expect(SLUG_PATTERN.test("email-scraper")).toBe(true);
    expect(SLUG_PATTERN.test("Email_Scraper")).toBe(false);
    expect(projectFile("fidu-bot")).toBe("content/projects/fidu-bot.mdx");
  });
});
