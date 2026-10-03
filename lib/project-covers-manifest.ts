import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { COVER_SOURCES, coverPath, type CoverSlug } from "./project-covers";

/** Written by `pnpm covers`: the hash of the source each cover was made from (same idea as the avatar). */
export const COVERS_MANIFEST = "assets/project-covers.json";

export type CoversManifest = Record<string, { source: string; sha256: string }>;

export const sha256File = (file: string) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

/** Why the covers no longer match their sources (one line per problem); empty when current. */
export function staleCoverReasons(root = process.cwd()): string[] {
  const manifestFile = path.join(root, COVERS_MANIFEST);
  if (!fs.existsSync(manifestFile)) return [`missing ${COVERS_MANIFEST}`];
  const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8")) as CoversManifest;
  return (Object.keys(COVER_SOURCES) as CoverSlug[]).flatMap((slug) => {
    const { file } = COVER_SOURCES[slug];
    const output = path.join(root, "public", coverPath(slug));
    const entry = manifest[slug];
    if (!fs.existsSync(output)) return [`missing public${coverPath(slug)}`];
    if (!entry || entry.source !== file) return [`${slug}: cover was not made from ${file}`];
    if (entry.sha256 !== sha256File(path.join(root, file))) return [`${slug}: ${file} changed after the cover was made`];
    return [];
  });
}
