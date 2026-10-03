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

  it("Kaner N2 (spec §8.1): any literal {{ … }} fails, inside inline and fenced code too", () => {
    expect(scanContentFile(BOT, angular).map((h) => h.text)).toEqual(["{{ user.name }}", "{{ cv.title | translate }}"]);
    expect(scanContentFileDetailed(BOT, angular).allowed).toEqual([]);
  });

  it("still flags placeholder-style braces in code, and any braces outside code", () => {
    expect(scanContentFile(BOT, inBody("`{{TODO: ctx}}` ")).length).toBe(1);
    expect(scanContentFile(BOT, inBody("`{{PROJECT_NAME}}` ")).length).toBe(1);
    expect(scanContentFile(BOT, inBody("`{{ todo }}` ")).length).toBe(1);
    expect(scanContentFile(BOT, inBody("```\n{{ tbd }}\n```\n\n")).length).toBeGreaterThan(0);
    expect(scanContentFile(BOT, inBody("Hello {{ user.name }} outside code. ")).length).toBe(1);
  });

  it("the output check never allows {{ … }}, not even inside rendered code or when an allow-list names it", () => {
    const allowed: AllowedMarker[] = [{ text: "{{ user.name }}", scope: botScope, where: "anywhere" }];
    const html = "<p>binds <code>{{ user.name }}</code></p><pre><code>&lt;p&gt;{{ cv.title | translate }}&lt;/p&gt;\n</code></pre>";
    const rsc = '0:["$","code",null,{"className":"language-html","children":"<p>{{ cv.title | translate }}</p>\\n"}]';
    expect(scanRenderedOutput(".next/server/app/projects/fidu-bot.html", html, allowed).map((h) => h.marker)).toEqual(["{{ user.name }}", "{{ cv.title | translate }}"]);
    expect(scanRenderedOutput(".next/server/app/projects/fidu-bot.rsc", rsc, allowed)).toHaveLength(1);
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
    const fence = inBody("{/* placeholder-ok */}\n```\nTBD\n\nFIXME\n```\n\n");
    expect(scanContentFile(BOT, fence)).toEqual([]);
    // …but never a {{ … }}, fenced or not.
    expect(scanContentFile(BOT, inBody("{/* placeholder-ok */}\n```\n{{ user }}\n```\n\n")).map((h) => h.text)).toEqual(["{{ user }}"]);
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
    const allowed: AllowedMarker[] = [{ text: "TBD", scope: "site", where: "code" }];
    expect(scanRenderedOutput("x.html", "<p>TBD</p>", allowed)).toHaveLength(1);
    expect(scanRenderedOutput("x.rsc", '0:["$","p",null,{"children":"TBD"}]', allowed)).toHaveLength(1);
    expect(scanRenderedOutput("x.html", "<p><code>TBD</code></p>", allowed)).toEqual([]);
  });

  it("#3 an exemption only applies on the routes that render its file", () => {
    const allowed: AllowedMarker[] = [{ text: "TBD", scope: "projects/portfolio-site", where: "code" }];
    const html = "<p><code>TBD</code></p>";
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
    const { exemptions } = scanContentFileDetailed(BOT, inBody("{/* placeholder-ok */}\nThe column said TBD.\n\nThen FIXME. {/* placeholder-ok */}\n"));
    expect(exemptions).toEqual([
      { file: BOT, line: 31, text: "TBD", reason: "placeholder-ok on line 30" },
      { file: BOT, line: 33, text: "FIXME", reason: "placeholder-ok on line 33" },
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

describe("Sonar f49 follow-ups: markers split by markup or invisible characters", () => {
  const markers = (file: string, body: string) => scanRenderedOutput(file, body).map((h) => h.marker);

  it("F1 braces split by an empty element", () => {
    expect(markers("x.html", "<p>{<span></span>{ fill me }}</p>")).toEqual(["{{ fill me }}"]);
    const rsc = '1:["$","p",null,{"children":["{",["$","span",null,{}],"{"," fill me ","}","}"]}]';
    expect(markers("x.rsc", rsc)).toContain("{{ fill me }}");
  });

  it("F2 braces split by emphasis", () => {
    expect(markers("x.html", "<p>{<em>{</em>fill me}}</p>")).toEqual(["{{fill me}}"]);
    const rsc = '1:["$","p",null,{"children":["{",["$","em",null,{"children":"{"}],"fill me","}","}"]}]';
    expect(markers("x.rsc", rsc)).toContain("{{fill me}}");
  });

  it("F7 lorem ipsum split by emphasis", () => {
    expect(markers("x.html", "<p>Lo<em>rem</em> ipsum dolor.</p>")).toEqual(["Lorem ipsum"]);
    const rsc = '1:["$","p",null,{"children":["Lo",["$","em",null,{"children":"rem"}]," ipsum"]}]';
    expect(markers("x.rsc", rsc)).toContain("Lorem ipsum");
  });

  it("block boundaries become spaces, inline code stays code (no false positives)", () => {
    expect(markers("x.html", "<p>TO</p><p>DO</p><ul><li>Lo</li><li>rem</li></ul>")).toEqual([]);
    expect(markers("x.html", "<p>To-do: <strong>Todo</strong> app</p><script>var x='{'</script><p>{ a }</p>")).toEqual([]);
  });

  it.each([
    ["U+00AD soft hyphen", "\u00AD"],
    ["U+034F combining grapheme joiner", "\u034F"],
    ["U+180E Mongolian vowel separator", "\u180E"],
    ["U+2061 function application", "\u2061"],
    ["U+2062 invisible times", "\u2062"],
    ["U+2063 invisible separator", "\u2063"],
    ["U+2064 invisible plus", "\u2064"],
  ])("F4 %s doesn't hide TODO", (_name, ch) => {
    expect(scanContentFile(BOT, inBody(`TO${ch}DO fill me. `)).map((h) => h.text)).toContain("TODO");
    expect(markers("x.html", `<p>TO${ch}DO fill me.</p>`)).toEqual(["TODO"]);
  });

  it("F4 entity-encoded soft hyphen", () => {
    expect(scanContentFile(BOT, inBody("TO&shy;DO fill me. ")).map((h) => h.text)).toContain("TODO");
    expect(markers("x.html", "<p>TO&shy;DO</p>")).toEqual(["TODO"]);
  });

  it.each([
    ["F1 empty element between braces", '{"{"}<span></span>{"{"} fill me {"}"}{"}"} ', "{{ fill me }}"],
    ["F2 braces split by emphasis (renders `{*{*fill me}}`)", '{"{"}*{"{"}*fill me{"}"}{"}"} ', "{{fill me}}"],
    ["F7 lorem split by emphasis", "Lo*rem* ipsum dolor. ", "Lorem ipsum"],
    ["TODO split by an inline tag", "TO<span></span>DO fill me. ", "TODO"],
    ["TBD split by strong", "T**B**D. ", "TBD"],
  ])("source scan: %s", (_name, prefix, marker) => {
    expect(scanContentFile(BOT, inBody(prefix)).map((h) => h.text)).toContain(marker);
  });

  it("the markup-free view keeps code literal and adds no false positives", () => {
    expect(scanContentFile(BOT, inBody("Use `snake_case` and *emphasis*, a to_do list, 5 * 3. "))).toEqual([]);
    expect(scanContentFile(BOT, inBody("Code: `TB_D` and `Lo*rem* ipsum` stay literal. "))).toEqual([]);
  });

  it("the real published content stays clean", () => {
    expect(scanContentFile(BOT, bot)).toEqual([]);
  });
});

describe("Kaner N2 (spec §8.1): any literal {{…}} fails, normalized first", () => {
  const texts = (file: string, source: string) => scanContentFile(file, source).map((h) => h.text);

  it("(a) inside inline code and code blocks, any case or spacing", () => {
    expect(texts(BOT, inBody("`{{FRASE VALOR}}` "))).toEqual(["{{FRASE VALOR}}"]);
    expect(texts(BOT, inBody("`{{ user.name }}` "))).toEqual(["{{ user.name }}"]);
    expect(texts(BOT, inBody("```\n{{\n  todo\n}}\n```\n\n"))).toEqual(["{{ todo }}"]);
    expect(scanRenderedOutput("x.html", "<pre><code>{{ cv.title | translate }}</code></pre>")).toHaveLength(1);
  });

  it("(b) lowercase, spaced prose slot", () => {
    expect(texts(BOT, inBody("Result: `{{ insert metric here }}`. "))).toEqual(["{{ insert metric here }}"]);
    expect(texts(BOT, inBody('Result: {"{{ insert metric here }}"}. '))).toEqual(["{{ insert metric here }}"]);
  });

  it("(c) no length cap on the inner text, newlines included", () => {
    const long = "write the real problem statement here ".repeat(30);
    expect(long.length).toBeGreaterThan(1000);
    expect(texts(BOT, inBody(`{"{{"}${long}{"}}"} `))).toHaveLength(1);
    expect(texts(PROFILE, profile.replace(/tagline: .*,/, `tagline: \`{{${long.replaceAll(" here ", "\n")}}}\`,`))).toHaveLength(1);
    expect(scanRenderedOutput("x.html", `<p>{{${"x".repeat(5000)}}}</p>`)).toHaveLength(1);
  });

  it("(d) inner braces in a frontmatter slot", () => {
    expect(texts(BOT, bot.replace(PROBLEM, 'problem: "{{PROBLEM {x} HERE}} An independent trader."'))).toEqual(["{{PROBLEM {x} HERE}}"]);
    expect(scanRenderedOutput("x.html", "<p>{{a {b} c}}</p>").map((h) => h.marker)).toEqual(["{{a {b} c}}"]);
  });

  it("(e) NFKC: fullwidth braces and letters", () => {
    expect(texts(BOT, inBody("\uff5b\uff5bFRASE_VALOR\uff5d\uff5d "))).toHaveLength(1);
    expect(texts(BOT, inBody("\uff34\uff2f\uff24\uff2f fill me. "))).toHaveLength(1); // ＴＯＤＯ
    expect(scanRenderedOutput("x.html", "<p>\uff5b\uff5bx\uff5d\uff5d</p>")).toHaveLength(1);
  });

  it.each([
    ["Cyrillic О in TODO", "T\u041eDO fill me. "],
    ["Cyrillic Т and О", "\u0422\u041eDO fill me. "],
    ["Greek Τ and Ο", "\u03a4\u039fDO fill me. "],
    ["Cyrillic В in TBD", "T\u0412D. "],
    ["Greek Ι and Μ in FIXME", "F\u0399X\u039cE. "],
    ["Cyrillic о and е in lorem", "L\u043er\u0435m ipsum. "],
  ])("(e) look-alike letters: %s", (_name, prefix) => {
    expect(texts(BOT, inBody(prefix))).toHaveLength(1);
    expect(scanRenderedOutput("x.html", `<p>${prefix}</p>`)).toHaveLength(1);
  });

  it("no false positives from folding: real Cyrillic/Greek words, a Todo app, single braces", () => {
    expect(texts(BOT, inBody("Привет, мир. Καλημέρα. I built a Todo app with {teamSize} people. "))).toEqual([]);
  });
});
