import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HeroPhoto } from "@/components/sections/HeroPhoto";
import { HERO_ASCII } from "@/lib/hero-photo";

describe("hero ASCII portrait", () => {
  it("prerenders an empty, labelled box: the art is loaded on the client at lg only", () => {
    const html = renderToStaticMarkup(createElement(HeroPhoto));
    expect(html).toMatch(/<pre role="img" aria-label="Filipe&#x27;s face in ASCII art" class="hero-photo-ascii[^"]*"><\/pre>/);
    expect(html.length).toBeLessThan(1000);
    expect(HERO_ASCII.length).toBeGreaterThan(30000);
  });

  it("the reserved box matches the art: 610 columns × 130 rows", () => {
    const lines = HERO_ASCII.replace(/\n$/, "").split("\n");
    expect(lines).toHaveLength(130);
    expect(Math.max(...lines.map((line) => line.length))).toBe(610);
  });
});
