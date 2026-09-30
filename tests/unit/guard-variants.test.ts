import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { isScannableOutput, scanRenderedOutput } from "@/lib/content/output-scan";
import { findShippedPlaceholders, scanContentFile } from "@/lib/content/scan";
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
