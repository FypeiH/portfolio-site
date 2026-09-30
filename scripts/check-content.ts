/** Lists every `{{…}}` placeholder in content/ without building (spec §3.3, Will's tool). */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { findPlaceholders, formatHits } from "../lib/content/placeholders";

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

async function main(): Promise<void> {
  const files = await listFiles(CONTENT_DIR);
  const hits = (await Promise.all(files.map(async (file) => findPlaceholders(await readFile(file, "utf8"), file)))).flat();
  if (hits.length === 0) {
    console.log("No placeholders left in content/.");
    return;
  }
  console.log(`${hits.length} placeholders in ${new Set(hits.map((hit) => hit.file)).size} files:\n${formatHits(hits)}`);
  process.exitCode = 1;
}

void main();
