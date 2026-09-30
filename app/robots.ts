import type { MetadataRoute } from "next";
import { getSite } from "@/lib/content/load";
import { isProductionDeployment, resolveSiteUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  if (!isProductionDeployment()) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: new URL("/sitemap.xml", resolveSiteUrl(getSite().url)).href,
  };
}
