import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { AVATAR_SRCSET_PX, AVATAR_THUMB_PX, avatarThumbPath, avatarVariantPath } from "./content/conventions";

/**
 * `pnpm avatar` records the hash of the photo each thumbnail was made from, so a replaced photo
 * with an old thumbnail is caught (Sonar review) without trusting mtimes, which git checkouts reset.
 */
export const AVATAR_MANIFEST = "assets/avatar-thumb.json";

export interface AvatarManifest {
  source: string;
  sha256: string;
  px: number;
  /** Every width written (the portrait srcSet). */
  srcset: number[];
}

export const sha256 = (file: string) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

export function avatarPaths(src: string, root = process.cwd()) {
  return {
    source: path.join(root, "public", src),
    target: path.join(root, "public", avatarThumbPath(src)),
    variants: AVATAR_SRCSET_PX.map((px) => ({ px, file: path.join(root, "public", avatarVariantPath(src, px)) })),
    manifest: path.join(root, AVATAR_MANIFEST),
  };
}

/** Why the thumbnail no longer matches the photo, or undefined when it is current. */
export function staleAvatarReason(src: string, root = process.cwd()): string | undefined {
  const paths = avatarPaths(src, root);
  const absent = paths.variants.find((variant) => !fs.existsSync(variant.file));
  if (absent) return `missing ${avatarVariantPath(src, absent.px)}`;
  if (!fs.existsSync(paths.manifest)) return `missing ${AVATAR_MANIFEST}`;
  const manifest = JSON.parse(fs.readFileSync(paths.manifest, "utf8")) as AvatarManifest;
  if (manifest.source !== src) return `thumbnail was made from ${manifest.source}, profile uses ${src}`;
  if (manifest.px !== AVATAR_THUMB_PX) return `thumbnail is ${manifest.px} px, expected ${AVATAR_THUMB_PX}`;
  if ((manifest.srcset ?? []).join() !== AVATAR_SRCSET_PX.join()) return `srcset is ${(manifest.srcset ?? []).join("/")} px, expected ${AVATAR_SRCSET_PX.join("/")}`;
  if (manifest.sha256 !== sha256(paths.source)) return `${src} changed after the thumbnail was made`;
  return undefined;
}
