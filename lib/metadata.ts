import type { Metadata } from "next";
import { getProfile, getUi } from "@/lib/content/load";
import { fill } from "@/lib/content/ui";
import { OG_SIZE } from "@/lib/og-size";

/**
 * Shared Open Graph fields. Next replaces `openGraph` as a whole when a page sets it, so pages
 * spread this and add their own `url`; the layout sets no url/canonical, so 404 and error pages
 * never claim to be the home page (QA FIL-8 item 5).
 */
export function baseOpenGraph(): NonNullable<Metadata["openGraph"]> {
  const { seo, name } = getProfile();
  return { type: "website", siteName: name, locale: "en_US", title: seo.title, description: seo.description };
}

/** Path of a case study's prerendered OG image (app/projects/[slug]/opengraph-image.tsx). */
export function projectOgImagePath(slug: string): string {
  return `/projects/${slug}/opengraph-image`;
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
export function projectOgImages(slug: string, title: string) {
  return [{ url: projectOgImagePath(slug), alt: projectOgAlt(title), width: OG_SIZE.width, height: OG_SIZE.height, type: "image/png" }];
}
