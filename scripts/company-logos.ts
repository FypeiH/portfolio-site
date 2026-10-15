/**
 * Experience logos: writes each company logo at 1x and 2x of its display box (lossless WebP) from the masters
 * in assets/originals/companies/ (sources in ASSETS.md). Gigantic's letters are made fully opaque first (pixels
 * the transparent outside can't reach), so they render solid on the light tile.
 */
import fs from "node:fs";
import path from "node:path";
import sharp, { type Sharp } from "sharp";
import { COMPANY_LOGO_BOX, companyLogoPath, LOGO_FILES } from "../lib/company-logos";

const MASTERS = "assets/originals/companies";

/** Alpha < 255 pixels connected to the image border; everything else is inside the logo. */
function outsideMask(rgba: Buffer, width: number, height: number): Uint8Array {
  const seeThrough = (i: number) => rgba[i * 4 + 3]! < 255;
  const reached = new Uint8Array(width * height);
  const queue: number[] = [];
  for (let i = 0; i < width * height; i++) {
    const x = i % width;
    const y = Math.floor(i / width);
    if ((x === 0 || y === 0 || x === width - 1 || y === height - 1) && seeThrough(i)) {
      reached[i] = 1;
      queue.push(i);
    }
  }
  while (queue.length > 0) {
    const i = queue.pop()!;
    const x = i % width;
    for (const n of [x > 0 ? i - 1 : -1, x < width - 1 ? i + 1 : -1, i - width, i + width]) {
      if (n >= 0 && n < width * height && !reached[n] && seeThrough(n)) {
        reached[n] = 1;
        queue.push(n);
      }
    }
  }
  return reached;
}

async function solidInside(input: Sharp): Promise<Sharp> {
  const { data, info } = await input.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const outside = outsideMask(data, info.width, info.height);
  for (let i = 0; i < info.width * info.height; i++) if (!outside[i]) data[i * 4 + 3] = 255;
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } });
}

async function main(): Promise<void> {
  fs.mkdirSync("public/images/companies", { recursive: true });
  for (const [slug, { master, solidLetters }] of Object.entries(LOGO_FILES)) {
    let image = sharp(path.join(MASTERS, master)).trim();
    if (solidLetters) image = await solidInside(image);
    const trimmed = await image.png().toBuffer();
    for (const scale of [1, 2] as const) {
      const box = COMPANY_LOGO_BOX * scale;
      let resized = sharp(await sharp(trimmed).resize(box, box, { fit: "inside" }).png().toBuffer());
      // Resampling can leave letter edges a touch see-through again; seal them at the final size too.
      if (solidLetters) resized = await solidInside(resized);
      const info = await resized.webp({ lossless: true, effort: 6 }).toFile(path.join("public", companyLogoPath(slug, scale)));
      console.log(`${slug} @${scale}x: ${info.width}×${info.height}, ${info.size} bytes`);
    }
  }
}

void main();
