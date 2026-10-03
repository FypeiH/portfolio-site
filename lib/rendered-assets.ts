/**
 * Generated images that are committed (rendered diagrams, project covers) live in assets/rendered/,
 * not in public/. Before every dev server or build, scripts/publish-assets.ts copies into public/ only
 * the ones this build shows: published projects, plus drafts when SHOW_DRAFTS=true. A production
 * build therefore never ships (or serves) a draft's cover or diagram (Sonar f49).
 */
export const RENDERED_DIR = "assets/rendered";

/** The public folders filled from assets/rendered/ (gitignored under public/). */
export const PUBLISHED_ASSET_DIRS = ["diagrams", "covers"] as const;

/** Committed file behind a public path: "/diagrams/x.svg" → "assets/rendered/diagrams/x.svg". */
export const renderedFile = (publicPath: string) => `${RENDERED_DIR}${publicPath}`;
