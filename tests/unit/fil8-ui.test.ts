import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { experience } from "@/content/experience";
import { site } from "@/content/site";
import { companyInitials, companyLogo } from "@/lib/company-logos";
import { uiOr, type UiStrings } from "@/lib/content/ui";

describe("uiOr", () => {
  it("uses the site.ts value when the key exists", () => {
    expect(uiOr(site.ui, "heroCtaContact", "fallback")).toBe(site.ui.heroCtaContact);
  });
  it("falls back for a missing or blank key", () => {
    expect(uiOr(site.ui, "noSuchKey", "fallback")).toBe("fallback");
    expect(uiOr({ ...site.ui, blank: "  " } as UiStrings, "blank", "fallback")).toBe("fallback");
  });
});

describe("company logos", () => {
  it("initials: first letter of the first two words that start with a letter", () => {
    expect(companyInitials("Gigantic Digital Growth")).toBe("GD");
    expect(companyInitials("OCR – Technology and Productivity")).toBe("OT");
    expect(companyInitials("Altyra")).toBe("A");
  });

  it("every mapped logo belongs to a company in content/experience.ts and matches its file", async () => {
    const companies = new Set(experience.map((item) => item.company));
    const mapped = [...companies].flatMap((company) => {
      const logo = companyLogo(company);
      return logo ? [{ company, logo }] : [];
    });
    expect(mapped.map(({ company }) => company)).toEqual(expect.arrayContaining(["Altyra Solutions", "Gigantic Digital Growth"]));
    for (const { company, logo } of mapped) {
      expect(logo.alt).toBe(`${company} logo`);
      const file = path.join(process.cwd(), "public", logo.src);
      expect(existsSync(file)).toBe(true);
      const meta = await sharp(readFileSync(file)).metadata();
      expect([meta.format, meta.width, meta.height]).toEqual(["webp", logo.width, logo.height]);
    }
  });
});
