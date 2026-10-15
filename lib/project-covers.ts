import { renderedFile } from "./rendered-assets";

/**
 * Project covers (cards and case-study headers). `pnpm covers` composes each one from committed
 * sources (an official logo in assets/project-logos/, the project's rendered diagram, or both) onto
 * the site background, writes it to assets/rendered/covers/ and records the source and output hashes
 * in assets/project-covers.json. Sources and their origin URLs are listed in ASSETS.md.
 */
export const COVER_WIDTH = 1200;
export const COVER_HEIGHT = 750;

export type CoverSource =
  /** Vector logo, embedded in an SVG cover: alone in a frame, or (with `backdrop`) beside a diagram. */
  | { kind: "logo-svg"; file: string; backdrop?: string }
  /** Raster logo: composed and written as WebP (no PNG/JPG on the site). */
  | { kind: "logo-raster"; file: string }
  /** The project's architecture diagram, embedded in an SVG cover. */
  | { kind: "diagram"; file: string };

const DIAGRAMS = "assets/rendered/diagrams";

export const COVER_SOURCES = {
  // Same client logo, two compositions so the cards never look identical: the email scraper shows the
  // logo beside its own pipeline diagram; the TakeFreeTours site shows the logo alone on the page colour.
  "email-scraper": { kind: "logo-svg", file: "assets/project-logos/takefreetours.svg", backdrop: `${DIAGRAMS}/email-scraper.svg` },
  takefreetours: { kind: "logo-svg", file: "assets/project-logos/takefreetours.svg" },
  benched: { kind: "logo-raster", file: "assets/project-logos/benched-app-icon-1024.png" },
  "fidu-bot": { kind: "diagram", file: `${DIAGRAMS}/fidu-bot.svg` },
  "portfolio-site": { kind: "diagram", file: `${DIAGRAMS}/portfolio-site.svg` },
  "dynamic-cv": { kind: "diagram", file: `${DIAGRAMS}/dynamic-cv.svg` },
} as const satisfies Record<string, CoverSource>;

export type CoverSlug = keyof typeof COVER_SOURCES;

export interface CoverImage {
  src: string;
  width: number;
  height: number;
}

const coverExtension = (source: CoverSource) => (source.kind === "logo-raster" ? "webp" : "svg");

/** Every committed file a cover is made from (hashed in the manifest). */
export const coverInputs = (source: CoverSource): string[] => ("backdrop" in source && source.backdrop ? [source.file, source.backdrop] : [source.file]);

/** Public path of a cover, e.g. "/covers/fidu-bot.svg". */
export const coverPath = (slug: CoverSlug) => `/covers/${slug}.${coverExtension(COVER_SOURCES[slug])}`;

/** Committed file of a cover, e.g. "assets/rendered/covers/fidu-bot.svg". */
export const coverFile = (slug: CoverSlug) => renderedFile(coverPath(slug));

export const isCoverSlug = (slug: string): slug is CoverSlug => Object.hasOwn(COVER_SOURCES, slug);

/** The cover for a project, or undefined when it has none (the card then shows no media). */
export function coverFor(slug: string): CoverImage | undefined {
  return isCoverSlug(slug) ? { src: coverPath(slug), width: COVER_WIDTH, height: COVER_HEIGHT } : undefined;
}
