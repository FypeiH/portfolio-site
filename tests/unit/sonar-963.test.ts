import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { scanContentFile } from "@/lib/content/scan";
import { DIAGRAMS_MANIFEST, staleDiagramReasons, unsafeDiagramReasons } from "@/lib/diagrams-manifest";
import { cssProblems, MAX_SVG_DEPTH, sanitizeSvg, UnsafeSvgError } from "@/lib/project-covers-compose";
import { publishAssets, UnsafeAssetError } from "@/lib/publish-assets";

/** Sonar's follow-ups on 9631ada. */
const root = path.resolve(import.meta.dirname, "../..");
const svg = (inner: string, attrs = "") => `<svg xmlns="http://www.w3.org/2000/svg"${attrs}>${inner}</svg>`;
const unsafe = (source: string) => expect(() => sanitizeSvg(source, "t.svg")).toThrow(UnsafeSvgError);

describe("1. CSS: an allowlist of functions, no string with : or /", () => {
  const bypasses = [
    'a{background:image-set("https://x.test/a.png" 1x)}',
    'a{background:-webkit-image-set("https://x.test/a.png" 1x)}',
    'a{background:src("https://x.test/a.png")}',
    "a{content:attr(href)}",
    "a{width:env(safe-area-inset-top)}",
    "a{width:calc (1px + 2px)}",
    'a{font-family:"//x.test"}',
    "a{font-family:'a:b'}",
    'a{font-family:"unterminated}',
  ];
  for (const css of bypasses) {
    it(`refuses ${css} in <style> and in a style attribute`, () => {
      expect(cssProblems(css).length).toBeGreaterThan(0);
      unsafe(svg(`<style>${css}</style>`));
      unsafe(svg(`<rect style='${css.replace(/^a\{|\}$/g, "").replaceAll("'", '"')}'/>`));
    });
  }
  it("still accepts what Mermaid and our logos use", () => {
    expect(cssProblems('#d .n{fill:rgba(1,2,3,0.5);filter:drop-shadow(1px 1px 0 rgb(0,0,0));font-family:"trebuchet ms",verdana;marker-end:url(#arrow)}')).toEqual([]);
    expect(cssProblems("@keyframes dash{to{stroke-dashoffset:0}} .e{animation:dash 1s linear infinite;transform:translate(1px,2px) rotate(3deg)}")).toEqual([]);
    for (const file of fs.readdirSync(path.join(root, "assets/rendered/diagrams")))
      expect(() => sanitizeSvg(fs.readFileSync(path.join(root, "assets/rendered/diagrams", file), "utf8"), file)).not.toThrow();
  });
});

describe("nits: href untrimmed, depth cap, well-formed output", () => {
  it('" #a" is not a fragment reference', () => {
    unsafe(svg('<path href=" #a"/>'));
    unsafe(svg('<path href="#a "/>'));
    expect(() => sanitizeSvg(svg('<path href="#a"/>'), "t.svg")).not.toThrow();
  });
  it("20k nested <g> is an UnsafeSvgError, not a RangeError", () => {
    unsafe(svg(`${"<g>".repeat(20_000)}${"</g>".repeat(20_000)}`));
    unsafe(svg(`${"<g>".repeat(MAX_SVG_DEPTH)}${"</g>".repeat(MAX_SVG_DEPTH)}`));
    expect(() => sanitizeSvg(svg(`${"<g>".repeat(MAX_SVG_DEPTH - 1)}${"</g>".repeat(MAX_SVG_DEPTH - 1)}`), "t.svg")).not.toThrow();
  });
});

describe("2. rendered diagrams: output hash and sanitizer on every file", () => {
  let tmp: string;
  const copy = (rel: string) => fs.cpSync(path.join(root, rel), path.join(tmp, rel), { recursive: true });
  const target = () => path.join(tmp, "assets/rendered/diagrams/portfolio-site.svg");
  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "diagrams-manifest-"));
    for (const rel of ["content", "assets/rendered", DIAGRAMS_MANIFEST]) copy(rel);
  });
  afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

  it("the committed diagrams are current and safe", () => {
    expect(staleDiagramReasons(root)).toEqual([]);
    expect(staleDiagramReasons(tmp)).toEqual([]);
  });
  it("a hand-added <script> is caught by the hash and by the sanitizer", () => {
    const text = fs.readFileSync(target(), "utf8");
    fs.writeFileSync(target(), text.replace("</svg>", "<script>alert(1)</script></svg>"));
    const reasons = staleDiagramReasons(tmp);
    expect(reasons.some((r) => r.includes("was modified after it was rendered"))).toBe(true);
    expect(reasons.some((r) => r.includes("<script>"))).toBe(true);
    expect(() => publishAssets(tmp, false)).toThrow(UnsafeAssetError);
  });
  it("an unsafe SVG of a draft or with no source is refused too", () => {
    fs.writeFileSync(path.join(tmp, "assets/rendered/diagrams/orphan.svg"), svg("<script/>"));
    expect(unsafeDiagramReasons(tmp)).toHaveLength(1);
    expect(() => publishAssets(tmp, false)).toThrow(UnsafeAssetError);
  });
  it("a missing manifest or a changed byte fails", () => {
    fs.appendFileSync(target(), " ");
    expect(staleDiagramReasons(tmp)).toEqual(["assets/rendered/diagrams/portfolio-site.svg was modified after it was rendered"]);
    fs.rmSync(path.join(tmp, DIAGRAMS_MANIFEST));
    expect(staleDiagramReasons(tmp)[0]).toBe(`missing ${DIAGRAMS_MANIFEST}`);
  });
});

describe("3. .mmd: only hexagon node definitions are exempt", () => {
  const MMD = "content/diagrams/fidu-bot.mmd";
  const base = fs.readFileSync(path.join(root, MMD), "utf8");
  const hits = (line: string) => scanContentFile(MMD, `${base}\n  ${line}\n`).map((h) => h.text);
  it.each(['B["a{{x}}"]', "A -->|a{{x}}| B", 'A -->|"a{{x}}"| B', "B[a{{x}}]", "B(a{{x}})", "A-- a{{x}} -->B", "A == a{{x}} ==> B", 'H{{"a"}} --> B["c{{x}}"]'])(
    "%s fails",
    (line) => expect(hits(line)).toHaveLength(1),
  );
  it.each(['G --> H{{"Log trade"}}', "I{{Decision}} --> J", "A --- B{{x}}", 'A -->|"edge"| H{{"x"}}', "A-- text -->B{{x}}"])("%s passes", (line) =>
    expect(hits(line)).toEqual([]),
  );
});
