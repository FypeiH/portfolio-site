import { createHash } from "node:crypto";
import type { Metadata } from "next";
import { getProfile, getUi } from "@/lib/content/load";
import { fill } from "@/lib/content/ui";
import { OG_MAX_TAGS, OG_SIZE, OG_TEMPLATE_VERSION } from "@/lib/og-size";

/**
 * Shared Open Graph fields. Next replaces `openGraph` as a whole when a page sets it, so pages
 * spread this and add their own `url`; the layout sets no url/canonical, so 404 and error pages
 * never claim to be the home page (QA FIL-8 item 5).
 */
export function baseOpenGraph(): NonNullable<Metadata["openGraph"]> {
  const { seo, name } = getProfile();
  return { type: "website", siteName: name, locale: "en_US", title: seo.title, description: seo.description };
}

/** What a case-study OG card draws (app/projects/[slug]/opengraph-image.tsx). */
export interface OgCardInput {
  slug: string;
  title: string;
  summary: string;
  stack: readonly string[];
}

/**
 * URL of a case study's prerendered OG image with a `?<hash>` cache-buster, like the one Next adds to
 * the root OG image: social networks cache images by URL, so the hash changes whenever the card would
 * (its text, the author name or OG_TEMPLATE_VERSION).
 */
export function projectOgImagePath(project: OgCardInput): string {
  const drawn = [OG_TEMPLATE_VERSION, getProfile().name, project.title, project.summary, project.stack.slice(0, OG_MAX_TAGS)];
  const hash = createHash("sha256").update(JSON.stringify(drawn)).digest("hex").slice(0, 16);
  return `/projects/${project.slug}/opengraph-image?${hash}`;
}

/** Per-project og:image:alt / twitter:image:alt, from site.ui.ogProjectAlt ("{title}: case study by …"). */
export function projectOgAlt(title: string): string {
  return fill(getUi().ogProjectAlt, { title });
}

/**
 * openGraph.images / twitter.images for a case study. Setting `images` in generateMetadata overrides
 * the file-based opengraph-image metadata, so the alt can be per project while the image itself stays
 * a prerendered static route (Sonar M1, QA r2 N3).
 */
export function projectOgImages(project: OgCardInput) {
  return [{ url: projectOgImagePath(project), alt: projectOgAlt(project.title), width: OG_SIZE.width, height: OG_SIZE.height, type: "image/png" }];
}
