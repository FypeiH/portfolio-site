import type { ProjectVisibility } from "./types";

/** `<Diagram />` uses in an MDX body, ignoring code (fenced and inline) and comments. */
export function countDiagramSlots(mdx: string): number {
  const prose = mdx
    .replace(/^[ \t]*(```|~~~)[\s\S]*?^[ \t]*\1[ \t]*$/gm, "")
    .replace(/`[^`\n]*`/g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}|<!--[\s\S]*?-->/g, "");
  return prose.match(/<Diagram\b[^>]*\/>/g)?.length ?? 0;
}

/**
 * Where a case study shows problem → solution → impact (spec §3.4): private/nda projects only,
 * exactly once: right after the diagram when the body has one `<Diagram />`, otherwise (none, or
 * several) right after the header.
 */
export type KeyFactsPlacement = "none" | "header" | "diagram";

export const keyFactsPlacement = (visibility: ProjectVisibility, diagramSlots: number): KeyFactsPlacement =>
  visibility === "public" ? "none" : diagramSlots === 1 ? "diagram" : "header";
