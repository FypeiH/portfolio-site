import fs from "node:fs";
import path from "node:path";
import { isDiagramCurrent, sourceHash } from "./content/diagrams";
import { sanitizeSvg, UnsafeSvgError } from "./project-covers-compose";
import { sha256 } from "./project-covers-manifest";

/**
 * Written by `pnpm diagrams`: for each rendered diagram, the hash of its .mmd source and of the SVG it
 * wrote (Sonar on 9631ada: the `src-sha256` comment alone let a hand-added <script> in a rendered SVG
 * pass as "current"). The check verifies both and runs every SVG through sanitizeSvg.
 */
export const DIAGRAMS_SOURCE_DIR = "content/diagrams";
export const DIAGRAMS_OUTPUT_DIR = "assets/rendered/diagrams";
export const DIAGRAMS_MANIFEST = "assets/diagrams.json";

export interface DiagramManifestEntry {
  source: string;
  sourceSha256: string;
  sha256: string;
}

export type DiagramsManifest = Record<string, DiagramManifestEntry>;

const outputFor = (mmd: string) => `${DIAGRAMS_OUTPUT_DIR}/${mmd.replace(/\.mmd$/, ".svg")}`;

export function diagramSources(root: string): string[] {
  return fs
    .readdirSync(path.join(root, DIAGRAMS_SOURCE_DIR))
    .filter((name) => name.endsWith(".mmd"))
    .sort();
}

/** Builds the manifest from the files on disk (called by `pnpm diagrams` right after rendering). */
export function buildDiagramsManifest(root: string): DiagramsManifest {
  return Object.fromEntries(
    diagramSources(root).map((name) => {
      const source = `${DIAGRAMS_SOURCE_DIR}/${name}`;
      const output = outputFor(name);
      return [output, { source, sourceSha256: sourceHash(fs.readFileSync(path.join(root, source), "utf8")), sha256: sha256(fs.readFileSync(path.join(root, output))) }];
    }),
  );
}

export function writeDiagramsManifest(root: string): void {
  fs.writeFileSync(path.join(root, DIAGRAMS_MANIFEST), `${JSON.stringify(buildDiagramsManifest(root), null, 2)}\n`);
}

/** Every SVG under assets/rendered/diagrams/ (drafts' and orphans' too) that fails sanitizeSvg, with the reason. */
export function unsafeDiagramReasons(root: string): string[] {
  const dir = path.join(root, DIAGRAMS_OUTPUT_DIR);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".svg"))
    .sort()
    .flatMap((name) => {
      const file = `${DIAGRAMS_OUTPUT_DIR}/${name}`;
      try {
        sanitizeSvg(fs.readFileSync(path.join(dir, name), "utf8"), file);
        return [];
      } catch (error) {
        if (error instanceof UnsafeSvgError) return [error.message];
        throw error;
      }
    });
}

/** Why the rendered diagrams no longer match their sources or the manifest, or are unsafe (one line each); empty when current. */
export function staleDiagramReasons(root = process.cwd()): string[] {
  const manifestFile = path.join(root, DIAGRAMS_MANIFEST);
  const manifest: DiagramsManifest = fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile, "utf8")) : {};
  const reasons = fs.existsSync(manifestFile) ? [] : [`missing ${DIAGRAMS_MANIFEST}`];
  for (const name of diagramSources(root)) {
    const source = `${DIAGRAMS_SOURCE_DIR}/${name}`;
    const output = outputFor(name);
    if (!fs.existsSync(path.join(root, output))) {
      reasons.push(`missing ${output}`);
      continue;
    }
    const mmd = fs.readFileSync(path.join(root, source), "utf8");
    const svg = fs.readFileSync(path.join(root, output));
    const entry = manifest[output];
    if (!isDiagramCurrent(mmd, svg.toString("utf8"))) reasons.push(`${output} is older than ${source}`);
    else if (entry && (entry.source !== source || entry.sourceSha256 !== sourceHash(mmd))) reasons.push(`${output}: manifest entry is for another source`);
    else if (entry && entry.sha256 !== sha256(svg)) reasons.push(`${output} was modified after it was rendered`);
    else if (!entry && fs.existsSync(manifestFile)) reasons.push(`${output} is not in ${DIAGRAMS_MANIFEST}`);
  }
  return [...reasons, ...unsafeDiagramReasons(root)];
}
