/**
 * Hero photo: a brutalist treatment of Filipe's real photo, image processing only (crop, hand-drawn
 * silhouette mask, tone curve, duotone or black and white, seeded grain); no generative or AI step.
 * The source stays outside the repo (ASSETS.md), so pass it with --source=<file>. Writes a small processed
 * master to assets/originals/profile/ and the displayed sizes (AVIF + WebP, 1x and 2x) to public/images/profile/.
 * `--treatment=bw|duotone --out=<dir>` only writes a preview there (used for the option comparison).
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { HERO_PHOTO, heroPhotoPath } from "../lib/hero-photo";

const MASTER = "assets/originals/profile/filipe-bravo-hero.webp";
/** Head and shoulders in the 1024×1536 source. */
const CROP = { left: 0, top: 80, width: 800, height: 1000 };
/** Silhouette of head and shoulders in crop pixels, traced by hand; everything outside is background. */
const SILHOUETTE = [
  [0, 1000], [0, 600], [50, 575], [110, 545], [150, 525], [160, 470], [150, 420], [150, 360], [118, 320], [115, 250],
  [130, 180], [170, 120], [230, 85], [300, 68], [380, 68], [450, 92], [510, 135], [560, 195], [588, 260], [585, 310],
  [560, 345], [553, 385], [553, 440], [525, 445], [510, 470], [500, 495], [478, 505], [470, 530], [465, 550], [455, 580],
  [460, 600], [520, 595], [600, 605], [660, 630], [710, 670], [760, 730], [800, 790], [800, 1000],
] as const;
const FEATHER = 2;
const NEAR_BLACK = [10, 10, 10] as const;
const WHITE = [245, 245, 245] as const;
const ACCENT = [0xff, 0x5a, 0x1f] as const;
const GRAIN = 12;

type Treatment = "bw" | "duotone";
type Rgb = readonly [number, number, number];

/** Treatment = [shadow colour, highlight colour, background colour]. */
const PALETTES: Record<Treatment, readonly [Rgb, Rgb, Rgb]> = {
  bw: [NEAR_BLACK, WHITE, WHITE],
  duotone: [NEAR_BLACK, ACCENT, NEAR_BLACK],
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

async function silhouetteMask(): Promise<Buffer> {
  const points = SILHOUETTE.map(([x, y]) => `${x},${y}`).join(" ");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${CROP.width}" height="${CROP.height}"><polygon points="${points}" fill="#fff"/></svg>`;
  return sharp(Buffer.from(svg)).blur(FEATHER).greyscale().raw().toBuffer();
}

async function treat(source: string, treatment: Treatment) {
  const [shadow, highlight, background] = PALETTES[treatment];
  const grey = await sharp(source).extract(CROP).greyscale().normalise().raw().toBuffer();
  const mask = await silhouetteMask();
  const out = Buffer.alloc(CROP.width * CROP.height * 3);
  const noise = seededNoise(2026);
  for (let i = 0; i < CROP.width * CROP.height; i++) {
    const t = Math.min(1, Math.max(0, toneCurve(grey[i]!) + (noise() * GRAIN) / 255));
    const subject = mask[i]! / 255;
    for (let c = 0; c < 3; c++) {
      const tone = shadow[c]! + (highlight[c]! - shadow[c]!) * t;
      out[i * 3 + c] = Math.round(tone * subject + background[c]! * (1 - subject));
    }
  }
  return sharp(out, { raw: { width: CROP.width, height: CROP.height, channels: 3 } }).resize(HERO_PHOTO.masterWidth);
}

const arg = (name: string) => process.argv.find((value) => value.startsWith(`--${name}=`))?.split("=")[1];

async function main(): Promise<void> {
  const source = arg("source");
  if (!source) throw new Error("Pass --source=<path to the original photo> (kept outside the repo, see ASSETS.md).");
  const treatment = (arg("treatment") ?? HERO_PHOTO.treatment) as Treatment;
  const outDir = arg("out");
  if (outDir) {
    await (await treat(source, treatment)).png().toFile(path.join(outDir, `hero-${treatment}.png`));
    return;
  }
  fs.mkdirSync(path.dirname(MASTER), { recursive: true });
  await (await treat(source, treatment)).webp({ quality: 85 }).toFile(MASTER);
  for (const width of HERO_PHOTO.srcsetWidths) {
    const height = Math.round((width * HERO_PHOTO.height) / HERO_PHOTO.width);
    const resized = sharp(MASTER).resize(width, height);
    const avif = await resized.clone().avif({ quality: 55, effort: 9 }).toFile(path.join("public", heroPhotoPath(width, "avif")));
    const webp = await resized.clone().webp({ quality: 72, effort: 6 }).toFile(path.join("public", heroPhotoPath(width, "webp")));
    console.log(`${width}×${height}: AVIF ${avif.size} bytes, WebP ${webp.size} bytes`);
  }
}

void main();
