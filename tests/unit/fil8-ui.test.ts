import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { experience } from "@/content/experience";
import { companyInitials, companyLogo } from "@/lib/company-logos";

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
    expect(mapped.map(({ company }) => company)).toEqual(expect.arrayContaining(["Altyra Solutions", "Gigantic Digital Growth", "OCR – Technology and Productivity"]));
    for (const { logo } of mapped) {
      const file = path.join(process.cwd(), "public", logo.src);
      expect(existsSync(file)).toBe(true);
      const meta = await sharp(readFileSync(file)).metadata();
      expect([meta.format, meta.width, meta.height]).toEqual(["webp", logo.width, logo.height]);
    }
  });
});
