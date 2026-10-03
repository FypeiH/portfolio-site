/**
 * Project covers (cards and case-study headers). `pnpm covers` composes each one from a committed
 * source (an official logo in assets/project-logos/, or the project's rendered diagram) onto the site
 * background, and records the source hashes in assets/project-covers.json. Sources and their origin
 * URLs are listed in ASSETS.md.
 */
export const COVER_WIDTH = 1200;
export const COVER_HEIGHT = 750;

export type CoverSource =
  /** Vector logo: embedded in an SVG cover. */
  | { kind: "logo-svg"; file: string }
  /** Raster logo: composed and written as WebP (no PNG/JPG on the site). */
  | { kind: "logo-raster"; file: string }
  /** The project's architecture diagram (public/diagrams/<slug>.svg), embedded in an SVG cover. */
  | { kind: "diagram"; file: string };

export const COVER_SOURCES = {
  "email-scraper": { kind: "logo-svg", file: "assets/project-logos/takefreetours.svg" },
  takefreetours: { kind: "logo-svg", file: "assets/project-logos/takefreetours.svg" },
  benched: { kind: "logo-raster", file: "assets/project-logos/benched-app-icon-1024.png" },
  "fidu-bot": { kind: "diagram", file: "public/diagrams/fidu-bot.svg" },
  "portfolio-site": { kind: "diagram", file: "public/diagrams/portfolio-site.svg" },
  "dynamic-cv": { kind: "diagram", file: "public/diagrams/dynamic-cv.svg" },
} as const satisfies Record<string, CoverSource>;

export type CoverSlug = keyof typeof COVER_SOURCES;

export interface CoverImage {
  src: string;
  width: number;
  height: number;
}

const coverExtension = (source: CoverSource) => (source.kind === "logo-raster" ? "webp" : "svg");

/** Public path of a cover, e.g. "/covers/fidu-bot.svg". */
export const coverPath = (slug: CoverSlug) => `/covers/${slug}.${coverExtension(COVER_SOURCES[slug])}`;

const isCoverSlug = (slug: string): slug is CoverSlug => Object.hasOwn(COVER_SOURCES, slug);

/** The cover for a project, or undefined when it has none (the card then shows no media). */
export function coverFor(slug: string): CoverImage | undefined {
  return isCoverSlug(slug) ? { src: coverPath(slug), width: COVER_WIDTH, height: COVER_HEIGHT } : undefined;
}
