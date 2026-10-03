import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { PROJECTS_DIR, projectFile } from "./content/conventions";
import { renderedDiagramPath } from "./content/diagrams";
import { coverFor } from "./project-covers";
import { PUBLISHED_ASSET_DIRS, renderedFile } from "./rendered-assets";

interface ProjectAssets {
  slug: string;
  status: string;
  diagram?: { kind?: string; source?: string; src?: string };
}

/** Status and diagram of every project, read from the frontmatter (no schema: the build validates it). */
export function readProjectAssets(root: string): ProjectAssets[] {
  return fs
    .readdirSync(path.join(root, PROJECTS_DIR))
    .filter((name) => name.endsWith(".mdx") && !name.startsWith("_"))
    .map((name) => {
      const slug = name.slice(0, -".mdx".length);
      const { data } = matter(fs.readFileSync(path.join(root, projectFile(slug)), "utf8"));
      return { slug, status: String(data.status ?? ""), diagram: data.diagram as ProjectAssets["diagram"] };
    });
}

/** Public paths this build serves from assets/rendered/: published projects only, all of them with drafts shown. */
export function publishedAssetPaths(projects: readonly ProjectAssets[], showDrafts: boolean): string[] {
  return projects
    .filter((p) => showDrafts || p.status === "published")
    .flatMap((p) => {
      const diagram = p.diagram?.kind === "mermaid" && p.diagram.source ? renderedDiagramPath(p.diagram.source) : p.diagram?.src;
      return [coverFor(p.slug)?.src, diagram].filter((src): src is string => typeof src === "string");
    })
    .sort();
}

/** Empties public/{diagrams,covers} and copies in this build's assets. Returns the public paths written. */
export function publishAssets(root: string, showDrafts: boolean): string[] {
  for (const dir of PUBLISHED_ASSET_DIRS) {
    fs.rmSync(path.join(root, "public", dir), { recursive: true, force: true });
    fs.mkdirSync(path.join(root, "public", dir), { recursive: true });
  }
  const paths = publishedAssetPaths(readProjectAssets(root), showDrafts);
  for (const src of paths) {
    const from = path.join(root, renderedFile(src));
    if (fs.existsSync(from)) fs.copyFileSync(from, path.join(root, "public", src));
  }
  return paths;
}
