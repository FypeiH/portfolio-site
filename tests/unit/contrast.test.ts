import fs from "node:fs";
import { describe, expect, it } from "vitest";

/** Token colours as declared in styles/globals.css (so a token change is checked, not a copy). */
const css = fs.readFileSync("styles/globals.css", "utf8");
const token = (name: string) => {
  const hex = new RegExp(`--color-${name}:\\s*(#[0-9a-f]{6})`, "i").exec(css)?.[1];
  if (!hex) throw new Error(`--color-${name} not found`);
  return hex;
};

const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a: string, b: string) => {
  const [hi, lo] = [luminance(token(a)), luminance(token(b))].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};

/** visual-direction §2: every text/UI pair the site uses, with its WCAG minimum. */
const ALLOWED: [fg: string, bg: string, min: number][] = [
  ["fg", "bg", 4.5], ["fg", "surface", 4.5], ["fg", "surface-strong", 4.5],
  ["muted", "bg", 4.5], ["muted", "surface", 4.5], ["muted", "surface-strong", 4.5],
  ["subtle", "bg", 4.5], ["subtle", "surface", 4.5],
  ["accent", "bg", 4.5], ["accent", "surface", 4.5], ["accent-strong", "bg", 4.5],
  ["accent-ink", "accent", 4.5], ["accent-ink", "accent-strong", 4.5], ["bg", "fg", 4.5],
  ["success", "bg", 3], ["border-strong", "bg", 3], ["border-strong", "surface", 3],
];

/** Pairs §2 forbids: they must stay below AA, and the CSS must never combine them. */
const FORBIDDEN: [fg: string, bg: string][] = [["subtle", "surface-strong"], ["fg", "accent"]];

describe("colour contrast of the token pairs (visual-direction §2)", () => {
  it.each(ALLOWED)("%s on %s ≥ %s:1", (fg, bg, min) => {
    expect(ratio(fg, bg)).toBeGreaterThanOrEqual(min);
  });

  it.each(FORBIDDEN)("%s on %s is below AA (so it stays forbidden)", (fg, bg) => {
    expect(ratio(fg, bg)).toBeLessThan(4.5);
  });

  it("no CSS rule paints surface-strong under subtle text, or fg text on accent", () => {
    // Rule bodies (innermost braces) that set both colours of a forbidden pair.
    const bodies = css.match(/\{[^{}]*\}/g) ?? [];
    for (const body of bodies) {
      expect(/background(?:-color)?:\s*var\(--color-surface-strong\)/.test(body) && /color:\s*var\(--color-subtle\)/.test(body), body).toBe(false);
      expect(/background(?:-color)?:\s*var\(--color-accent\)/.test(body) && /(?<!-)color:\s*var\(--color-fg\)/.test(body), body).toBe(false);
    }
  });
});
