/**
 * Hero photo: a brutalist treatment of Filipe's real photo, image processing only (face-first crop, tone
 * curve, duotone or black and white over the whole frame, background included, seeded grain); no generative or AI step.
 * The source stays outside the repo (ASSETS.md), so pass it with --source=<file>. Writes a small processed
 * master to assets/originals/profile/ and the displayed sizes (AVIF + WebP, 1x and 2x) to public/images/profile/.
 * `--treatment=bw|duotone --out=<dir>` only writes a preview there (used for the option comparison).
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { HERO_PHOTO, heroPhotoPath } from "../lib/hero-photo";

const MASTER = "assets/originals/profile/filipe-bravo-hero.webp";
/** Face-first crop of the 1024×1536 source (4:5, like the display size), already at the master's width. */
const CROP = { left: 82, top: 120, width: HERO_PHOTO.masterWidth, height: 720 };
const NEAR_BLACK = [10, 10, 10] as const;
const WHITE = [245, 245, 245] as const;
const ACCENT = [0xff, 0x5a, 0x1f] as const;
const GRAIN = 8;

type Treatment = "bw" | "duotone";
type Rgb = readonly [number, number, number];

/** Treatment = [shadow colour, highlight colour]. */
const PALETTES: Record<Treatment, readonly [Rgb, Rgb]> = {
  bw: [NEAR_BLACK, WHITE],
  duotone: [NEAR_BLACK, ACCENT],
};

/** Steep S-curve: deep blacks, clipped highlights. */
const toneCurve = (luma: number) => {
  const t = Math.min(1, Math.max(0, (luma / 255 - 0.08) / 0.72));
  return t * t * (3 - 2 * t);
};

/** Deterministic noise (mulberry32), so the output is identical on every run. */
function seededNoise(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let r = Math.imul(state ^ (state >>> 15), 1 | state);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296 - 0.5;
  };
}

async function treat(source: string, treatment: Treatment) {
  const [shadow, highlight] = PALETTES[treatment];
  const grey = await sharp(source).extract(CROP).greyscale().normalise().raw().toBuffer();
  const out = Buffer.alloc(CROP.width * CROP.height * 3);
  const noise = seededNoise(2026);
  for (let i = 0; i < CROP.width * CROP.height; i++) {
    const t = Math.min(1, Math.max(0, toneCurve(grey[i]!) + (noise() * GRAIN) / 255));
    for (let c = 0; c < 3; c++) out[i * 3 + c] = Math.round(shadow[c]! + (highlight[c]! - shadow[c]!) * t);
  }
  return out;
}

const image = (pixels: Buffer) => sharp(pixels, { raw: { width: CROP.width, height: CROP.height, channels: 3 } });

const arg = (name: string) => {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
};

async function main(): Promise<void> {
  const source = arg("source");
  if (!source) throw new Error("Pass --source=<path to the original photo> (kept outside the repo, see ASSETS.md).");
  const treatment = (arg("treatment") ?? HERO_PHOTO.treatment) as Treatment;
  const outDir = arg("out");
  if (outDir) {
    await image(await treat(source, treatment)).png().toFile(path.join(outDir, `hero-${treatment}.png`));
    return;
  }
  fs.mkdirSync(path.dirname(MASTER), { recursive: true });
  // Every output is encoded once, from the treated pixels (not re-encoded from the lossy master).
  const pixels = await treat(source, treatment);
  await image(pixels).webp({ quality: 85 }).toFile(MASTER);
  for (const width of HERO_PHOTO.srcsetWidths) {
    const height = Math.round((width * HERO_PHOTO.height) / HERO_PHOTO.width);
    const resized = image(pixels).resize(width, height);
    const avif = await resized.clone().avif({ quality: 50, effort: 9 }).toFile(path.join("public", heroPhotoPath(width, "avif")));
    const webp = await resized.clone().webp({ quality: 56, effort: 6 }).toFile(path.join("public", heroPhotoPath(width, "webp")));
    console.log(`${width}×${height}: AVIF ${avif.size} bytes, WebP ${webp.size} bytes`);
  }
}

void main();
