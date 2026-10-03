import fs from "node:fs";
import path from "node:path";
import { COVER_HEIGHT as H, COVER_WIDTH as W, type CoverSource } from "./project-covers";

/**
 * SVG composition of the project covers, shared by `pnpm covers` (writes them) and the staleness
 * check (regenerates every SVG cover in memory and compares bytes). Pure string building: same
 * inputs, same bytes. Colours are the site tokens (styles/globals.css); an <img> can't read CSS
 * variables, so they are repeated here.
 */
export const COVER_TOKENS = { bg: "#0a0a0a", surface: "#141414", surfaceStrong: "#1f1f1f", fg: "#f2f2f2", border: "#2e2e2e", accent: "#ff5a1f" } as const;
const T = COVER_TOKENS;
const COLUMNS = 12;
export const FRAME = 400; // logo frame, px
const FRAME_BORDER = 4;
const FRAME_SHADOW = 12; // hard shadow offset, no blur
const LOGO_PADDING = 64;
const DIAGRAM_PADDING = { x: 96, y: 48 };

export class UnsafeSvgError extends Error {}

/**
 * Makes an SVG document safe to nest in a cover: drops the `<?xml?>`/DOCTYPE prologue and comments,
 * and refuses anything that could run or fetch (scripts, foreignObject, on* handlers, href/url() that
 * isn't a local `#id` or `data:`, @import, href animation). Throws UnsafeSvgError, never silently strips.
 */
export function sanitizeSvg(source: string, file: string): string {
  const svg = source
    .replace(/^\uFEFF/, "")
    .replace(/<\?xml[\s\S]*?\?>/gi, "")
    .replace(/<!DOCTYPE[^[>]*(?:\[[\s\S]*?\])?\s*>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .trim();
  const problems: string[] = [];
  if (!/^<svg\b/.test(svg)) problems.push("does not start with <svg>");
  if (/<script\b/i.test(svg)) problems.push("<script>");
  if (/<foreignObject\b/i.test(svg)) problems.push("<foreignObject>");
  if (/<!ENTITY/i.test(svg)) problems.push("<!ENTITY>");
  for (const m of svg.matchAll(/\s(on[a-z]+)\s*=/gi)) problems.push(`${m[1]} handler`);
  for (const m of svg.matchAll(/\b((?:xlink:)?href)\s*=\s*(["'])([\s\S]*?)\2/gi)) {
    if (!/^(?:#|data:)/i.test((m[3] ?? "").trim())) problems.push(`${m[1]}="${m[3]}"`);
  }
  for (const m of svg.matchAll(/url\(\s*(["']?)([^)"']*)\1\s*\)/gi)) {
    if (!/^(?:#|data:)/i.test((m[2] ?? "").trim())) problems.push(`url(${m[2]})`);
  }
  if (/@import/i.test(svg)) problems.push("@import");
  if (/attributeName\s*=\s*["'](?:xlink:)?href["']/i.test(svg)) problems.push("href animation");
  if (problems.length) throw new UnsafeSvgError(`${file}: unsafe SVG source (${[...new Set(problems)].join(", ")})`);
  return svg;
}

/** Re-roots a sanitized SVG document as a nested <svg> placed in `box` (keeps its viewBox). */
export function nestSvg(source: string, file: string, box: { x: number; y: number; width: number; height: number }): string {
  return sanitizeSvg(source, file).replace(/^<svg\b([^>]*)>/, (_, attrs: string) => {
    const kept = attrs.replace(/\s(?:width|height|x|y|style|preserveAspectRatio)="[^"]*"/g, "");
    return `<svg${kept} x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" preserveAspectRatio="xMidYMid meet">`;
  });
}

/** Background: a flat token colour, optionally with 1 px 12-column guides (hard lines, no gradient). */
function background(fill: string, guides: boolean): string {
  const lines = guides
    ? `<g stroke="${T.border}" stroke-width="1">${Array.from({ length: COLUMNS - 1 }, (_, i) => {
        const x = Math.round(((i + 1) * W) / COLUMNS) + 0.5;
        return `<line x1="${x}" y1="0" x2="${x}" y2="${H}"/>`;
      }).join("")}</g>`
    : "";
  return `<rect width="${W}" height="${H}" fill="${fill}"/>${lines}`;
}

export interface FrameBox {
  x: number;
  y: number;
  size: number;
}

/** A square logo frame: hard shadow, fill, content, thick border. */
export function frame(inner: string, { x, y, size }: FrameBox, fill: string, shadow: string = T.fg): string {
  return [
    `<rect x="${x + FRAME_SHADOW}" y="${y + FRAME_SHADOW}" width="${size}" height="${size}" fill="${shadow}"/>`,
    `<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="${fill}"/>`,
    inner,
    `<rect x="${x + FRAME_BORDER / 2}" y="${y + FRAME_BORDER / 2}" width="${size - FRAME_BORDER}" height="${size - FRAME_BORDER}" fill="none" stroke="${T.fg}" stroke-width="${FRAME_BORDER}"/>`,
  ].join("");
}

export const centeredFrame: FrameBox = { x: (W - FRAME) / 2, y: (H - FRAME) / 2, size: FRAME };

export const coverDocument = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${body}</svg>\n`;

/** Background used by the raster (logo-raster) covers. */
export const rasterBackground = () => background(T.surface, true);

/** The SVG cover for an SVG-based source; `read` resolves a repo-relative file (injected for tests). */
export function composeSvgCover(source: CoverSource, read: (file: string) => string): string {
  if (source.kind === "diagram") {
    const box = { x: DIAGRAM_PADDING.x, y: DIAGRAM_PADDING.y, width: W - 2 * DIAGRAM_PADDING.x, height: H - 2 * DIAGRAM_PADDING.y };
    return coverDocument(background(T.surface, true) + nestSvg(read(source.file), source.file, box));
  }
  if (source.kind !== "logo-svg") throw new Error(`${source.file}: not an SVG cover source`);
  const logoIn = (box: FrameBox) => {
    const inner = box.size - 2 * LOGO_PADDING;
    return nestSvg(read(source.file), source.file, { x: box.x + LOGO_PADDING, y: box.y + LOGO_PADDING, width: inner, height: inner });
  };
  if (!source.backdrop) {
    // Logo alone, on the page colour without guides, accent shadow.
    return coverDocument(background(T.bg, false) + frame(logoIn(centeredFrame), centeredFrame, T.surfaceStrong, T.accent));
  }
  // Logo frame on the left, the project's diagram on the right, over the guided surface.
  const size = 336;
  const box: FrameBox = { x: 96, y: (H - size) / 2, size };
  const diagramX = box.x + size + 72;
  const diagram = nestSvg(read(source.backdrop), source.backdrop, { x: diagramX, y: 64, width: W - diagramX - 64, height: H - 128 });
  return coverDocument(background(T.surface, true) + diagram + frame(logoIn(box), box, T.bg));
}

/** `read` for the real repo. */
export const readFrom = (root: string) => (file: string) => fs.readFileSync(path.join(root, file), "utf8");
