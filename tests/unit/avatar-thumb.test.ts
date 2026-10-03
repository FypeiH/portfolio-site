import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { profile } from "@/content/profile";
import { AVATAR_MANIFEST, avatarPaths, staleAvatarReason } from "@/lib/avatar-thumb";

describe("avatar thumbnail", () => {
  it("is current for the repo's profile photo", () => {
    if (!profile.avatar) return;
    expect(staleAvatarReason(profile.avatar.src)).toBeUndefined();
  });

  it("is stale once the photo changes", () => {
    if (!profile.avatar) return;
    const src = profile.avatar.src;
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "avatar-"));
    const real = avatarPaths(src);
    const copy = avatarPaths(src, root);
    const pairs = [[real.source, copy.source], [real.manifest, copy.manifest], ...real.variants.map((v, i) => [v.file, copy.variants[i]!.file])];
    for (const [from, to] of pairs as [string, string][]) {
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.copyFileSync(from, to);
    }
    expect(staleAvatarReason(src, root)).toBeUndefined();
    fs.appendFileSync(copy.source, "changed");
    expect(staleAvatarReason(src, root)).toContain("changed after the thumbnail was made");
    fs.rmSync(copy.variants[1]!.file);
    expect(staleAvatarReason(src, root)).toBe("missing /images/profile/filipe-bravo-640.webp");
    fs.rmSync(path.join(root, AVATAR_MANIFEST));
    expect(staleAvatarReason(src, root)).toContain("missing");
    fs.rmSync(root, { recursive: true, force: true });
  });
});
