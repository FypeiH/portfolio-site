import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";
import { ProductionAnalytics } from "@/components/analytics/ProductionAnalytics";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SkipLink } from "@/components/layout/SkipLink";
import { RevealObserver } from "@/components/motion/RevealObserver";
import { RouteTracker } from "@/components/motion/RouteTracker";
import { getProfile, getUi } from "@/lib/content/load";
import { isProductionDeployment } from "@/lib/env";
import { baseOpenGraph } from "@/lib/metadata";
import { siteUrl } from "@/lib/site-url";
import "@/styles/globals.css";

// The only web font: Anton 400, subset to ASCII + § · — (10.7 KB), for the marquee h2s only. Never in
// section#top, so it can't be the LCP element. Not preloaded, and not used until `.fonts-ready` (after
// the load event, see MARK_JS), so it is requested after the LCP paint.
const anton = localFont({
  src: "../assets/fonts/anton-latin-400.woff2",
  weight: "400",
  display: "swap",
  preload: false,
  variable: "--font-anton",
  fallback: ["Impact", "Arial Narrow", "sans-serif"],
});

/**
 * Sets `.js` before first paint so no-JS fallbacks never flash (spec §4.3), and `.fonts-ready` once the
 * page has loaded: only then do the marquee headings switch to Anton, so the font request starts after
 * the LCP paint and can never sit in its critical chain (QA FIL-8 r2, N1: Lighthouse counted the font
 * in the LCP graph whenever it finished before the paint, ~2.5 s instead of ~1.9 s).
 */
const MARK_JS =
  "var d=document.documentElement;d.classList.add('js');" +
  "addEventListener('load',function(){d.classList.add('fonts-ready')},{once:true})";

export function generateMetadata(): Metadata {
  const { seo, name } = getProfile();
  const indexable = isProductionDeployment();
  return {
    metadataBase: siteUrl(),
    title: { default: seo.title, template: `%s · ${name}` },
    description: seo.description,
    openGraph: baseOpenGraph(),
    twitter: { card: "summary_large_image" },
    robots: indexable ? { index: true, follow: true } : { index: false, follow: false },
  };
}

export const viewport: Viewport = { themeColor: "#0a0a0a", colorScheme: "dark" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={anton.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: MARK_JS }} />
      </head>
      <body className="bg-bg text-fg antialiased">
        <SkipLink label={getUi().skipToContent} />
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
        <RevealObserver />
        <RouteTracker />
        <ProductionAnalytics />
      </body>
    </html>
  );
}
