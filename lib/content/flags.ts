export interface ContentFlags {
  /** Production guard: any shipped placeholder, missing asset or launch rule breaks the build. */
  strict: boolean;
  /** Preview mode: draft projects are rendered and linked. */
  showDrafts: boolean;
}

export function readContentFlags(env: Record<string, string | undefined> = process.env): ContentFlags {
  return { strict: env.CONTENT_STRICT === "true", showDrafts: env.SHOW_DRAFTS === "true" };
}
