import { known } from "@/lib/content/placeholders";

const LOCAL_URL = "http://localhost:3000";

export function isProductionDeployment(): boolean {
  return process.env.VERCEL_ENV === "production";
}

/** NEXT_PUBLIC_SITE_URL, then site.url once filled, then the Vercel production host, then localhost. */
export function resolveSiteUrl(contentUrl: string): URL {
  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const candidate =
    process.env.NEXT_PUBLIC_SITE_URL || known(contentUrl) || (vercelHost ? `https://${vercelHost}` : LOCAL_URL);
  return new URL(candidate);
}
