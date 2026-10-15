/**
 * Experience logos: writes each company logo at 1x and 2x of its display box (lossless WebP; never upscaled, so a small master caps its 2x file) from the masters
 * in assets/originals/companies/ (sources in ASSETS.md). Trimmed and resized only; no other edits.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { COMPANY_LOGO_BOX, companyLogoPath, LOGO_FILES } from "../lib/company-logos";

const MASTERS = "assets/originals/companies";

async function main(): Promise<void> {
  fs.mkdirSync("public/images/companies", { recursive: true });
  for (const [slug, { master }] of Object.entries(LOGO_FILES)) {
    const trimmed = await sharp(path.join(MASTERS, master)).trim().png().toBuffer();
    for (const scale of [1, 2] as const) {
      const box = COMPANY_LOGO_BOX * scale;
      const resized = sharp(trimmed).resize(box, box, { fit: "inside", withoutEnlargement: true });
      const info = await resized.webp({ lossless: true, effort: 6 }).toFile(path.join("public", companyLogoPath(slug, scale)));
      console.log(`${slug} @${scale}x: ${info.width}×${info.height}, ${info.size} bytes`);
    }
  }
}

void main();
