/**
 * Renders content/diagrams/*.mmd to assets/rendered/diagrams/<slug>.svg (published by scripts/publish-assets.ts) with a source hash (spec §3.1).
 * Local/CI only, never on Vercel. Uses the Chrome found by Puppeteer (set PUPPETEER_EXECUTABLE_PATH to reuse a system Chrome).
 * `pnpm diagrams --check` (run by `pnpm build:production`) renders nothing: it fails when a rendered SVG
 * is missing, its `src-sha256` comment doesn't match its .mmd source, its bytes differ from the hash in
 * assets/diagrams.json (written here after rendering, so a hand edit is caught), or any SVG in the
 * output folder fails sanitizeSvg (lib/diagrams-manifest.ts).
 */
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { hashComment } from "../lib/content/diagrams";
import { DIAGRAMS_OUTPUT_DIR, DIAGRAMS_SOURCE_DIR, staleDiagramReasons, writeDiagramsManifest } from "../lib/diagrams-manifest";


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
    // 18 px labels: the case study shows a diagram at ≥ 78% of its intrinsic size, so text stays ≥ 14 px (Diagram.tsx).
    fontSize: "18px",
  },
} as const;

function check(sources: string[]): void {
  const stale = staleDiagramReasons(process.cwd());
  if (stale.length > 0) {
    console.error(`Diagrams are out of date or unsafe (run pnpm diagrams):\n  ${stale.join("\n  ")}`);
    process.exit(1);
  }
  console.log(`Diagrams are current (${sources.length}).`);
}

async function main(): Promise<void> {
  const sources = (await readdir(DIAGRAMS_SOURCE_DIR)).filter((name) => name.endsWith(".mmd"));
  if (process.argv.includes("--check")) return check(sources);
  // Loaded only to render: --check runs in the strict build, which has no Chrome.
  const [{ renderMermaid }, { default: puppeteer }] = await Promise.all([import("@mermaid-js/mermaid-cli"), import("puppeteer")]);
  await mkdir(DIAGRAMS_OUTPUT_DIR, { recursive: true });
  const browser = await puppeteer.launch({ headless: true });
  try {
    for (const name of sources) {
      const definition = await readFile(path.join(DIAGRAMS_SOURCE_DIR, name), "utf8");
      const { data } = await renderMermaid(browser, definition, "svg", {
        backgroundColor: "transparent",
        mermaidConfig: MERMAID_CONFIG,
        fontEmbed: false,
      });
      const svg = Buffer.from(data).toString("utf8");
      const output = path.join(DIAGRAMS_OUTPUT_DIR, name.replace(/\.mmd$/, ".svg"));
      await writeFile(output, `${hashComment(definition)}\n${svg}\n`);
      console.log(`rendered ${output}`);
    }
  } finally {
    await browser.close();
  }
  writeDiagramsManifest(process.cwd());
  const unsafe = staleDiagramReasons(process.cwd());
  if (unsafe.length > 0) throw new Error(`Rendered diagrams failed the check:\n  ${unsafe.join("\n  ")}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
