/**
 * Post-build guard, run by `pnpm build:production` after `next build`: fails when any prerendered
 * route (HTML, RSC payload, sitemap/robots) contains a placeholder marker (same rules as the source
 * scan), except the marker texts the source scan exempted, or when a served SVG (every .svg under public/:
 * diagrams, covers) carries one in its text or attributes (QA FIL-8 r3 S1/S2). OG image text is
 * checked at prerender, before the PNG is drawn (lib/og-guard.ts).
 */
import fs from "node:fs";
import path from "node:path";
import { isScannableOutput, scanRenderedOutput } from "../lib/content/output-scan";
import { repoFiles } from "../lib/content/repo-files";
import { scanSvgOutput } from "../lib/content/svg-scan";
import { allowedShippedMarkers } from "../lib/content/scan";

const OUTPUT_DIR = ".next/server/app";
const PUBLIC_DIR = "public";

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const files = walk(OUTPUT_DIR).filter(isScannableOutput);
// Marker texts the source scan exempted (`{{ … }}` in code, `placeholder-ok`) are allowed here too.
const allowed = allowedShippedMarkers(repoFiles());
const svgs = fs.existsSync(PUBLIC_DIR) ? walk(PUBLIC_DIR).filter((file) => file.endsWith(".svg")) : [];
const hits = [
  ...files.flatMap((file) => scanRenderedOutput(file, fs.readFileSync(file, "utf8"), allowed)),
  ...svgs.flatMap((file) => scanSvgOutput(file, fs.readFileSync(file, "utf8"))),
];
if (hits.length > 0) {
  console.error(`Rendered output check failed: ${hits.length} placeholder markers in the build output:`);
  for (const hit of hits.slice(0, 30)) console.error(`  ${hit.file}: …${hit.text}…`);
  process.exit(1);
}
console.log(`Rendered output check: ${files.length} files and ${svgs.length} SVGs, no placeholder markers.`);
