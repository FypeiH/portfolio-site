import { createElement as h } from "react";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { loadOgFonts, OG_SIZE } from "@/lib/og";
import { ProjectOgCard, type ProjectOgCardProps } from "@/lib/og-project-card";

/**
 * Sonar on 9631ada: the longest content the schema allows (title ≤ 60, summary ≤ 140, tags ≤ 20 chars,
 * four drawn) must stay clear of the footer. Each card is compared with a minimal one: from a few pixels
 * above the footer rule down to the bottom edge, the two images must be identical.
 */
const FOOTER = "Filipe Bravo · Portfolio";
const RULE = [0x2e, 0x2e, 0x2e];
const CLEARANCE = 12; // px above the footer rule that must stay page colour

async function raw(props: ProjectOgCardProps) {
  const response = new ImageResponse(h(ProjectOgCard, props), { ...OG_SIZE, fonts: await loadOgFonts() });
  const { data, info } = await sharp(Buffer.from(await response.arrayBuffer())).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

const wide = (length: number, words: readonly string[]) => {
  let out = "";
  for (let i = 0; out.length < length; i++) out += `${out ? " " : ""}${words[i % words.length]}`;
  return out.slice(0, length).trimEnd().padEnd(length, "M");
};

describe("case-study OG card, worst case", () => {
  const cases: Record<string, ProjectOgCardProps> = {
    "realistic long copy": {
      title: wide(60, ["Workflow", "monitor", "with", "webhook", "messaging", "and", "maximum"]),
      summary: wide(140, ["Monitors", "many", "warehouse", "workflows,", "merges", "webhook", "messages", "from", "multiple", "systems"]),
      stack: ["W".repeat(20), "M".repeat(20), "W".repeat(20), "M".repeat(20)],
      footer: FOOTER,
    },
    "widest letters (three title lines)": {
      title: wide(60, ["WWW", "MMM", "WMW"]),
      summary: wide(140, ["WMW", "mmm", "www"]),
      stack: ["M".repeat(20), "W".repeat(20), "M".repeat(20), "W".repeat(20)],
      footer: FOOTER,
    },
  };

  it("fixtures are at the schema limits", () => {
    for (const props of Object.values(cases)) {
      expect(props.title).toHaveLength(60);
      expect(props.summary).toHaveLength(140);
      for (const tag of props.stack) expect(tag).toHaveLength(20);
    }
  });

  for (const [name, props] of Object.entries(cases)) {
    it(`${name}: nothing reaches the footer`, async () => {
      const [card, base] = await Promise.all([raw(props), raw({ title: "X", summary: "Y", stack: ["A"], footer: FOOTER })]);
      const px = (img: typeof card, x: number, y: number) => [...img.data.subarray((y * img.width + x) * 3, (y * img.width + x) * 3 + 3)];
      let rule = -1;
      for (let y = base.height - 1; y > 0 && rule < 0; y--) if (px(base, 200, y).join() === RULE.join()) rule = y;
      expect(rule).toBeGreaterThan(base.height / 2);
      const differing: number[] = [];
      for (let y = rule - 1 - CLEARANCE; y < base.height; y++) {
        const row = [y * base.width * 3, (y + 1) * base.width * 3] as const;
        if (Buffer.compare(card.data.subarray(...row), base.data.subarray(...row)) !== 0) differing.push(y);
      }
      expect(differing, `rows that differ from the minimal card (footer rule at y=${rule})`).toEqual([]);
    }, 60_000);
  }
});
