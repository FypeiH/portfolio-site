import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { composeSvgCover, readFrom } from "./project-covers-compose";
import { COVER_SOURCES, coverFile, coverInputs, type CoverSlug } from "./project-covers";

/**
 * Written by `pnpm covers`: for each cover, the hash of every source it was made from and of the
 * file it wrote. The check verifies both, and regenerates SVG covers in memory and compares bytes,
 * so a hand-edited or overwritten cover fails as surely as a changed source.
 */
export const COVERS_MANIFEST = "assets/project-covers.json";

export interface CoverManifestEntry {
  sources: Record<string, string>;
  output: string;
  sha256: string;
}

export type CoversManifest = Record<string, CoverManifestEntry>;

export const sha256 = (data: string | Buffer) => crypto.createHash("sha256").update(data).digest("hex");
export const sha256File = (file: string) => sha256(fs.readFileSync(file));

/** Why the covers no longer match their sources or the manifest (one line per problem); empty when current. */
export function staleCoverReasons(root = process.cwd()): string[] {
  const manifestFile = path.join(root, COVERS_MANIFEST);
  if (!fs.existsSync(manifestFile)) return [`missing ${COVERS_MANIFEST}`];
  const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8")) as CoversManifest;
  const read = readFrom(root);
  return (Object.keys(COVER_SOURCES) as CoverSlug[]).flatMap((slug) => {
    const source = COVER_SOURCES[slug];
    const output = coverFile(slug);
    const entry = manifest[slug];
    const inputs = coverInputs(source);
    if (!fs.existsSync(path.join(root, output))) return [`missing ${output}`];
    if (!entry || entry.output !== output || Object.keys(entry.sources ?? {}).sort().join() !== [...inputs].sort().join())
      return [`${slug}: cover was not made from ${inputs.join(" + ")}`];
    for (const file of inputs) {
      if (!fs.existsSync(path.join(root, file))) return [`${slug}: missing source ${file}`];
      if (entry.sources[file] !== sha256File(path.join(root, file))) return [`${slug}: ${file} changed after the cover was made`];
    }
    const bytes = fs.readFileSync(path.join(root, output));
    if (sha256(bytes) !== entry.sha256) return [`${slug}: ${output} was modified after it was generated`];
    if (source.kind !== "logo-raster") {
      try {
        if (!bytes.equals(Buffer.from(composeSvgCover(source, read)))) return [`${slug}: ${output} differs from a fresh render`];
      } catch (error) {
        return [`${slug}: ${(error as Error).message}`];
      }
    }
    return [];
  });
}
