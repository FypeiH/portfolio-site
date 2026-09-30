import { describe, expect, it } from "vitest";
import { findPlaceholders, isPlaceholder, known } from "@/lib/content/placeholders";

describe("placeholders", () => {
  it("finds every {{…}} marker with its line", () => {
    const source = 'title: "{{TODO: name}}"\nok: 1\nstack: ["{{TODO: a}}", "{{TODO: b}}"]';
    expect(findPlaceholders(source, "x.mdx")).toEqual([
      { file: "x.mdx", line: 1, text: "{{TODO: name}}" },
      { file: "x.mdx", line: 3, text: "{{TODO: a}}" },
      { file: "x.mdx", line: 3, text: "{{TODO: b}}" },
    ]);
  });

  it("ignores single-brace runtime slots", () => {
    expect(findPlaceholders("Team of {teamSize}", "site.ts")).toEqual([]);
  });

  it("detects exact placeholders only", () => {
    expect(isPlaceholder("{{TODO: url}}")).toBe(true);
    expect(isPlaceholder("{{TODO: name}}: data collection")).toBe(false);
    expect(isPlaceholder(42)).toBe(false);
  });

  it("known() drops unfilled values", () => {
    expect(known("{{TODO: url}}")).toBeUndefined();
    expect(known("https://example.com")).toBe("https://example.com");
    expect(known(undefined)).toBeUndefined();
  });
});
