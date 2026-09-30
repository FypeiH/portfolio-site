import "server-only";

const LOCAL_URL = "http://localhost:3000";

type UrlEnv = Record<string, string | undefined>;

/** Canonical site URL: NEXT_PUBLIC_SITE_URL, then the Vercel production host, then localhost (PM decision). */
/** Build-time values (inlined by Next: NEXT_PUBLIC_* always, the Vercel key via next.config.ts `env`). */
const BUILD_URL_ENV: UrlEnv = {
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
};

export function siteUrl(env: UrlEnv = BUILD_URL_ENV): URL {
  if (env.NEXT_PUBLIC_SITE_URL) return new URL(env.NEXT_PUBLIC_SITE_URL);
  if (env.VERCEL_PROJECT_PRODUCTION_URL) return new URL(`https://${env.VERCEL_PROJECT_PRODUCTION_URL}`);
  return new URL(LOCAL_URL);
}
