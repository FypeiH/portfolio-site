import type { Metadata } from "next";
import { getProfile, getUi } from "@/lib/content/load";
import { fill } from "@/lib/content/ui";

/**
 * Shared Open Graph fields. Next replaces `openGraph` as a whole when a page sets it, so pages
 * spread this and add their own `url`; the layout sets no url/canonical, so 404 and error pages
 * never claim to be the home page (QA FIL-8 item 5).
 */
export function baseOpenGraph(): NonNullable<Metadata["openGraph"]> {
  const { seo, name } = getProfile();
  return { type: "website", siteName: name, locale: "en_US", title: seo.title, description: seo.description };
}

/** Id of the single OG image per case study: its URL is /projects/<slug>/opengraph-image/card. */
export const PROJECT_OG_IMAGE_ID = "card";

/** Per-project og:image:alt / twitter:image:alt, from site.ui.ogProjectAlt ("{title}: case study by …"). */
export function projectOgAlt(title: string): string {
  return fill(getUi().ogProjectAlt, { title });
}
