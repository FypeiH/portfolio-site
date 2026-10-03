/**
 * Renders content/diagrams/*.mmd to assets/rendered/diagrams/<slug>.svg (published by scripts/publish-assets.ts) with a source hash (spec §3.1).
 * Local/CI only, never on Vercel. Uses the Chrome found by Puppeteer (set PUPPETEER_EXECUTABLE_PATH to reuse a system Chrome).
 */
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { renderMermaid } from "@mermaid-js/mermaid-cli";
import puppeteer from "puppeteer";
import { hashComment } from "../lib/content/diagrams";

const SOURCE_DIR = "content/diagrams";
const OUTPUT_DIR = "assets/rendered/diagrams";

const MERMAID_CONFIG = {
  theme: "dark",
  // Classic look: the default "neo" look adds blurred drop shadows and gradient strokes (visual-direction §8).
  look: "classic",
  // SVG text instead of <foreignObject> HTML, so the diagram renders reliably inside an <img>.
  htmlLabels: false,
  flowchart: { htmlLabels: false },
  // Site palette (styles/globals.css): hard fg borders on surface, muted edges, no blue accent.
  themeVariables: {
    background: "transparent",
    primaryColor: "#1f1f1f",
    primaryBorderColor: "#f2f2f2",
    primaryTextColor: "#f2f2f2",
    secondaryColor: "#141414",
    tertiaryColor: "#141414",
    clusterBkg: "#141414",
    clusterBorder: "#6b6b6b",
    edgeLabelBackground: "#141414",
    lineColor: "#a3a3a3",
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
} as const;

async function main(): Promise<void> {
  const sources = (await readdir(SOURCE_DIR)).filter((name) => name.endsWith(".mmd"));
  await mkdir(OUTPUT_DIR, { recursive: true });
  const browser = await puppeteer.launch({ headless: true });
  try {
    for (const name of sources) {
      const definition = await readFile(path.join(SOURCE_DIR, name), "utf8");
      const { data } = await renderMermaid(browser, definition, "svg", {
        backgroundColor: "transparent",
        mermaidConfig: MERMAID_CONFIG,
        fontEmbed: false,
      });
      const svg = Buffer.from(data).toString("utf8");
      const output = path.join(OUTPUT_DIR, name.replace(/\.mmd$/, ".svg"));
      await writeFile(output, `${hashComment(definition)}\n${svg}\n`);
      console.log(`rendered ${output}`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
