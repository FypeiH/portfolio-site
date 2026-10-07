import type { site } from "@/content/site";

export type UiStrings = (typeof site)["ui"];

/** Fills `{name}` runtime slots in a UI string (single braces; `{{…}}` are content placeholders). */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (slot, key: string) => (key in values ? String(values[key]) : slot));
}

/**
 * A UI string that content/site.ts may not define yet: its value when present, else `fallback`. Lets a
 * component ship before the copy lands; once the key is in site.ts, read it directly instead.
 */
export function uiOr(ui: UiStrings, key: string, fallback: string): string {
  const value = (ui as Record<string, string | undefined>)[key];
  return value && value.trim() !== "" ? value : fallback;
}
