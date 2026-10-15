import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { experience } from "@/content/experience";
import { COMPANY_LOGO_BOX, companyInitials, companyLogo, companyLogoPath, LOGO_FILES } from "@/lib/company-logos";

describe("company logos", () => {
  it("no content, code or UI string spells the OCR name as its wordmark does", () => {
    const dirs = ["content", "components", "lib", "app"];
    const files = dirs.flatMap((dir) => readdirSync(path.join(process.cwd(), dir), { recursive: true, encoding: "utf8" }).map((file) => path.join(dir, file)));
    const offenders = files.filter((file) => /\.(ts|tsx|mdx?|json)$/.test(file) && /Tecnology/i.test(readFileSync(path.join(process.cwd(), file), "utf8")));
    expect(offenders).toEqual([]);
    expect(experience.map((item) => item.company)).toContain("OCR – Technology and Productivity");
  });

  it("initials: first letter of the first two words that start with a letter", () => {
    expect(companyInitials("Gigantic Digital Growth")).toBe("GD");
    expect(companyInitials("OCR – Technology and Productivity")).toBe("OT");
    expect(companyInitials("Altyra")).toBe("A");
  });

  it("the logo box is 112 px, the smallest at which Gigantic's DIGITAL GROWTH reads at DPR 1", () => {
    expect(COMPANY_LOGO_BOX).toBe(112);
  });

  it("every mapped logo belongs to a company in content/experience.ts and matches its file", async () => {
    const companies = new Set(experience.map((item) => item.company));
    const mapped = [...companies].flatMap((company) => {
      const logo = companyLogo(company);
      return logo ? [{ company, logo }] : [];
    });
    expect(mapped.map(({ company }) => company)).toEqual(expect.arrayContaining(["Altyra Solutions", "Gigantic Digital Growth", "OCR – Technology and Productivity"]));
    for (const { logo } of mapped) {
      for (const scale of [1, 2] as const) {
        const file = path.join(process.cwd(), "public", companyLogoPath(logo.slug, scale));
        expect(existsSync(file)).toBe(true);
        const meta = await sharp(readFileSync(file)).metadata();
        expect(meta.format).toBe("webp");
        if (scale === 1) {
          expect(Math.max(meta.width!, meta.height!)).toBe(COMPANY_LOGO_BOX);
          expect([meta.width, meta.height]).toEqual([logo.width, logo.height]);
        } else {
          // 2x of the box, or the trimmed master's own size when that is smaller (never upscaled).
          const master = await sharp(path.join(process.cwd(), "assets/originals/companies", LOGO_FILES[logo.slug]!.master)).trim().toBuffer({ resolveWithObject: true });
          expect(Math.max(meta.width!, meta.height!)).toBe(Math.min(COMPANY_LOGO_BOX * 2, Math.max(master.info.width, master.info.height)));
          expect(Math.abs(meta.height! - (meta.width! * logo.height) / logo.width)).toBeLessThanOrEqual(1.5);
        }
      }
    }
  });

  it("Gigantic keeps its yellow colours on the same dark tile; the other logos stay monochrome", () => {
    expect(companyLogo("Gigantic Digital Growth")?.keepColours).toBe(true);
    expect(companyLogo("Altyra Solutions")?.keepColours).toBeUndefined();
    expect(companyLogo("OCR – Technology and Productivity")?.keepColours).toBeUndefined();
  });
});
