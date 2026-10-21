/**
 * Run after `next build` by every build script: rewrites each prerendered HTML page so Next's chunks
 * load after the first paint (lib/defer-chunks.ts). Fails when a page that hydrates has no chunk tag to
 * defer, so a Next.js upgrade that changes the markup can't silently bring the LCP regression back.
 */
import fs from "node:fs";
import path from "node:path";
import { deferChunks } from "../lib/defer-chunks";

const OUTPUT_DIR = ".next/server/app";

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const pages = walk(OUTPUT_DIR).filter((file) => file.endsWith(".html"));
const failures: string[] = [];
for (const file of pages) {
  const html = fs.readFileSync(file, "utf8");
  const result = deferChunks(html);
  if (result.status === "deferred") fs.writeFileSync(file, result.html);
  else if (result.status === "no-chunks" && html.includes("self.__next_f")) failures.push(file);
  console.log(`defer-chunks: ${path.relative(OUTPUT_DIR, file)}: ${result.status}${result.chunks ? ` (${result.chunks} chunks)` : ""}`);
}
if (pages.length === 0 || failures.length > 0) {
  console.error(`defer-chunks: no chunk tags found in ${failures.join(", ") || OUTPUT_DIR}; did Next.js change its script markup?`);
  process.exit(1);
}
