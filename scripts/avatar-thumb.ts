/** Writes the hero avatar thumbnail (224 px WebP) from the profile photo declared in content/profile.ts. */
import path from "node:path";
import sharp from "sharp";
import { profile } from "../content/profile";
import { AVATAR_THUMB_PX, avatarThumbPath } from "../lib/content/conventions";

async function main(): Promise<void> {
  if (!profile.avatar) return console.log("No avatar in content/profile.ts.");
  const source = path.join("public", profile.avatar.src);
  const target = path.join("public", avatarThumbPath(profile.avatar.src));
  const info = await sharp(source).resize(AVATAR_THUMB_PX, AVATAR_THUMB_PX, { fit: "cover" }).webp({ quality: 80 }).toFile(target);
  console.log(`${target}: ${info.width}×${info.height}, ${info.size} bytes`);
}

void main();
