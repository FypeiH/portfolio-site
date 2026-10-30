/**
 * Which build output files scripts/defer-chunks.ts rewrites: every prerendered HTML page, in either
 * layout (`.next/server/app` or, with the Vercel production adapter, `.next/server/route-cache`;
 * lib/content/build-output.ts). Throws when there is no prerendered index.html, so the deferral can't
 * silently do nothing in a layout it does not know.
 */
import { prerenderFiles, type PrerenderFile } from "./content/build-output";

export function deferTargets(serverDir: string, files: readonly string[]): PrerenderFile[] {
  const pages = prerenderFiles(serverDir, files).filter((file) => file.route.endsWith(".html"));
  if (!pages.some((file) => file.route === "index.html")) {
    throw new Error(`no prerendered index.html in ${serverDir}/app or ${serverDir}/route-cache`);
  }
  return pages;
}
