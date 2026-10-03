import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { isScannableOutput, routeScope, scanRenderedOutput } from "@/lib/content/output-scan";
import { findShippedPlaceholders, scanContentFile, scanContentFileDetailed, type AllowedMarker } from "@/lib/content/scan";
import { repoFiles } from "@/lib/content/repo-files";

const BOT = "content/projects/fidu-bot.mdx";
const PROFILE = "content/profile.ts";
const bot = fs.readFileSync(BOT, "utf8");
const profile = fs.readFileSync(PROFILE, "utf8");
// Anchored on structure, not wording, so copy edits to the case study don't break the guard tests.
const BODY_START = /^## Context & problem\n\n/m;
const PROBLEM = bot.match(/^problem: ".*"$/m)?.[0] ?? "";

const inBody = (prefix: string) => bot.replace(BODY_START, (heading) => `${heading}${prefix}`);

/** QA FIL-8 strict-variants.sh, applied to the real published content. */
const VARIANTS: [string, string, string][] = [
  ["1 body inline-code placeholder", BOT, inBody("`{{TODO: ctx}}` ")],
  ["2 frontmatter single-line placeholder", BOT, bot.replace('problem: "', 'problem: "{{TODO: problem}} ')],
  ["3 folded-YAML multi-line placeholder", BOT, bot.replace(PROBLEM, "problem: >-\n  {{TODO:\n  real problem}} A trader wanted his trading automated.")],
  ["4 multi-line placeholder in MDX body", BOT, inBody("`{{TODO:\nfill me}}` ")],
  ["5 multi-line placeholder in profile.ts", PROFILE, profile.replace(/tagline: .*,/, "tagline: `{{TODO:\n tagline}}`,")],
  ["6 entity-encoded placeholder", BOT, inBody("&#123;&#123;TODO: x&#125;&#125; ")],
  ["7 [TODO:] TBD lorem", BOT, inBody("[TODO: fill] TBD Lorem ipsum. ")],
  ["8 JSX expression building braces", BOT, inBody('{"{" + "{TODO}" + "}"} ')],
];

describe("placeholder guard, QA FIL-8 variants", () => {
  it("finds its anchors in the real content", () => {
    expect(bot).toMatch(BODY_START);
    expect(PROBLEM).not.toBe("");
  });

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
    expect(scanRenderedOutput("x.html", "<p>{{TODO}} A friend</p>")).toHaveLength(1);
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
  const botScope = "projects/fidu-bot";

  it("allows {{ … }} inside inline and fenced code when it isn't placeholder-style", () => {
    expect(scanContentFile(BOT, angular)).toEqual([]);
    expect(scanContentFileDetailed(BOT, angular).allowed).toEqual([
      { text: "{{ user.name }}", scope: botScope, where: "code" },
      { text: "{{ cv.title | translate }}", scope: botScope, where: "code" },
    ]);
  });

  it("still flags placeholder-style braces in code, and any braces outside code", () => {
    expect(scanContentFile(BOT, inBody("`{{TODO: ctx}}` ")).length).toBe(1);
    expect(scanContentFile(BOT, inBody("`{{PROJECT_NAME}}` ")).length).toBe(1);
    expect(scanContentFile(BOT, inBody("`{{ todo }}` ")).length).toBe(1);
    expect(scanContentFile(BOT, inBody("```\n{{ tbd }}\n```\n\n")).length).toBeGreaterThan(0);
    expect(scanContentFile(BOT, inBody("Hello {{ user.name }} outside code. ")).length).toBe(1);
  });

  it("the output check allows exactly what the source scan allowed, inside rendered code", () => {
    const { allowed } = scanContentFileDetailed(BOT, angular);
    const html = "<p>binds <code>{{ user.name }}</code></p><pre><code>&lt;p&gt;{{ cv.title | translate }}&lt;/p&gt;\n</code></pre>";
    const rsc = '0:["$","code",null,{"className":"language-html","children":"<p>{{ cv.title | translate }}</p>\\n"}]';
    expect(scanRenderedOutput(".next/server/app/projects/fidu-bot.html", html, allowed)).toEqual([]);
    expect(scanRenderedOutput(".next/server/app/projects/fidu-bot.rsc", rsc, allowed)).toEqual([]);
    expect(scanRenderedOutput(".next/server/app/projects/fidu-bot.html", "<code>{{ other }}</code>", allowed)).toHaveLength(1);
  });

  it('"built a Todo app" passes both scans; TODO, todo: and [todo still fail', () => {
    expect(scanContentFile(BOT, inBody("I built a Todo app and a todo list. "))).toEqual([]);
    expect(scanRenderedOutput("x.html", "<p>I built a Todo app and a todo list.</p>")).toEqual([]);
    expect(scanRenderedOutput("x.html", "<p>TODO</p><p>todo: x</p><p>[todo later]</p>").map((h) => h.marker)).toEqual(["TODO", "todo:", "[todo later]"]);
  });

  it("placeholder-ok (MDX body) opts out its own line, or the paragraph or fence after it", () => {
    const sameLine = inBody("The column said TBD for months. {/* placeholder-ok */}\n");
    expect(scanContentFile(BOT, sameLine)).toEqual([]);
    expect(scanContentFileDetailed(BOT, sameLine).allowed).toEqual([{ text: "TBD", scope: botScope, where: "anywhere" }]);
    const block = inBody("{/* placeholder-ok */}\nThe column said TBD\nand FIXME for months.\n\nTBD here is not covered.\n\n");
    expect(scanContentFile(BOT, block).map((h) => h.text)).toEqual(["TBD"]);
    const fence = inBody("{/* placeholder-ok */}\n```\n{{ user }}\n\nTBD\n```\n\n");
    expect(scanContentFile(BOT, fence)).toEqual([]);
    expect(scanContentFile(PROFILE, profile.replace(/tagline: .*,/, 'tagline: "TBD", // placeholder-ok'))).toEqual([]);
  });
});

describe("Sonar round 2 (5f90dc9)", () => {
  it("#1 scans 1 MB of input without overflowing the stack", () => {
    const big = `<p>${"lorem-free filler text. ".repeat(44_000)}</p>`;
    expect(big.length).toBeGreaterThan(1_000_000);
    const started = performance.now();
    expect(scanRenderedOutput("x.html", big)).toEqual([]);
    expect(scanContentFile(BOT, `${bot}\n${"Plain paragraph text. ".repeat(48_000)}\n`)).toEqual([]);
    expect(scanRenderedOutput("x.html", `${big}<p>TBD</p>`).map((h) => h.marker)).toEqual(["TBD"]);
    expect(performance.now() - started).toBeLessThan(5_000);
  });

  it("#2 a backtick escaped with \\ or inside a JSX expression is not code", () => {
    expect(scanContentFile(BOT, inBody("{`{{ fill me }}`} ")).length).toBeGreaterThan(0);
    expect(scanContentFile(BOT, inBody('\\`{"{{ fill me }}"}\\` ')).length).toBeGreaterThan(0);
    const allowed: AllowedMarker[] = [{ text: "{{ fill me }}", scope: "site", where: "code" }];
    expect(scanRenderedOutput("x.html", "<p>{{ fill me }}</p>", allowed)).toHaveLength(1);
    expect(scanRenderedOutput("x.rsc", '0:["$","p",null,{"children":"{{ fill me }}"}]', allowed)).toHaveLength(1);
    expect(scanRenderedOutput("x.html", "<p><code>{{ fill me }}</code></p>", allowed)).toEqual([]);
  });

  it("#3 an exemption only applies on the routes that render its file", () => {
    const allowed: AllowedMarker[] = [{ text: "{{ fill me }}", scope: "projects/portfolio-site", where: "code" }];
    const html = "<p><code>{{ fill me }}</code></p>";
    expect(scanRenderedOutput(".next/server/app/projects/portfolio-site.html", html, allowed)).toEqual([]);
    expect(scanRenderedOutput(".next/server/app/projects/fidu-bot.html", html, allowed)).toHaveLength(1);
    expect(scanRenderedOutput(".next/server/app/index.html", html, allowed)).toHaveLength(1);
    expect(routeScope(".next/server/app/projects/fidu-bot.segments/_full.segment.rsc")).toBe("projects/fidu-bot");
  });

  it("#4 frontmatter/TS: a standalone placeholder-ok covers the next key only", () => {
    const withProblem = bot.replace(PROBLEM, `# placeholder-ok\nproblem: "TBD while the client decides, then automated trading."`);
    const tbdSolution = withProblem.replace(/^solution: "/m, 'solution: "TBD ');
    expect(scanContentFile(BOT, withProblem)).toEqual([]);
    expect(scanContentFile(BOT, tbdSolution).map((h) => h.text)).toEqual(["TBD"]);
    expect(scanContentFileDetailed(BOT, withProblem).allowed).toEqual([{ text: "TBD", scope: "site", where: "anywhere" }]);
    const ts = profile.replace(/(\n\s*)tagline: .*,/, '$1// placeholder-ok$1tagline: "TBD",$1role: "TBD",');
    expect(scanContentFile(PROFILE, ts).map((h) => h.line)).toHaveLength(1);
  });

  it("#4 placeholder-ok never exempts {{TODO…}}, [TODO…] or TODO:", () => {
    for (const marker of ["{{TODO: x}}", "[TODO: x]", "TODO: x", "{{ tbd }}"]) {
      expect(scanContentFile(BOT, inBody(`${marker} {/* placeholder-ok */}\n`)).length, marker).toBe(1);
      expect(scanContentFile(BOT, inBody(`{/* placeholder-ok */}\n${marker}\n\n`)).length, marker).toBe(1);
    }
  });

  it("#4 every exemption is listed with file, line and reason", () => {
    const { exemptions } = scanContentFileDetailed(BOT, inBody("{/* placeholder-ok */}\nThe column said TBD.\n\nIt used `{{ user.name }}`.\n"));
    expect(exemptions).toEqual([
      { file: BOT, line: 31, text: "TBD", reason: "placeholder-ok on line 30" },
      { file: BOT, line: 33, text: "{{ user.name }}", reason: "{{ … }} inside code" },
    ]);
  });

  it("#5 placeholder-ok before {{TODO: …}} fails in both scans, consistently", () => {
    const source = inBody("{/* placeholder-ok */}\n{{TODO: write this}}\n\n");
    const { hits, allowed } = scanContentFileDetailed(BOT, source);
    expect(hits.map((h) => h.text)).toEqual(["{{TODO: write this}}"]);
    const html = "<p>{{TODO: write this}}</p>";
    expect(scanRenderedOutput(".next/server/app/projects/fidu-bot.html", html, allowed).map((h) => h.marker)).toEqual(["{{TODO: write this}}"]);
  });

  it("#6 RSC strings are joined only within a children array", () => {
    expect(scanRenderedOutput("x.rsc", '0:["$","p",null,{"className":"Lo","children":"rem ipsum"}]')).toEqual([]);
    expect(scanRenderedOutput("x.rsc", '0:["$","img",null,{"title":"Go to","alt":"do: list"}]')).toEqual([]);
    expect(scanRenderedOutput("x.rsc", '0:["$","a",null,{"className":"x","children":"children"}]')).toEqual([]);
    expect(scanRenderedOutput("x.rsc", '0:["$","p",null,{"children":["Lo","rem ipsum"]}]').map((h) => h.marker)).toEqual(["Lorem ipsum"]);
    expect(scanRenderedOutput("x.rsc", '1:T10,{{TODO: long}}\n0:["$","p",null,{"children":"$1"}]').map((h) => h.marker)).toEqual(["{{TODO: long}}"]);
  });

  it("nit: one hit per placeholder and view (HTML text, inline RSC), not per regex view", () => {
    const html = '<p>{{TODO: x}}</p><script>self.__next_f.push([1,"0:[\\"$\\",\\"p\\",null,{\\"children\\":\\"{{TODO: x}}\\"}]\\n"])</script>';
    expect(scanRenderedOutput("x.html", html).map((h) => h.marker)).toEqual(["{{TODO: x}}", "{{TODO: x}}"]);
  });

  it("nit: optOutLines stays linear on a large file", () => {
    const many = inBody(Array.from({ length: 5_000 }, (_, i) => `Line ${i} TBD {/* placeholder-ok */}`).join("\n") + "\n\n");
    const started = performance.now();
    expect(scanContentFile(BOT, many)).toEqual([]);
    expect(performance.now() - started).toBeLessThan(2_000);
  });
});
