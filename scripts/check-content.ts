/**
 * Lists every `{{…}}` placeholder in content/ without building (spec §3.3, Will's tool).
 * Drafts are listed for the writers, but only shipped files (global files, published projects
 * and their diagrams) make it exit non-zero, like the production guard (PM decision).
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { findPlaceholders, formatHits } from "../lib/content/placeholders";
import { CORE_CONTENT_FILES } from "../lib/content/rules";

const CONTENT_DIR = "content";
const SCANNED = /\.(ts|mdx|mmd)$/;

async function listFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return listFiles(full);
      return Promise.resolve(SCANNED.test(entry.name) && !entry.name.startsWith("_") ? [full] : []);
    }),
  );
  return nested.flat().sort();
}

async function shippedFiles(files: string[]): Promise<Set<string>> {
  const shipped = new Set(CORE_CONTENT_FILES);
  for (const file of files.filter((f) => f.endsWith(".mdx"))) {
    const { data } = matter(await readFile(file, "utf8"));
    if (data.status !== "published") continue;
    shipped.add(file);
    if (data.diagram?.kind === "mermaid" && typeof data.diagram.source === "string") shipped.add(data.diagram.source);
  }
  return shipped;
}

async function main(): Promise<void> {
  const files = await listFiles(CONTENT_DIR);
  const shipped = await shippedFiles(files);
  const hits = (await Promise.all(files.map(async (file) => findPlaceholders(await readFile(file, "utf8"), file)))).flat();
  if (hits.length === 0) {
    console.log("No placeholders left in content/.");
    return;
  }
  console.log(`${hits.length} placeholders in ${new Set(hits.map((hit) => hit.file)).size} files:\n${formatHits(hits)}`);
  const blocking = hits.filter((hit) => shipped.has(hit.file));
  if (blocking.length === 0) {
    console.log("\nAll of them are in drafts: nothing blocks a production build.");
    return;
  }
  console.log(`\n${blocking.length} of them are in published or global content and block a production build.`);
  process.exitCode = 1;
}

void main();
