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

/** Assets this build serves from assets/rendered/, with their project: published only, all of them with drafts shown. */
export function publishedAssets(projects: readonly ProjectAssets[], showDrafts: boolean): { slug: string; src: string }[] {
  return projects
    .filter((p) => showDrafts || p.status === "published")
    .flatMap((p) => {
      const diagram = p.diagram?.kind === "mermaid" && p.diagram.source ? renderedDiagramPath(p.diagram.source) : p.diagram?.src;
      return [coverFor(p.slug)?.src, diagram].filter((src): src is string => typeof src === "string").map((src) => ({ slug: p.slug, src }));
    })
    .sort((a, b) => (a.src < b.src ? -1 : a.src > b.src ? 1 : 0));
}

/** Public paths this build serves from assets/rendered/. */
export function publishedAssetPaths(projects: readonly ProjectAssets[], showDrafts: boolean): string[] {
  return publishedAssets(projects, showDrafts).map((asset) => asset.src);
}

export class MissingAssetError extends Error {
  constructor(
    readonly slug: string,
    readonly file: string,
  ) {
    super(`publish-assets: "${slug}" needs ${file}, which does not exist. Run pnpm diagrams / pnpm covers, or fix its frontmatter.`);
    this.name = "MissingAssetError";
  }
}

/**
 * Empties public/{diagrams,covers} and copies in this build's assets. Returns the public paths written.
 * A missing file fails the build (Sonar m3): it would otherwise be a broken image on a shown project.
 */
export function publishAssets(root: string, showDrafts: boolean): string[] {
  const assets = publishedAssets(readProjectAssets(root), showDrafts);
  for (const { slug, src } of assets) {
    const file = renderedFile(src);
    if (!fs.existsSync(path.join(root, file))) throw new MissingAssetError(slug, file);
  }
  for (const dir of PUBLISHED_ASSET_DIRS) {
    fs.rmSync(path.join(root, "public", dir), { recursive: true, force: true });
    fs.mkdirSync(path.join(root, "public", dir), { recursive: true });
  }
  for (const { src } of assets) fs.copyFileSync(path.join(root, renderedFile(src)), path.join(root, "public", src));
  return assets.map((asset) => asset.src);
}
