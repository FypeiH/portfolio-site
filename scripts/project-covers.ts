/**
 * Writes the project covers declared in lib/project-covers.ts to assets/rendered/covers/<slug>.{svg,webp}
 * (published into public/ by scripts/publish-assets.ts) and records source and output hashes in
 * assets/project-covers.json. Deterministic: same sources, same files. `pnpm covers --check` only
 * verifies that every cover is current (also run by content:check and the unit tests).
 * `--root <dir>` runs against another checkout (used by the tests).
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { centeredFrame, COVER_TOKENS, composeSvgCover, coverDocument, frame, FRAME, rasterBackground, readFrom } from "../lib/project-covers-compose";
import { COVER_SOURCES, coverFile, coverInputs, type CoverSlug, type CoverSource } from "../lib/project-covers";
import { COVERS_MANIFEST, sha256, sha256File, staleCoverReasons, type CoversManifest } from "../lib/project-covers-manifest";

const rootArg = process.argv.indexOf("--root");
const ROOT = path.resolve(rootArg === -1 ? "." : (process.argv[rootArg + 1] ?? "."));
const at = (file: string) => path.join(ROOT, file);

async function composeRaster(source: CoverSource): Promise<Buffer> {
  const png = await sharp(at(source.file)).resize(FRAME, FRAME, { fit: "cover" }).png().toBuffer();
  const { x, y } = centeredFrame;
  const image = `<image x="${x}" y="${y}" width="${FRAME}" height="${FRAME}" href="data:image/png;base64,${png.toString("base64")}"/>`;
  return sharp(Buffer.from(coverDocument(rasterBackground() + frame(image, centeredFrame, COVER_TOKENS.bg)))).webp({ quality: 82, effort: 6 }).toBuffer();
}

async function main(): Promise<void> {
  if (process.argv.includes("--check")) {
    const reasons = staleCoverReasons(ROOT);
    if (reasons.length) {
      console.error(`Project covers are stale (run pnpm covers):\n  ${reasons.join("\n  ")}`);
      process.exitCode = 1;
    } else console.log("Project covers are current.");
    return;
  }
  const manifest: CoversManifest = {};
  for (const slug of Object.keys(COVER_SOURCES) as CoverSlug[]) {
    const source: CoverSource = COVER_SOURCES[slug];
    const output = coverFile(slug);
    fs.mkdirSync(path.dirname(at(output)), { recursive: true });
    const data = source.kind === "logo-raster" ? await composeRaster(source) : Buffer.from(composeSvgCover(source, readFrom(ROOT)));
    fs.writeFileSync(at(output), data);
    manifest[slug] = { sources: Object.fromEntries(coverInputs(source).map((file) => [file, sha256File(at(file))])), output, sha256: sha256(data) };
    console.log(`${output}: ${data.byteLength} bytes`);
  }
  fs.writeFileSync(at(COVERS_MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
