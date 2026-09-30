/** Joins truthy class names. Tailwind conflicts are avoided by design, so no merge step is needed. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
