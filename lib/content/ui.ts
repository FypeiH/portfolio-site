import type { site } from "@/content/site";

export type UiStrings = (typeof site)["ui"];

/** Fills `{name}` runtime slots in a UI string (single braces; `{{…}}` are content placeholders). */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (slot, key: string) => (key in values ? String(values[key]) : slot));
}
