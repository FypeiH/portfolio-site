import { OgFrame, ogColors, OgLabel } from "@/lib/og";
import { OG_MAX_TAGS } from "@/lib/og-size";

/** Height of a tag (and of the single tag row), px. */
const TAG_ROW_HEIGHT = 44;

export interface ProjectOgCardProps {
  title: string;
  summary: string;
  stack: readonly string[];
  footer: string;
}

/**
 * The case-study OG card (app/projects/[slug]/opengraph-image.tsx). Kept apart so a unit test can draw
 * the worst case the schema allows (60-char title, 140-char summary, four 20-char tags) and check it
 * never reaches the footer (tests/unit/og-worst-case.test.ts).
 */
export function ProjectOgCard({ title, summary, stack, footer }: ProjectOgCardProps) {
  // Anton is condensed: ~30 uppercase characters fit a line at 88 px; longer titles step down. Near the
  // schema limits (title > 45 or summary > 110 chars) the whole card tightens so three title lines,
  // three summary lines and the tag row still clear the footer (tests/unit/og-worst-case.test.ts).
  const compact = title.length > 45 || summary.length > 110;
  const titleSize = title.length <= 30 ? 88 : title.length <= 45 ? 68 : 56;
  const gap = compact ? 16 : 22;
  return (
    <OgFrame footer={footer} compact={compact}>
      <OgLabel>Case study</OgLabel>
      <div style={{ marginTop: gap, fontFamily: "Anton", fontSize: titleSize, lineHeight: 1.05, textTransform: "uppercase", maxWidth: 1000 }}>{title}</div>
      <div style={{ marginTop: gap, fontSize: compact ? 24 : 28, lineHeight: 1.35, color: ogColors.muted, maxWidth: 960 }}>{summary}</div>
      {/* One row only: tags keep their width and a tag that doesn't fit wraps to a second row, which is clipped
          (four 20-character tags used to squash and overprint each other). */}
      <div style={{ marginTop: compact ? 24 : 32, display: "flex", flexShrink: 0, flexWrap: "wrap", gap: 14, height: TAG_ROW_HEIGHT, overflow: "hidden" }}>
        {stack.slice(0, OG_MAX_TAGS).map((tech) => (
          <div
            key={tech}
            style={{ flexShrink: 0, height: TAG_ROW_HEIGHT, display: "flex", alignItems: "center", fontSize: 20, lineHeight: 1, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", padding: "0 16px", border: `2px solid ${ogColors.borderStrong}`, color: ogColors.fg }}
          >
            {tech}
          </div>
        ))}
      </div>
    </OgFrame>
  );
}
