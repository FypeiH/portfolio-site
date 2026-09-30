import fs from "node:fs";
import path from "node:path";
import type { ContentFiles } from "./rules";

/**
 * Repo files read from disk. Used at build time only (every route is prerendered), so the paths are
 * marked `turbopackIgnore`: nothing under content/ or public/ is traced into the server output.
 */
export function repoFiles(root: string = process.cwd()): ContentFiles {
  const resolve = (file: string) => path.join(/*turbopackIgnore: true*/ root, file);
  const list = (dir: string): string[] => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(resolve(dir), { withFileTypes: true });
    } catch {
      return [];
    }
    return entries.flatMap((entry) => {
      const child = `${dir}/${entry.name}`;
      return entry.isDirectory() ? list(child) : [child];
    });
  };
  return {
    exists: (file) => fs.existsSync(resolve(file)),
    read: (file) => {
      try {
        return fs.readFileSync(resolve(file), "utf8");
      } catch {
        return undefined;
      }
    },
    list,
  };
}
