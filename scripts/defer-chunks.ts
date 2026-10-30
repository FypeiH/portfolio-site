/**
 * Run after `next build` by every build script: rewrites each prerendered HTML page so Next's chunks
 * load after the first paint (lib/defer-chunks.ts). Pages are found in both output layouts (plain
 * `.next/server/app` and the Vercel adapter's `.next/server/route-cache`; lib/defer-output.ts). Fails
 * when there is no prerendered index.html, or when a page that hydrates has no chunk tag to defer, so a
 * Next.js upgrade that changes the markup can't silently bring the LCP regression back.
 */
import fs from "node:fs";
import path from "node:path";
import { deferChunks } from "../lib/defer-chunks";
import { deferTargets } from "../lib/defer-output";
import { SERVER_DIR } from "../lib/content/build-output";

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

let pages;
try {
  pages = deferTargets(SERVER_DIR, walk(SERVER_DIR));
} catch (error) {
  console.error(`defer-chunks: ${(error as Error).message}`);
  process.exit(1);
}
const failures: string[] = [];
for (const page of pages) {
  const html = fs.readFileSync(page.path, "utf8");
  const result = deferChunks(html);
  if (result.status === "deferred") fs.writeFileSync(page.path, result.html);
  else if (result.status === "no-chunks" && html.includes("self.__next_f")) failures.push(page.route);
  console.log(`defer-chunks: ${page.route}: ${result.status}${result.chunks ? ` (${result.chunks} chunks)` : ""}`);
}
if (failures.length > 0) {
  console.error(`defer-chunks: no chunk tags found in ${failures.join(", ")}; did Next.js change its script markup?`);
  process.exit(1);
}
