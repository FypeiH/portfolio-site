import { describe, expect, it } from "vitest";
import { analyzeBody, bodyProblems } from "@/lib/content/body";
import { mdxBody } from "./fixtures";

describe("analyzeBody", () => {
  it("counts sections and prose words, excluding frontmatter, placeholders, JSX and link targets", () => {
    const mdx = '---\ntitle: "Ten words should never count here at all ok"\n---\n## Context\n\nOne two three.\n\n<Diagram />\n\n`{{TODO: many words that must not count}}`\n\nSee the [App Store](https://apps.apple.com/x).\n\n## Results\n';
    expect(analyzeBody(mdx)).toEqual({ sections: 2, words: 9 });
  });
});

describe("bodyProblems (PM rule: full format only for featured case studies)", () => {
  it("requires 300 words and 6 sections for featured projects", () => {
    expect(bodyProblems(analyzeBody(mdxBody(6, 300)), true)).toEqual([]);
    expect(bodyProblems(analyzeBody(mdxBody(6, 200)), true)).toEqual([
      expect.stringContaining("featured case studies need at least 300"),
    ]);
    expect(bodyProblems(analyzeBody(mdxBody(3, 400)), true)).toEqual([
      expect.stringContaining("featured case studies need at least 6"),
    ]);
  });

  it("lets non-featured projects be short with 3 sections", () => {
    expect(bodyProblems(analyzeBody(mdxBody(3, 80)), false)).toEqual([]);
    expect(bodyProblems(analyzeBody(mdxBody(2, 80)), false)).toEqual([
      expect.stringContaining("non-featured case studies need at least 3"),
    ]);
  });

  it("caps every case study at 1200 words", () => {
    expect(bodyProblems(analyzeBody(mdxBody(3, 1300)), false)).toEqual([expect.stringContaining("maximum is 1200")]);
  });
});
