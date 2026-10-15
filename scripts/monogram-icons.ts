/**
 * Favicon set from the FB monogram (lib/monogram.ts): app/icon.svg and app/favicon.ico (16 + 32) from the
 * small variant, app/icon1.png (32) likewise, app/apple-icon.png (180) from the full one. Next serves them
 * through its file-based metadata. `--check` fails when a committed file differs from what this would write.
 */
import fs from "node:fs";
import sharp from "sharp";
import { monogramSvg } from "../lib/monogram";

const png = (svg: string, px: number) => sharp(Buffer.from(svg), { density: 72 * (px / 32) * 4 }).resize(px, px).png({ compressionLevel: 9 }).toBuffer();

/** ICO container holding PNG images (supported by every current browser). */
function ico(images: { px: number; data: Buffer }[]): Buffer {
  const header = Buffer.alloc(6 + images.length * 16);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ px, data }, index) => {
    const entry = 6 + index * 16;
    header.writeUInt8(px === 256 ? 0 : px, entry);
    header.writeUInt8(px === 256 ? 0 : px, entry + 1);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(data.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...images.map(({ data }) => data)]);
}

async function main(): Promise<void> {
  const small = monogramSvg("small");
  const full = monogramSvg("full");
  const files: Record<string, Buffer> = {
    "app/icon.svg": Buffer.from(small),
    "app/favicon.ico": ico([
      { px: 16, data: await png(small, 16) },
      { px: 32, data: await png(small, 32) },
    ]),
    "app/icon1.png": await png(small, 32),
    "app/apple-icon.png": await png(full, 180),
  };
  if (process.argv.includes("--check")) {
    const stale = Object.entries(files).filter(([file, data]) => !fs.existsSync(file) || !fs.readFileSync(file).equals(data));
    if (stale.length > 0) {
      console.error(`Monogram icons are stale: ${stale.map(([file]) => file).join(", ")}. Run pnpm monogram.`);
      process.exitCode = 1;
    } else console.log("Monogram icons are current.");
    return;
  }
  for (const [file, data] of Object.entries(files)) {
    fs.writeFileSync(file, data);
    console.log(`${file}: ${data.length} bytes`);
  }
}

void main();
