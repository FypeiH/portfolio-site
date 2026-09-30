import type { Placeholder } from "./types";

/**
 * Placeholder detection for the production guard (spec §3.3, QA FIL-8).
 *
 * Text is scanned as a whole (never line by line) after normalisation: HTML entities and JS escapes
 * are decoded and every run of whitespace, newlines included, becomes one space, so a marker split
 * across lines, YAML folded/literal blocks or template literals is still found. Callers strip what
 * never renders (code comments) before scanning; see scan.ts.
 */

const EXACT_PLACEHOLDER = /^\{\{[^}]+\}\}$/;

/** Every rule is word-bounded so real words ("tbdx", "todos", "lorems") don't match. */
const MARKERS: readonly { label: string; pattern: RegExp }[] = [
  { label: "{{…}}", pattern: /\{\s?\{[^{}]{0,300}\}\s?\}/g },
  { label: "[TODO…]", pattern: /\[\s?todo\b[^\]]{0,300}\]/gi },
  { label: "TODO:", pattern: /\btodo\s?:/gi },
  { label: "TODO", pattern: /\bTODO\b/g },
  { label: "TBD", pattern: /\btbd\b/gi },
  { label: "FIXME", pattern: /\bfixme\b/gi },
  { label: "Lorem ipsum", pattern: /\blorem\s?ipsum\b/gi },
];

export interface PlaceholderHit {
  file: string;
  line: number;
  text: string;
}

/** A string plus, for every character, its offset in the original source (to report lines). */
export interface MappedText {
  text: string;
  offsets: number[];
}

export const mapped = (text: string): MappedText => ({ text, offsets: Array.from(text, (_, i) => i) });

/** Replaces every match with `replace(match)`, keeping the offset of the match start for new characters. */
function mapReplace(input: MappedText, pattern: RegExp, replace: (match: RegExpExecArray) => string): MappedText {
  let text = "";
  const offsets: number[] = [];
  let last = 0;
  for (const match of input.text.matchAll(pattern)) {
    const start = match.index;
    text += input.text.slice(last, start);
    offsets.push(...input.offsets.slice(last, start));
    const replacement = replace(match as RegExpExecArray);
    text += replacement;
    offsets.push(...Array.from(replacement, () => input.offsets[start] ?? 0));
    last = start + match[0].length;
  }
  text += input.text.slice(last);
  offsets.push(...input.offsets.slice(last));
  return { text, offsets };
}

const NAMED_ENTITIES: Record<string, string> = {
  lbrace: "{", lcub: "{", rbrace: "}", rcub: "}", lsqb: "[", lbrack: "[", rsqb: "]", rbrack: "]",
  colon: ":", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", num: "#", sol: "/",
};

const fromCodePoint = (value: number) => (Number.isInteger(value) && value >= 0 && value <= 0x10ffff ? String.fromCodePoint(value) : "");

/** Decodes HTML entities (&#123; &#x7B; &lbrace;) and JS escapes (\x7b \u007b \u{7b}), repeatedly for double encoding. */
export function decode(input: MappedText): MappedText {
  let current = input;
  for (let pass = 0; pass < 3; pass++) {
    const next = mapReplace(
      mapReplace(current, /&(?:#(\d{1,7})|#x([0-9a-f]{1,6})|([a-z]{2,8}));?/gi, (m) => {
        if (m[1]) return fromCodePoint(Number(m[1]));
        if (m[2]) return fromCodePoint(parseInt(m[2], 16));
        return NAMED_ENTITIES[(m[3] ?? "").toLowerCase()] ?? m[0];
      }),
      /\\(?:x([0-9a-f]{2})|u\{([0-9a-f]{1,6})\}|u([0-9a-f]{4}))/gi,
      (m) => fromCodePoint(parseInt(m[1] ?? m[2] ?? m[3] ?? "", 16)),
    );
    if (next.text === current.text) return next;
    current = next;
  }
  return current;
}

/** Collapses every run of whitespace (and escaped newlines in strings) into one space. */
export const collapseWhitespace = (input: MappedText): MappedText => mapReplace(input, /(?:\s|\\[nrt])+/g, () => " ");

export const normalize = (input: MappedText): MappedText => collapseWhitespace(decode(input));

/** Finds markers in already-extracted text; `source` is the original file text, for line numbers. */
export function findMarkers(input: MappedText, source: string, file: string): PlaceholderHit[] {
  const { text, offsets } = normalize(input);
  const hits = new Map<number, PlaceholderHit>();
  for (const { pattern } of MARKERS) {
    for (const match of text.matchAll(pattern)) {
      const offset = offsets[match.index] ?? 0;
      if ([...hits.keys()].some((start) => Math.abs(start - offset) < 3)) continue;
      hits.set(offset, { file, line: source.slice(0, offset).split("\n").length, text: match[0].trim() });
    }
  }
  return [...hits.values()].sort((a, b) => a.line - b.line);
}

/** Plain-text scan of a whole file (no comment stripping). */
export function findPlaceholders(source: string, file: string): PlaceholderHit[] {
  return findMarkers(mapped(source), source, file);
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
