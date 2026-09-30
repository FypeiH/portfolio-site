/**
 * Post-build guard, run by `pnpm build:production` after `next build`: fails when any prerendered
 * route (HTML, RSC payload, sitemap/robots) contains a placeholder marker (same rules as the source
 * scan), except the marker texts the source scan exempted.
 */
import fs from "node:fs";
import path from "node:path";
import { isScannableOutput, scanRenderedOutput } from "../lib/content/output-scan";
import { repoFiles } from "../lib/content/repo-files";
import { allowedShippedMarkers } from "../lib/content/scan";

const OUTPUT_DIR = ".next/server/app";

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const files = walk(OUTPUT_DIR).filter(isScannableOutput);
// Marker texts the source scan exempted (`{{ … }}` in code, `placeholder-ok`) are allowed here too.
const allowed = allowedShippedMarkers(repoFiles());
const hits = files.flatMap((file) => scanRenderedOutput(file, fs.readFileSync(file, "utf8"), allowed));
if (hits.length > 0) {
  console.error(`Rendered output check failed: ${hits.length} placeholder markers in the build output:`);
  for (const hit of hits.slice(0, 30)) console.error(`  ${hit.file}: …${hit.text}…`);
  process.exit(1);
}
console.log(`Rendered output check: ${files.length} files, no placeholder markers.`);
