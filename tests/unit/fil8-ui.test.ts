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

  it("Gigantic keeps its yellow colours with solid letters; the other logos stay monochrome", async () => {
    expect(companyLogo("Gigantic Digital Growth")?.keepColours).toBe(true);
    expect(companyLogo("Altyra Solutions")?.keepColours).toBeUndefined();
    expect(companyLogo("OCR – Technology and Productivity")?.keepColours).toBeUndefined();
    const { data, info } = await sharp(path.join(process.cwd(), "public/images/companies/gigantic-digital-growth.webp"))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    expect(nonOpaqueInsideOutline(data, info.width, info.height)).toBe(0);
  });
});

/** Pixels with alpha < 255 that the transparent outside cannot reach: holes or see-through areas inside the logo. */
function nonOpaqueInsideOutline(rgba: Buffer, width: number, height: number): number {
  const seeThrough = (i: number) => rgba[i * 4 + 3]! < 255;
  const reached = new Uint8Array(width * height);
  const queue: number[] = [];
  for (let i = 0; i < width * height; i++) {
    const x = i % width;
    const y = Math.floor(i / width);
    const onEdge = x === 0 || y === 0 || x === width - 1 || y === height - 1;
    if (onEdge && seeThrough(i)) {
      reached[i] = 1;
      queue.push(i);
    }
  }
  while (queue.length > 0) {
    const i = queue.pop()!;
    const x = i % width;
    const neighbours = [x > 0 ? i - 1 : -1, x < width - 1 ? i + 1 : -1, i - width, i + width];
    for (const n of neighbours) {
      if (n >= 0 && n < width * height && !reached[n] && seeThrough(n)) {
        reached[n] = 1;
        queue.push(n);
      }
    }
  }
  let inside = 0;
  for (let i = 0; i < width * height; i++) if (seeThrough(i) && !reached[i]) inside++;
  return inside;
}
