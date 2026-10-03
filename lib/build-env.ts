/**
 * Build-time environment, shared by next.config.ts and the app. next.config.ts inlines these keys
 * (`env`), so every `process.env.X` below is replaced by its build-time value: the runtime env of
 * `next start` can never change which content ships or whether the site is indexable (QA FIL-8).
 * Only literal `process.env.X` member expressions are inlined, hence no `process.env` passing here.
 */
export const BUILD_ENV_KEYS = ["VERCEL_ENV", "VERCEL_PROJECT_PRODUCTION_URL", "SHOW_DRAFTS", "CONTENT_STRICT", "VERCEL_GIT_COMMIT_SHA", "BUILD_DATE"] as const;

export const isVercelProduction = (vercelEnv: string | undefined) => vercelEnv === "production";

/** Values to inline, read once while next.config.ts loads (i.e. at build time). BUILD_DATE defaults to the build day (UTC, YYYY-MM-DD). */
export function buildEnv(env: Record<string, string | undefined>, now = new Date()): Record<string, string> {
  const defaults: Partial<Record<(typeof BUILD_ENV_KEYS)[number], string>> = { BUILD_DATE: now.toISOString().slice(0, 10) };
  return Object.fromEntries(BUILD_ENV_KEYS.map((key) => [key, env[key] || defaults[key] || ""]));
}

/** Footer build sheet (visual-direction B5): short commit hash on Vercel, "local" elsewhere. */
export const buildInfo = (env: { VERCEL_GIT_COMMIT_SHA?: string; BUILD_DATE?: string } = {
  VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA,
  BUILD_DATE: process.env.BUILD_DATE,
}) => {
  const date = env.BUILD_DATE || undefined;
  // The copyright year is the build's, never the visitor's clock (static pages; Sonar f49).
  const year = Number(date?.slice(0, 4)) || undefined;
  return { commit: env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "local", date, year };
};
