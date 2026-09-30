const LOCAL_URL = "http://localhost:3000";

type UrlEnv = Record<string, string | undefined>;

/** Canonical site URL: NEXT_PUBLIC_SITE_URL, then the Vercel production host, then localhost (PM decision). */
export function siteUrl(env: UrlEnv = process.env): URL {
  if (env.NEXT_PUBLIC_SITE_URL) return new URL(env.NEXT_PUBLIC_SITE_URL);
  if (env.VERCEL_PROJECT_PRODUCTION_URL) return new URL(`https://${env.VERCEL_PROJECT_PRODUCTION_URL}`);
  return new URL(LOCAL_URL);
}
