import "server-only";

export interface ContentFlags {
  /** Production guard: any shipped placeholder, missing asset or launch rule breaks the build. */
  strict: boolean;
  /** Preview mode: draft projects are rendered and linked. */
  showDrafts: boolean;
}

export function readContentFlags(env: Record<string, string | undefined>): ContentFlags {
  return { strict: env.CONTENT_STRICT === "true", showDrafts: env.SHOW_DRAFTS === "true" };
}

/** The flags of this build. Literal `process.env.X` so next.config.ts `env` inlines them at build time. */
export function buildContentFlags(): ContentFlags {
  return readContentFlags({ CONTENT_STRICT: process.env.CONTENT_STRICT, SHOW_DRAFTS: process.env.SHOW_DRAFTS });
}
