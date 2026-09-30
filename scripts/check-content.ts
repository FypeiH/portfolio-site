/**
 * Lists every placeholder in content/ without building (spec §3.3, Will's tool). Drafts are listed
 * for the writers, but only shipped files make it exit non-zero: the same file set and the same scan
 * as the production guard (lib/content/scan.ts), so the two can never disagree.
 */
import { profile } from "../content/profile";
import { staleAvatarReason } from "../lib/avatar-thumb";
import { formatHits } from "../lib/content/placeholders";
import { repoFiles } from "../lib/content/repo-files";
import { CONTENT_ROOT, scanContentFileDetailed, shippedContentFiles } from "../lib/content/scan";

function checkAvatar(): void {
  const reason = profile.avatar && staleAvatarReason(profile.avatar.src);
  if (!reason) return;
  console.log(`Avatar thumbnail is stale: ${reason}. Run pnpm avatar.\n`);
  process.exitCode = 1;
}

function main(): void {
  checkAvatar();
  const files = repoFiles();
  const shipped = new Set(shippedContentFiles(files));
  const scans = files
    .list(CONTENT_ROOT)
    .sort()
    .map((file) => scanContentFileDetailed(file, files.read(file) ?? ""));
  const exemptions = scans.flatMap((scan) => scan.exemptions);
  if (exemptions.length > 0) {
    // Every exemption is listed, so a placeholder-ok or a code span can't hide text unnoticed.
    console.log(`${exemptions.length} exempted markers:\n${exemptions.map((e) => `  ${e.file}:${e.line}  ${e.text}  (${e.reason})`).join("\n")}\n`);
  }
  const hits = scans.flatMap((scan) => scan.hits);
  if (hits.length === 0) {
    console.log("No placeholders left in content/.");
    return;
  }
  console.log(`${hits.length} placeholders in ${new Set(hits.map((hit) => hit.file)).size} files:\n${formatHits(hits)}`);
  const blocking = hits.filter((hit) => shipped.has(hit.file));
  if (blocking.length === 0) {
    console.log("\nAll of them are in drafts or _ files: nothing blocks a production build.");
    return;
  }
  console.log(`\n${blocking.length} of them are in shipped content and block a production build:\n${formatHits(blocking)}`);
  process.exitCode = 1;
}

main();
