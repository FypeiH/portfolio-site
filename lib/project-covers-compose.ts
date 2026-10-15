import fs from "node:fs";
import path from "node:path";
import { DOMParser, XMLSerializer, type Element as XmlElement, type Node as XmlNode } from "@xmldom/xmldom";
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

const SVG_NS = "http://www.w3.org/2000/svg";
const XLINK_NS = "http://www.w3.org/1999/xlink";
const XMLNS_NS = "http://www.w3.org/2000/xmlns/";

/**
 * Elements allowed in a cover source (the TakeFreeTours logo and the Mermaid diagrams use exactly
 * these), by local name, all in the SVG namespace. Anything else, `script`, `foreignObject`, `a`,
 * `image`, `use`, animation elements or any element of another namespace included, is refused.
 */
const ALLOWED_ELEMENTS = new Set([
  "svg", "g", "defs", "style", "path", "rect", "circle", "polygon", "text", "tspan",
  "clipPath", "linearGradient", "stop", "marker", "filter", "feDropShadow",
]);

/** Attributes allowed (no namespace), besides `data-*`, `aria-*` and the xmlns declarations. */
const ALLOWED_ATTRIBUTES = new Set([
  "id", "class", "style", "role", "viewBox", "width", "height", "x", "y", "x1", "x2", "y1", "y2", "cx", "cy", "r",
  "dx", "dy", "d", "points", "transform", "fill", "stroke", "stroke-width", "clip-path", "marker-end", "offset",
  "stop-color", "stop-opacity", "gradientUnits", "markerHeight", "markerWidth", "markerUnits", "orient", "refX", "refY",
  "stdDeviation", "flood-color", "flood-opacity", "font-style", "font-weight", "text-anchor", "preserveAspectRatio",
  "href",
]);

/** Only same-document fragment references (`#id`), for url() and href alike. */
const FRAGMENT = /^#[A-Za-z_][\w.:-]*$/;

/**
 * CSS (a <style> element or a style attribute) may not reach outside the document or hide what it
 * says: no escape sequences (`@\69mport`, `\75rl(`), no comments, no at-rule but @keyframes, no url()
 * except `url(#id)`, no legacy script hooks.
 */
function cssProblems(css: string): string[] {
  const problems: string[] = [];
  if (css.includes("\\")) problems.push("CSS escape sequence");
  if (css.includes("/*")) problems.push("CSS comment");
  for (const m of css.matchAll(/@([\w-]*)/g)) if (m[1] !== "keyframes") problems.push(`@${m[1]}`);
  for (const m of css.matchAll(/url\(\s*(["']?)([^)]*?)\1\s*\)/gi)) if (!FRAGMENT.test(m[2] ?? "")) problems.push(`url(${m[2]})`);
  if (/url\(/i.test(css.replace(/url\(\s*(["']?)#[A-Za-z_][\w.:-]*\1\s*\)/gi, ""))) problems.push("unparsed url()");
  if (/expression\s*\(|-moz-binding|behavior\s*:|javascript:/i.test(css)) problems.push("CSS script hook");
  return problems;
}

/**
 * Makes an SVG document safe to nest in a cover (QA r3: the regex version could be bypassed with
 * namespace prefixes, CSS escapes and data: URLs). The source is parsed with a namespace-aware XML
 * parser (@xmldom/xmldom; malformed XML, a DOCTYPE with an internal subset or entities fail), then
 * every element and attribute is checked against an allowlist by namespace URI and local name, and
 * every CSS fragment and url()/href value is checked as above. Anything not allowed throws
 * UnsafeSvgError (nothing is stripped silently, except comments and the prologue, which never render).
 * Returns the root element re-serialised from the checked tree, so what was checked is what is used.
 */
export function sanitizeSvg(source: string, file: string): string {
  const problems: string[] = [];
  const parseErrors: string[] = [];
  let doc: ReturnType<DOMParser["parseFromString"]>;
  try {
    doc = new DOMParser({ onError: (level, message) => parseErrors.push(`${level}: ${message}`) }).parseFromString(source.replace(/^\uFEFF/, ""), "image/svg+xml");
  } catch (error) {
    throw new UnsafeSvgError(`${file}: not well-formed SVG (${(error as Error).message})`);
  }
  if (parseErrors.length) throw new UnsafeSvgError(`${file}: not well-formed SVG (${parseErrors.join("; ")})`);
  for (let node = doc.firstChild; node; node = node.nextSibling) {
    if (node.nodeType === node.DOCUMENT_TYPE_NODE) {
      const doctype = node as unknown as { internalSubset?: string };
      if (doctype.internalSubset?.trim()) problems.push("DOCTYPE internal subset");
    } else if (node.nodeType === node.PROCESSING_INSTRUCTION_NODE && (node as unknown as { target: string }).target.toLowerCase() !== "xml") {
      problems.push(`<?${(node as unknown as { target: string }).target}?>`);
    }
  }
  const root = doc.documentElement;
  if (!root || root.namespaceURI !== SVG_NS || root.localName !== "svg") throw new UnsafeSvgError(`${file}: unsafe SVG source (does not start with <svg>)`);
  const comments: XmlNode[] = [];
  const checkElement = (el: XmlElement) => {
    if (el.namespaceURI !== SVG_NS || !ALLOWED_ELEMENTS.has(el.localName ?? "")) {
      problems.push(`<${el.nodeName}> (${el.namespaceURI ?? "no namespace"})`);
      return;
    }
    if (el.localName === "style") problems.push(...cssProblems(el.textContent ?? ""));
    for (let i = 0; i < el.attributes.length; i++) {
      const attr = el.attributes.item(i);
      if (!attr) continue;
      const value = attr.value.trim();
      const name = attr.localName ?? "";
      if (attr.namespaceURI === XMLNS_NS) {
        if (value !== SVG_NS && value !== XLINK_NS) problems.push(`${attr.nodeName}="${value}"`);
        continue;
      }
      const isHref = name === "href" && (attr.namespaceURI === null || attr.namespaceURI === XLINK_NS);
      if (attr.namespaceURI !== null && !isHref) {
        problems.push(`${attr.nodeName} (${attr.namespaceURI})`);
        continue;
      }
      if (/^on/i.test(name)) problems.push(`${name} handler`);
      else if (!ALLOWED_ATTRIBUTES.has(name) && !/^(?:data|aria)-[\w-]+$/.test(name)) problems.push(`${name}=`);
      else if (isHref && !FRAGMENT.test(value)) problems.push(`${attr.nodeName}="${value}"`);
      else if (name === "style") problems.push(...cssProblems(value));
      else if (/url\(|\\/i.test(value)) problems.push(...cssProblems(value).map((p) => `${name}: ${p}`));
    }
    for (let child = el.firstChild; child; child = child.nextSibling) {
      if (child.nodeType === child.COMMENT_NODE) comments.push(child);
      else if (child.nodeType === child.ELEMENT_NODE) checkElement(child as XmlElement);
      else if (child.nodeType !== child.TEXT_NODE && child.nodeType !== child.CDATA_SECTION_NODE) problems.push(`node type ${child.nodeType}`);
    }
  };
  checkElement(root);
  if (problems.length) throw new UnsafeSvgError(`${file}: unsafe SVG source (${[...new Set(problems)].join(", ")})`);
  for (const comment of comments) comment.parentNode?.removeChild(comment);
  return new XMLSerializer().serializeToString(root);
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
