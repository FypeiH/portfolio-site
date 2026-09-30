/**
 * Renders content/diagrams/*.mmd to public/diagrams/<slug>.svg with a source hash (spec §3.1).
 * Local/CI only, never on Vercel. Uses the Chrome found by Puppeteer (set PUPPETEER_EXECUTABLE_PATH to reuse a system Chrome).
 */
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { renderMermaid } from "@mermaid-js/mermaid-cli";
import puppeteer from "puppeteer";
import { hashComment } from "../lib/content/diagrams";

const SOURCE_DIR = "content/diagrams";
const OUTPUT_DIR = "public/diagrams";

const MERMAID_CONFIG = {
  theme: "dark",
  // SVG text instead of <foreignObject> HTML, so the diagram renders reliably inside an <img>.
  htmlLabels: false,
  flowchart: { htmlLabels: false },
  themeVariables: {
    background: "transparent",
    primaryColor: "#1a1f26",
    primaryBorderColor: "#7cc4fa",
    primaryTextColor: "#e7e9ec",
    lineColor: "#a3acb7",
    fontFamily: "ui-sans-serif, system-ui, sans-serif",
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
