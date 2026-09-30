import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { isScannableOutput, scanRenderedOutput } from "@/lib/content/output-scan";
import { findShippedPlaceholders, scanContentFile, scanContentFileDetailed } from "@/lib/content/scan";
import { repoFiles } from "@/lib/content/repo-files";

const BOT = "content/projects/fidu-bot.mdx";
const PROFILE = "content/profile.ts";
const bot = fs.readFileSync(BOT, "utf8");
const profile = fs.readFileSync(PROFILE, "utf8");
const BODY_START = /^A friend who traded on Binance asked me/m;
const PROBLEM = `problem: "A friend who traded on Binance wanted his trading automated so he wouldn't miss opportunities."`;

const inBody = (prefix: string) => bot.replace(BODY_START, (line) => `${prefix}${line}`);

/** QA FIL-8 strict-variants.sh, applied to the real published content. */
const VARIANTS: [string, string, string][] = [
  ["1 body inline-code placeholder", BOT, inBody("`{{TODO: ctx}}` ")],
  ["2 frontmatter single-line placeholder", BOT, bot.replace('problem: "A friend', 'problem: "{{TODO: problem}} A friend')],
  ["3 folded-YAML multi-line placeholder", BOT, bot.replace(PROBLEM, "problem: >-\n  {{TODO:\n  real problem}} A friend who traded on Binance wanted his trading automated.")],
  ["4 multi-line placeholder in MDX body", BOT, inBody("`{{TODO:\nfill me}}` ")],
  ["5 multi-line placeholder in profile.ts", PROFILE, profile.replace(/tagline: .*,/, "tagline: `{{TODO:\n tagline}}`,")],
  ["6 entity-encoded placeholder", BOT, inBody("&#123;&#123;TODO: x&#125;&#125; ")],
  ["7 [TODO:] TBD lorem", BOT, inBody("[TODO: fill] TBD Lorem ipsum. ")],
  ["8 JSX expression building braces", BOT, inBody('{"{" + "{TODO}" + "}"} ')],
];

describe("placeholder guard, QA FIL-8 variants", () => {
  it("the real published content is clean (no false positives)", () => {
    expect(scanContentFile(BOT, bot)).toEqual([]);
    expect(scanContentFile(PROFILE, profile)).toEqual([]);
    expect(findShippedPlaceholders(repoFiles())).toEqual([]);
  });

  it.each(VARIANTS)("catches variant %s", (_name, file, mutated) => {
    expect(mutated).not.toBe(file === BOT ? bot : profile);
    expect(scanContentFile(file, mutated).length).toBeGreaterThan(0);
  });

  it("ignores comments, which never render", () => {
    expect(scanContentFile(PROFILE, `${profile}\n// TODO: later {{x}}\n`)).toEqual([]);
    expect(scanContentFile(BOT, `${bot}\n{/* TODO: later */}\n<!-- TBD -->\n`)).toEqual([]);
  });

  it("does not flag ordinary words", () => {
    expect(scanContentFile(BOT, inBody("A todos app, tbdx, Loremville. "))).toEqual([]);
  });
});

describe("rendered output guard", () => {
  it("catches braces assembled at render time (variant 8 output)", () => {
    expect(scanRenderedOutput("x.html", "<p>{{TODO}} A friend</p>")).toHaveLength(2);
    expect(scanRenderedOutput("x.rsc", '["$","p",null,{"children":"\\u007b\\u007bTODO\\u007d\\u007d"}]').length).toBeGreaterThan(0);
    expect(scanRenderedOutput("x.html", "<p>&#123;&#123;x&#125;&#125;</p>")).toHaveLength(1);
  });

  it("passes clean output and picks the right files", () => {
    expect(scanRenderedOutput("x.html", "<p>Team of {teamSize} people, todos app</p>")).toEqual([]);
    expect(["a.html", "a.rsc", "sitemap.xml.body", "robots.txt.body", "og.png.body", "a.meta"].filter(isScannableOutput)).toEqual([
      "a.html",
      "a.rsc",
      "sitemap.xml.body",
      "robots.txt.body",
    ]);
  });
});

describe("Sonar follow-ups: bypasses", () => {
  it("joins JSX string seams in the output: HTML <!-- --> and RSC fragments", () => {
    // What `{"{"}{"{"}fill me{"}"}{"}"}` renders to.
    expect(scanRenderedOutput("x.html", "<p>{<!-- -->{<!-- -->fill me<!-- -->}<!-- -->}</p>").map((h) => h.marker)).toEqual(["{{fill me}}"]);
    const rsc = '1:["$","p",null,{"children":["{","{","fill me","}","}"," A friend"]}]';
    expect(scanRenderedOutput("x.rsc", rsc).map((h) => h.marker)).toContain("{{fill me}}");
  });

  it("the source scan also catches the JSX-string form", () => {
    expect(scanContentFile(BOT, inBody('{"{"}{"{"}fill me{"}"}{"}"} ')).length).toBeGreaterThan(0);
  });

  it("zero-width characters don't hide a marker", () => {
    expect(scanContentFile(BOT, inBody("T\u200bODO fill this. ")).map((h) => h.text)).toContain("TODO");
    expect(scanContentFile(BOT, inBody("T&#x200B;ODO fill this. ")).map((h) => h.text)).toContain("TODO");
    expect(scanContentFile(PROFILE, profile.replace(/tagline: .*,/, 'tagline: "T\\u200bBD",')).length).toBeGreaterThan(0);
    expect(scanRenderedOutput("x.html", "<p>T\u2060ODO</p>").map((h) => h.marker)).toEqual(["TODO"]);
  });
});

describe("Sonar follow-ups: false positives", () => {
  const angular = inBody("The template binds `{{ user.name }}` in inline code.\n\n```html\n<p>{{ cv.title | translate }}</p>\n```\n\n");

  it("allows {{ … }} inside inline and fenced code when it isn't placeholder-style", () => {
    expect(scanContentFile(BOT, angular)).toEqual([]);
    expect(scanContentFileDetailed(BOT, angular).allowed).toEqual(["{{ user.name }}", "{{ cv.title | translate }}"]);
  });

  it("still flags placeholder-style braces in code, and any braces outside code", () => {
    expect(scanContentFile(BOT, inBody("`{{TODO: ctx}}` ")).length).toBe(1);
    expect(scanContentFile(BOT, inBody("`{{PROJECT_NAME}}` ")).length).toBe(1);
    expect(scanContentFile(BOT, inBody("```\n{{ tbd }}\n```\n\n")).length).toBeGreaterThan(0);
    expect(scanContentFile(BOT, inBody("Hello {{ user.name }} outside code. ")).length).toBe(1);
  });

  it("the output check allows exactly what the source scan allowed", () => {
    const allowed = new Set(scanContentFileDetailed(BOT, angular).allowed);
    const html = "<p>binds <code>{{ user.name }}</code></p><pre><code>&lt;p&gt;{{ cv.title | translate }}&lt;/p&gt;\n</code></pre>";
    const rsc = '["$","code",null,{"className":"language-html","children":"<p>{{ cv.title | translate }}</p>\\n"}]';
    expect(scanRenderedOutput("x.html", html, allowed)).toEqual([]);
    expect(scanRenderedOutput("x.rsc", rsc, allowed)).toEqual([]);
    expect(scanRenderedOutput("x.html", "<code>{{ other }}</code>", allowed)).toHaveLength(1);
  });

  it('"built a Todo app" passes both scans; TODO, todo: and [todo still fail', () => {
    expect(scanContentFile(BOT, inBody("I built a Todo app and a todo list. "))).toEqual([]);
    expect(scanRenderedOutput("x.html", "<p>I built a Todo app and a todo list.</p>")).toEqual([]);
    expect(scanRenderedOutput("x.html", "<p>TODO</p><p>todo: x</p><p>[todo later]</p>").map((h) => h.marker)).toEqual(["[todo later]", "todo:", "TODO"]);
  });

  it("placeholder-ok opts out its own line, or the block after it", () => {
    const sameLine = inBody("The column said TBD for months. {/* placeholder-ok */}\n");
    expect(scanContentFile(BOT, sameLine)).toEqual([]);
    expect(scanContentFileDetailed(BOT, sameLine).allowed).toEqual(["TBD"]);
    const block = inBody("{/* placeholder-ok */}\nThe column said TBD\nand FIXME for months.\n\nTBD here is not covered.\n\n");
    expect(scanContentFile(BOT, block).map((h) => h.text)).toEqual(["TBD"]);
    const fence = inBody("{/* placeholder-ok */}\n```\n{{ TODO_EXAMPLE }}\n\nTODO\n```\n\n");
    expect(scanContentFile(BOT, fence)).toEqual([]);
    expect(scanContentFile(PROFILE, profile.replace(/tagline: .*,/, 'tagline: "TBD", // placeholder-ok'))).toEqual([]);
  });
});
