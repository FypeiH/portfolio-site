import { MONOGRAM_GLYPHS } from "@/lib/monogram-glyphs";

/**
 * "FB" monogram: Anton F and B as outlines (lib/monogram-glyphs.ts), in the site palette. `full` is the
 * header mark and the apple-touch icon (near-black tile, accent border and letters); `small` is the favicon,
 * simplified to stay readable at 16 and 32 px (accent tile, near-black letters, no border, wider gap).
 */
export type MonogramVariant = "full" | "small";

const ACCENT = "#ff5a1f";
const INK = "#0a0a0a";

interface VariantSpec {
  size: number;
  tile: string;
  letters: string;
  border?: number;
  capHeight: number;
  /** Space between F and B in glyph units (cap height = 100). */
  gap: number;
}

const VARIANTS: Record<MonogramVariant, VariantSpec> = {
  full: { size: 64, tile: INK, letters: ACCENT, border: 4, capHeight: 34, gap: 6 },
  small: { size: 32, tile: ACCENT, letters: INK, capHeight: 24, gap: 9 },
};

export interface MonogramLayout {
  size: number;
  tile: string;
  letters: string;
  border?: { width: number; colour: string };
  glyphs: { d: string; transform: string }[];
}

export function monogramLayout(variant: MonogramVariant): MonogramLayout {
  const spec = VARIANTS[variant];
  const scale = spec.capHeight / 100;
  const { F, B } = MONOGRAM_GLYPHS;
  const width = (F.width + spec.gap + B.width) * scale;
  const left = (spec.size - width) / 2;
  const top = (spec.size - spec.capHeight) / 2;
  const at = (x: number) => `translate(${round(x)} ${round(top)}) scale(${scale})`;
  return {
    size: spec.size,
    tile: spec.tile,
    letters: spec.letters,
    border: spec.border ? { width: spec.border, colour: ACCENT } : undefined,
    glyphs: [
      { d: F.d, transform: at(left) },
      { d: B.d, transform: at(left + (F.width + spec.gap) * scale) },
    ],
  };
}

/** Standalone SVG markup (favicon file and raster icons). */
export function monogramSvg(variant: MonogramVariant): string {
  const { size, tile, letters, border, glyphs } = monogramLayout(variant);
  const frame = border
    ? `<rect x="${border.width / 2}" y="${border.width / 2}" width="${size - border.width}" height="${size - border.width}" fill="${tile}" stroke="${border.colour}" stroke-width="${border.width}"/>`
    : `<rect width="${size}" height="${size}" fill="${tile}"/>`;
  const paths = glyphs.map((glyph) => `<path transform="${glyph.transform}" d="${glyph.d}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">${frame}<g fill="${letters}">${paths}</g></svg>\n`;
}

const round = (value: number) => Math.round(value * 100) / 100;
