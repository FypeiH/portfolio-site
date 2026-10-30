/**
 * Where `next build` writes prerendered routes. Without a build adapter they sit under
 * `.next/server/app/<route>.html|.rsc|…` (local and Vercel preview builds). With the Vercel adapter
 * (`NEXT_ENABLE_ADAPTER=1`, set on Vercel production builds: "Applying modifyConfig from Vercel"),
 * Next 16.4 names them by route-cache key instead:
 * `.next/server/route-cache/<KIND>/<sha256 of source route>/$/<route>.html` (server/lib/route-cache-key.ts),
 * and `.next/server/app` keeps only route handlers' bundles. Both layouts map to the same route name.
 */
import path from "node:path";

export const SERVER_DIR = ".next/server";

/** Server-relative path (posix) → route file relative to the app root ("index.html", "projects/x.rsc"), or null when it is not prerendered app output. */
export function prerenderRoute(serverRelative: string): string | null {
  const file = serverRelative.replaceAll("\\", "/");
  if (file.startsWith("app/")) return file.slice("app/".length);
  const cached = /^route-cache\/[^/]+\/[0-9a-f]+\/\$\/(.+)$/.exec(file);
  return cached?.[1] ?? null;
}

export interface PrerenderFile {
  /** Path on disk. */
  path: string;
  /** Route file as under `.next/server/app` ("index.html"), whatever the layout. */
  route: string;
}

/** Every prerendered file among `files` (paths under `serverDir`), with its layout-independent route. */
export function prerenderFiles(serverDir: string, files: readonly string[]): PrerenderFile[] {
  return files.flatMap((file) => {
    const route = prerenderRoute(path.relative(serverDir, file));
    return route === null ? [] : [{ path: file, route }];
  });
}
