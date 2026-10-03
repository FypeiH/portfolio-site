/**
 * Writes the project covers declared in lib/project-covers.ts to public/covers/<slug>.{svg,webp}
 * and records the source hashes in assets/project-covers.json. Deterministic: same sources, same
 * files. `pnpm covers --check` only verifies that every cover is current (also run by the unit tests).
 * Colours are the site tokens (styles/globals.css); an <img> can't read CSS variables, so they are
 * repeated here.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { COVER_HEIGHT as H, COVER_SOURCES, COVER_WIDTH as W, coverPath, type CoverSlug, type CoverSource } from "../lib/project-covers";
import { COVERS_MANIFEST, sha256File, staleCoverReasons, type CoversManifest } from "../lib/project-covers-manifest";

const TOKENS = { bg: "#0a0a0a", surface: "#141414", fg: "#f2f2f2", border: "#2e2e2e" } as const;
const COLUMNS = 12;
const FRAME = 400; // logo frame, px
const FRAME_BORDER = 4;
const FRAME_SHADOW = 12; // hard shadow offset, no blur
const LOGO_PADDING = 64;
const DIAGRAM_PADDING = { x: 96, y: 48 };

/** Surface background with 1 px 12-column guides (hard lines, no gradient). */
function background(): string {
  const guides = Array.from({ length: COLUMNS - 1 }, (_, i) => {
    const x = Math.round(((i + 1) * W) / COLUMNS) + 0.5;
    return `<line x1="${x}" y1="0" x2="${x}" y2="${H}"/>`;
  }).join("");
  return `<rect width="${W}" height="${H}" fill="${TOKENS.surface}"/><g stroke="${TOKENS.border}" stroke-width="1">${guides}</g>`;
}

/** Re-roots an SVG document as a nested <svg> placed at x/y with the given box (keeps its viewBox). */
function nestSvg(source: string, box: { x: number; y: number; width: number; height: number }): string {
  const svg = source.replace(/<!--[\s\S]*?-->/g, "").trim();
  return svg.replace(/^<svg\b([^>]*)>/, (_, attrs: string) => {
    const kept = attrs.replace(/\s(?:width|height|x|y|style)="[^"]*"/g, "");
    return `<svg${kept} x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" preserveAspectRatio="xMidYMid meet">`;
  });
}

function frame(inner: string, fill: string): string {
  const x = (W - FRAME) / 2;
  const y = (H - FRAME) / 2;
  return [
    `<rect x="${x + FRAME_SHADOW}" y="${y + FRAME_SHADOW}" width="${FRAME}" height="${FRAME}" fill="${TOKENS.fg}"/>`,
    `<rect x="${x}" y="${y}" width="${FRAME}" height="${FRAME}" fill="${fill}"/>`,
    inner,
    `<rect x="${x + FRAME_BORDER / 2}" y="${y + FRAME_BORDER / 2}" width="${FRAME - FRAME_BORDER}" height="${FRAME - FRAME_BORDER}" fill="none" stroke="${TOKENS.fg}" stroke-width="${FRAME_BORDER}"/>`,
  ].join("");
}

const document = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${background()}${body}</svg>\n`;

function composeSvg(source: CoverSource): string {
  const text = fs.readFileSync(source.file, "utf8");
  if (source.kind === "diagram") {
    return document(nestSvg(text, { x: DIAGRAM_PADDING.x, y: DIAGRAM_PADDING.y, width: W - 2 * DIAGRAM_PADDING.x, height: H - 2 * DIAGRAM_PADDING.y }));
  }
  const inner = FRAME - 2 * LOGO_PADDING;
  return document(frame(nestSvg(text, { x: (W - inner) / 2, y: (H - inner) / 2, width: inner, height: inner }), TOKENS.bg));
}

async function composeRaster(source: CoverSource): Promise<Buffer> {
  const png = await sharp(source.file).resize(FRAME, FRAME, { fit: "cover" }).png().toBuffer();
  const x = (W - FRAME) / 2;
  const y = (H - FRAME) / 2;
  const image = `<image x="${x}" y="${y}" width="${FRAME}" height="${FRAME}" href="data:image/png;base64,${png.toString("base64")}"/>`;
  return sharp(Buffer.from(document(frame(image, TOKENS.bg)))).webp({ quality: 82, effort: 6 }).toBuffer();
}

async function main(): Promise<void> {
  if (process.argv.includes("--check")) {
    const reasons = staleCoverReasons();
    if (reasons.length) {
      console.error(`Project covers are stale (run pnpm covers):\n  ${reasons.join("\n  ")}`);
      process.exitCode = 1;
    } else console.log("Project covers are current.");
    return;
  }
  const manifest: CoversManifest = {};
  for (const slug of Object.keys(COVER_SOURCES) as CoverSlug[]) {
    const source: CoverSource = COVER_SOURCES[slug];
    const output = path.join("public", coverPath(slug));
    fs.mkdirSync(path.dirname(output), { recursive: true });
    const data = source.kind === "logo-raster" ? await composeRaster(source) : composeSvg(source);
    fs.writeFileSync(output, data);
    manifest[slug] = { source: source.file, sha256: sha256File(source.file) };
    console.log(`${output}: ${W}×${H}, ${Buffer.byteLength(data)} bytes`);
  }
  fs.writeFileSync(COVERS_MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
}

void main();
