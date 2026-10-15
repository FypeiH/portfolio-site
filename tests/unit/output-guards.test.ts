import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createElement as h, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { scanSvgOutput, svgTextRuns } from "@/lib/content/svg-scan";
import { assertOgText, ogText, ogTextHits } from "@/lib/og-guard";
import { sanitizeSvg } from "@/lib/project-covers-compose";
import { sourceHash } from "@/lib/project-covers-manifest";

const root = path.resolve(import.meta.dirname, "../..");
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");
const pkg = JSON.parse(read("package.json")) as { scripts: Record<string, string> };

describe("QA r3 S1/S2: served SVGs are scanned", () => {
  const diagram = read("assets/rendered/diagrams/fidu-bot.svg");
  const cover = read("assets/rendered/covers/fidu-bot.svg");
  const inject = (svg: string, extra: string) => svg.slice(0, svg.lastIndexOf("</svg>")) + extra + svg.slice(svg.lastIndexOf("</svg>"));

  it("finds no marker in the diagrams and covers a production build serves", () => {
    // Drafts' diagrams may hold placeholders: `pnpm assets` never copies them into a production build.
    const published = fs
      .readdirSync(path.join(root, "content/projects"))
      .filter((f) => /^[^_].*\.mdx$/.test(f) && /^status: "published"/m.test(read(`content/projects/${f}`)))
      .map((f) => f.replace(/\.mdx$/, ""));
    expect(published.length).toBeGreaterThanOrEqual(3);
    const svgs = ["assets/rendered/diagrams", "assets/rendered/covers"]
      .flatMap((dir) => published.map((slug) => `${dir}/${slug}.svg`))
      .filter((file) => fs.existsSync(path.join(root, file)));
    expect(svgs.length).toBeGreaterThanOrEqual(published.length * 2);
    for (const file of svgs) expect(scanSvgOutput(file, read(file)), file).toEqual([]);
  });

  it.each([
    ["S1 text in a diagram", diagram, '<text x="10" y="20" fill="#fff">{{TODO: verify}}</text>'],
    ["S2 TBD in a cover", cover, '<text x="10" y="40" fill="#fff">TBD</text>'],
    ["marker split by tspan", cover, "<text>T<tspan>ODO</tspan>: x</text>"],
    ["marker in an attribute", cover, '<rect width="1" height="1" data-note="FIXME"/>'],
    ["marker in a title", cover, "<title>lorem ipsum</title>"],
    ["marker in CDATA", cover, "<style><![CDATA[ .a::after{content:'TODO: x'} ]]></style>"],
  ])("fails on %s", (_name, svg, extra) => {
    expect(scanSvgOutput("public/x.svg", inject(svg, extra)).length).toBeGreaterThan(0);
  });

  it("skips comments (never drawn; diagrams keep their hash there)", () => {
    expect(scanSvgOutput("public/x.svg", inject(cover, "<!-- TODO: not drawn -->"))).toEqual([]);
    expect(svgTextRuns(diagram).some((run) => run.includes("src-sha256"))).toBe(false);
  });

  it("check-output scans public/**/*.svg with the guard message", () => {
    const script = read("scripts/check-output.ts");
    expect(script).toContain("scanSvgOutput");
    expect(script).toContain('const PUBLIC_DIR = "public"');
    expect(script).toContain("Rendered output check failed");
  });

  it("build:production runs the output scan, then covers/avatar/diagrams --check", () => {
    const steps = pkg.scripts["build:production"]!.split("&&").map((s) => s.trim());
    expect(steps).toEqual([
      "pnpm assets",
      "cross-env CONTENT_STRICT=true next build",
      "tsx scripts/check-output.ts",
      "pnpm covers --check",
      "pnpm avatar --check",
      "pnpm diagrams --check",
    ]);
  });

  it("diagrams --check passes on the committed diagrams and fails on a stale one", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "diagrams-check-"));
    try {
      fs.mkdirSync(path.join(tmp, "content/diagrams"), { recursive: true });
      fs.mkdirSync(path.join(tmp, "assets/rendered/diagrams"), { recursive: true });
      for (const f of fs.readdirSync(path.join(root, "content/diagrams"))) fs.copyFileSync(path.join(root, "content/diagrams", f), path.join(tmp, "content/diagrams", f));
      for (const f of fs.readdirSync(path.join(root, "assets/rendered/diagrams")))
        fs.copyFileSync(path.join(root, "assets/rendered/diagrams", f), path.join(tmp, "assets/rendered/diagrams", f));
      const run = () =>
        spawnSync(path.join(root, "node_modules/.bin/tsx"), [path.join(root, "scripts/render-diagrams.ts"), "--check"], { cwd: tmp, encoding: "utf8" });
      expect(run().status).toBe(0);
      fs.appendFileSync(path.join(tmp, "content/diagrams/fidu-bot.mmd"), "\n  X --> Y\n");
      const stale = run();
      expect(stale.status).toBe(1);
      expect(stale.stderr).toContain("fidu-bot.svg is older than");
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }, 30_000);

  it("a cover's SVG source hash ignores comments (FP3: only the diagram's src-sha256 changed)", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cover-hash-"));
    try {
      const file = path.join(tmp, "d.svg");
      fs.writeFileSync(file, diagram);
      const before = sourceHash(file);
      fs.writeFileSync(file, diagram.replace(/src-sha256: [a-f0-9]{64}/, `src-sha256: ${"0".repeat(64)}`));
      expect(sourceHash(file)).toBe(before);
      fs.writeFileSync(file, inject(diagram, '<rect width="1" height="1"/>'));
      expect(sourceHash(file)).not.toBe(before);
      expect(sanitizeSvg(diagram, "d.svg")).not.toContain("<!--");
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe("QA r3 O1: OG image text is checked before rendering", () => {
  const Frame = ({ children, footer }: { children?: ReactNode; footer: string }) => h("div", null, h("div", null, children), h("div", null, footer));
  const card = (title: string, footer = "Filipe Bravo · Case study") =>
    h(Frame, { footer }, h("div", null, "Case study"), h("div", { style: { fontSize: 88 } }, title), h("div", null, ["React", "Next.js"].map((t) => h("div", { key: t }, t))));

  it("reads text through function components, props and arrays", () => {
    expect(ogText(card("Portfolio website"))).toEqual(["Case study", "Portfolio website", "React", "Next.js", "Filipe Bravo · Case study"]);
  });

  it("passes the real titles and fails a TBD title (O1), a {{…}} split over children and a marker in a component prop", () => {
    expect(ogTextHits("/projects/x", card("Crypto Trading Bot (FIDU)"))).toEqual([]);
    expect(ogTextHits("/projects/x", card("Crypto Trading Bot (FIDU)" + " TBD")).map((hit) => hit.marker)).toEqual(["TBD"]);
    expect(ogTextHits("/", h("div", null, "{", "{", " fill me }}")).length).toBe(1);
    expect(ogTextHits("/", card("Fine", "TODO: footer")).length).toBe(1);
    expect(ogTextHits("/", h("div", null, h("img", { alt: "FIXME", src: "data:," }))).length).toBe(1);
  });

  it("throws the guard message only in strict builds", () => {
    expect(() => assertOgText("/projects/fidu-bot", card("Bot TBD"), { strict: true })).toThrow(/^Rendered output check failed: 1 placeholder markers in the OG image text of \/projects\/fidu-bot/);
    expect(() => assertOgText("/projects/fidu-bot", card("Bot TBD"), { strict: false })).not.toThrow();
    expect(() => assertOgText("/projects/fidu-bot", card("Bot"), { strict: true })).not.toThrow();
  });

  it("honours placeholder-ok exemptions like the output scan (Sonar R21), never for {{…}} or TODO:", () => {
    const allowed = [{ text: "TBD", scope: "site" as const, where: "anywhere" as const }];
    expect(ogTextHits("/", card("TBD REST APIs"), allowed)).toEqual([]);
    expect(ogTextHits("/projects/fidu-bot", card("TBD REST APIs"), allowed)).toEqual([]);
    const caseStudyOnly = [{ text: "TBD", scope: "projects/fidu-bot" as const, where: "anywhere" as const }];
    expect(ogTextHits("/projects/fidu-bot", card("TBD"), caseStudyOnly)).toEqual([]);
    expect(ogTextHits("/projects/email-scraper", card("TBD"), caseStudyOnly).length).toBe(1);
    expect(ogTextHits("/", card("TODO: x"), [{ text: "TODO:", scope: "site" as const, where: "anywhere" as const }]).length).toBe(1);
    expect(() => assertOgText("/", card("TBD"), { strict: true, allowed: () => allowed })).not.toThrow();
  });

  it("every OG image goes through ogImageResponse (no bare ImageResponse)", () => {
    for (const file of ["app/opengraph-image.tsx", "app/projects/[slug]/opengraph-image.tsx"]) {
      const source = read(file);
      expect(source, file).toContain("ogImageResponse(");
      expect(source, file).not.toContain("new ImageResponse");
    }
    expect(read("lib/og.tsx")).toMatch(/assertOgText\(route, element, \{ allowed: \(\) => allowedShippedMarkers\(repoFiles\(\)\) \}\);\s*return new ImageResponse/);
  });

  it("keeps the case-study OG cache-buster with template version 2", async () => {
    const { OG_TEMPLATE_VERSION } = await import("@/lib/og-size");
    expect(OG_TEMPLATE_VERSION).toBe(2);
    expect(read("lib/metadata.ts")).toContain("OG_TEMPLATE_VERSION");
  });
});

describe("audit:prod", () => {
  it("runs pnpm audit --prod on a manifest without the auditConfig ignore", () => {
    expect(pkg.scripts["audit:prod"]).toBe("node scripts/audit-prod.mjs");
    const script = read("scripts/audit-prod.mjs");
    expect(script).toContain("delete manifest.pnpm.auditConfig");
    expect(script).toContain('"--prod"');
    expect(script).toContain("pnpm-lock.yaml");
    expect(script).toMatch(/advisories\.length > 0[\s\S]*process\.exit\(1\)/);
  });
});
