import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import { ProductionAnalytics } from "@/components/analytics/ProductionAnalytics";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SkipLink } from "@/components/layout/SkipLink";
import { RevealObserver } from "@/components/motion/RevealObserver";
import { RouteTracker } from "@/components/motion/RouteTracker";
import { getProfile, getUi } from "@/lib/content/load";
import { isProductionDeployment } from "@/lib/env";
import { siteUrl } from "@/lib/site-url";
import "@/styles/globals.css";

// No preload: the woff2 request competed with the intro paragraph, the LCP element (Sonar review).
const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter", preload: false });

/** Sets `.js` before first paint so no-JS fallbacks never flash (spec §4.3). */
const MARK_JS = "document.documentElement.classList.add('js')";

export function generateMetadata(): Metadata {
  const { seo, name } = getProfile();
  const indexable = isProductionDeployment();
  return {
    metadataBase: siteUrl(),
    title: { default: seo.title, template: `%s · ${name}` },
    description: seo.description,
    alternates: { canonical: "/" },
    openGraph: { type: "website", siteName: name, locale: "en_US", title: seo.title, description: seo.description, url: "/" },
    twitter: { card: "summary_large_image" },
    robots: indexable ? { index: true, follow: true } : { index: false, follow: false },
  };
}

export const viewport: Viewport = { themeColor: "#0b0d10", colorScheme: "dark" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={inter.variable} suppressHydrationWarning>
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
