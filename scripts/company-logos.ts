/**
 * Experience logos: writes each company logo at 1x and 2x of its display box (lossless WebP; never upscaled, so a small master caps its 2x file) from the masters
 * in assets/originals/companies/ (sources in ASSETS.md). Trimmed and resized only; no other edits. `--check` fails
 * when a committed file differs from what this would write (build:production runs it).
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { COMPANY_LOGO_BOX, companyLogoPath, LOGO_FILES } from "../lib/company-logos";

const MASTERS = "assets/originals/companies";

async function main(): Promise<void> {
  const check = process.argv.includes("--check");
  const stale: string[] = [];
  fs.mkdirSync("public/images/companies", { recursive: true });
  for (const [slug, { master }] of Object.entries(LOGO_FILES)) {
    const trimmed = await sharp(path.join(MASTERS, master)).trim().png().toBuffer();
    for (const scale of [1, 2] as const) {
      const box = COMPANY_LOGO_BOX * scale;
      const { data, info } = await sharp(trimmed)
        .resize(box, box, { fit: "inside", withoutEnlargement: true })
        .webp({ lossless: true, effort: 6 })
        .toBuffer({ resolveWithObject: true });
      const file = path.join("public", companyLogoPath(slug, scale));
      if (check) {
        if (!fs.existsSync(file) || !fs.readFileSync(file).equals(data)) stale.push(file);
        continue;
      }
      fs.writeFileSync(file, data);
      console.log(`${slug} @${scale}x: ${info.width}×${info.height}, ${info.size} bytes`);
    }
  }
  if (!check) return;
  if (stale.length > 0) {
    console.error(`Company logos are stale: ${stale.join(", ")}. Run pnpm logos.`);
    process.exitCode = 1;
  } else console.log("Company logos are current.");
}

void main();
