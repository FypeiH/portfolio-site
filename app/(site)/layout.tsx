import type { ReactNode } from "react";
import { SiteDocument } from "@/components/layout/SiteDocument";
import { siteMetadata, siteViewport } from "@/lib/metadata";
import "@/styles/globals.css";

/*
 * The root layout sits in a route group so that app/global-error, which stays outside it, carries no
 * stylesheet. With experimental.inlineCss, Next inlines global-error's CSS into every page's flight data
 * a second time (vercel/next.js#98110), and under app/ it got this layout's whole stylesheet: ~8 KB gzip
 * more per page, which put the home HTML (44.3 KB) past the ~43.8 KB that Lighthouse's simulated TCP
 * delivers in two round trips, and its LCP up by one 150 ms RTT. Unmatched URLs get
 * app/global-not-found.tsx, the documented 404 for an app without a root layout at app/.
 */
export const generateMetadata = siteMetadata;
export const viewport = siteViewport;

export default function SiteLayout({ children }: { children: ReactNode }) {
  return <SiteDocument>{children}</SiteDocument>;
}
