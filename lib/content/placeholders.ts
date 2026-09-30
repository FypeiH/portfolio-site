import type { Placeholder } from "./types";

const PLACEHOLDER = /\{\{[^}]+\}\}/g;
const EXACT_PLACEHOLDER = /^\{\{[^}]+\}\}$/;

export interface PlaceholderHit {
  file: string;
  line: number;
  text: string;
}

export function findPlaceholders(source: string, file: string): PlaceholderHit[] {
  return source.split("\n").flatMap((content, index) =>
    Array.from(content.matchAll(PLACEHOLDER), ([match]) => ({ file, line: index + 1, text: match })),
  );
}

export function isPlaceholder(value: unknown): value is Placeholder {
  return typeof value === "string" && EXACT_PLACEHOLDER.test(value);
}

/** Drops a value that is still an exact placeholder, so the UI can hide or dash it. */
export function known<T>(value: T | Placeholder | undefined): Exclude<T, Placeholder> | undefined {
  return value === undefined || isPlaceholder(value) ? undefined : (value as Exclude<T, Placeholder>);
}

export function formatHits(hits: readonly PlaceholderHit[]): string {
  return hits.map((hit) => `  ${hit.file}:${hit.line}  ${hit.text}`).join("\n");
}
