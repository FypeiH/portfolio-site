import type { site } from "@/content/site";

/** UI labels that content may leave out; components render them only when present (site.ui schema). */
export interface OptionalUiStrings {
  /** Label above `problem` in a private/nda case study's key facts (spec §3.4). */
  problemLabel?: string;
  /** Label above `solution` in the same block. */
  solutionLabel?: string;
}

export type UiStrings = Omit<(typeof site)["ui"], keyof OptionalUiStrings> & OptionalUiStrings;

/** Fills `{name}` runtime slots in a UI string (single braces; `{{…}}` are content placeholders). */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (slot, key: string) => (key in values ? String(values[key]) : slot));
}
