import type { Metadata } from "next";
import { getProfile } from "@/lib/content/load";

/**
 * Shared Open Graph fields. Next replaces `openGraph` as a whole when a page sets it, so pages
 * spread this and add their own `url`; the layout sets no url/canonical, so 404 and error pages
 * never claim to be the home page (QA FIL-8 item 5).
 */
export function baseOpenGraph(): NonNullable<Metadata["openGraph"]> {
  const { seo, name } = getProfile();
  return { type: "website", siteName: name, locale: "en_US", title: seo.title, description: seo.description };
}
