/**
 * Build-time environment, shared by next.config.ts and the app. next.config.ts inlines these keys
 * (`env`), so every `process.env.X` below is replaced by its build-time value: the runtime env of
 * `next start` can never change which content ships or whether the site is indexable (QA FIL-8).
 * Only literal `process.env.X` member expressions are inlined, hence no `process.env` passing here.
 */
export const BUILD_ENV_KEYS = ["VERCEL_ENV", "VERCEL_PROJECT_PRODUCTION_URL", "SHOW_DRAFTS", "CONTENT_STRICT"] as const;

export const isVercelProduction = (vercelEnv: string | undefined) => vercelEnv === "production";

/** Values to inline, read once while next.config.ts loads (i.e. at build time). */
export function buildEnv(env: Record<string, string | undefined>): Record<string, string> {
  return Object.fromEntries(BUILD_ENV_KEYS.map((key) => [key, env[key] ?? ""]));
}
