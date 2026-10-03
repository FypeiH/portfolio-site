/**
 * Writes the About portrait at 224 and 640 px (WebP, the srcSet) from the profile photo declared in content/profile.ts,
 * and records the photo's hash in assets/avatar-thumb.json. `pnpm avatar --check` only verifies that
 * the thumbnail is current (also run by `pnpm content:check` and the unit tests).
 */
import fs from "node:fs";
import sharp from "sharp";
import { profile } from "../content/profile";
import { AVATAR_SRCSET_PX, AVATAR_THUMB_PX } from "../lib/content/conventions";
import { avatarPaths, sha256, staleAvatarReason, type AvatarManifest } from "../lib/avatar-thumb";

async function main(): Promise<void> {
  if (!profile.avatar) return console.log("No avatar in content/profile.ts.");
  const { src } = profile.avatar;
  if (process.argv.includes("--check")) {
    const reason = staleAvatarReason(src);
    if (reason) {
      console.error(`Avatar thumbnail is stale: ${reason}. Run pnpm avatar.`);
      process.exitCode = 1;
    } else console.log("Avatar thumbnail is current.");
    return;
  }
  const paths = avatarPaths(src);
  for (const { px, file } of paths.variants) {
    const info = await sharp(paths.source).resize(px, px, { fit: "cover" }).webp({ quality: 80 }).toFile(file);
    console.log(`${file}: ${info.width}×${info.height}, ${info.size} bytes`);
  }
  const manifest: AvatarManifest = { source: src, sha256: sha256(paths.source), px: AVATAR_THUMB_PX, srcset: [...AVATAR_SRCSET_PX] };
  fs.writeFileSync(paths.manifest, `${JSON.stringify(manifest, null, 2)}\n`);
}

void main();
