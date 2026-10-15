import type { Metadata } from "next";
import { NotFoundContent } from "@/components/layout/NotFoundContent";
import { SiteDocument } from "@/components/layout/SiteDocument";
import { getProfile, getUi } from "@/lib/content/load";
import { siteMetadata, siteTitleTemplate, siteViewport } from "@/lib/metadata";
import "@/styles/globals.css";

/** The 404 for URLs no route matches. It renders outside app/(site)/layout.tsx, so it brings the document and styles itself. */
export function generateMetadata(): Metadata {
  return { ...siteMetadata(), title: siteTitleTemplate(getProfile().name).replace("%s", getUi().metaNotFoundTitle) };
}

export const viewport = siteViewport;

export default function GlobalNotFound() {
  return (
    <SiteDocument>
      <NotFoundContent />
    </SiteDocument>
  );
}
