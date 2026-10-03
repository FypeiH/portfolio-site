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
/**
 * Case rules (shared with the rendered-output check, output-scan.ts): bare `TODO` is uppercase only,
 * so "a Todo app" passes; `todo:` and `[todo…]` match in any case; TBD, FIXME and lorem ipsum in any case.
 */
export const MARKERS: readonly { label: string; pattern: RegExp }[] = [
  // Any literal {{…}} (spec §8.1): any case, any spacing, any length (newlines are already collapsed),
  // inner braces allowed (`{{PROBLEM {x} HERE}}`). Lazy, so it ends at the first `}}`.
  { label: "{{…}}", pattern: /\{\s?\{[\s\S]*?\}\s?\}/g },
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

/** A marker match with its [offset, end) range in the original source and the rule that found it. */
export interface MarkerMatch extends PlaceholderHit {
  offset: number;
  end: number;
  label: string;
}

/** Line numbers by offset in O(log n): a sorted index of line starts, searched by bisection. */
export function lineIndex(source: string): (offset: number) => number {
  const starts = [0];
  for (let i = source.indexOf("\n"); i !== -1; i = source.indexOf("\n", i + 1)) starts.push(i + 1);
  return (offset) => {
    let low = 0;
    let high = starts.length - 1;
    while (low < high) {
      const mid = (low + high + 1) >> 1;
      if ((starts[mid] ?? 0) <= offset) low = mid;
      else high = mid - 1;
    }
    return low + 1;
  };
}

/**
 * Markers that are always placeholders, whatever the context: `[TODO…]`, `TODO:` and every literal
 * `{{…}}` (spec §8.1: inside code too, e.g. an Angular `{{ user.name }}` must be written another way).
 * `placeholder-ok` can't exempt them (scan.ts).
 */
export const isPlaceholderMarker = (match: Pick<MarkerMatch, "label" | "text">) =>
  match.label === "[TODO…]" || match.label === "TODO:" || match.label === "{{…}}";

/**
 * `{{ … }}` whose inner text is TODO-style (any other marker, or an all-caps slot like `{{PROJECT_NAME}}`).
 * Only a `{{ … }}` that is NOT placeholder-style may be allowed inside code (see scan.ts).
 */
export function isPlaceholderStyle(braces: string): boolean {
  const inner = braces.replace(/^\{\s?\{|\}\s?\}$/g, "");
  if (/^\s*[A-Z][A-Z0-9_]*\s*$/.test(inner) || /\btodo\b/i.test(inner)) return true;
  return MARKERS.some(({ label, pattern }) => label !== "{{…}}" && new RegExp(pattern.source, pattern.flags).test(inner));
}

/** A string plus, for every character, its offset in the original source (to report lines). */
export interface MappedText {
  text: string;
  offsets: number[];
}

export const mapped = (text: string): MappedText => {
  const offsets = new Array<number>(text.length);
  for (let i = 0; i < text.length; i++) offsets[i] = i;
  return { text, offsets };
};

/** Replaces every match with `replace(match)`, keeping the offset of the match start for new characters. */
export function mapReplace(input: MappedText, pattern: RegExp, replace: (match: RegExpExecArray) => string): MappedText {
  // Plain loops, never push(...array): spreading a large array into a call overflows the stack (~125 KB input).
  let text = "";
  const offsets: number[] = [];
  const copy = (from: number, to: number) => {
    for (let i = from; i < to; i++) offsets.push(input.offsets[i] ?? 0);
  };
  let last = 0;
  for (const match of input.text.matchAll(pattern)) {
    const start = match.index;
    text += input.text.slice(last, start);
    copy(last, start);
    const replacement = replace(match as RegExpExecArray);
    text += replacement;
    for (let i = 0; i < replacement.length; i++) offsets.push(input.offsets[start] ?? 0);
    last = start + match[0].length;
  }
  text += input.text.slice(last);
  copy(last, input.text.length);
  return { text, offsets };
}

const NAMED_ENTITIES: Record<string, string> = {
  lbrace: "{", lcub: "{", rbrace: "}", rcub: "}", lsqb: "[", lbrack: "[", rsqb: "]", rbrack: "]",
  colon: ":", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", num: "#", sol: "/",
  shy: "\u00AD", zwnj: "\u200C", zwj: "\u200D", nobreak: "\u2060",
};

const fromCodePoint = (value: number) => (Number.isInteger(value) && value >= 0 && value <= 0x10ffff ? String.fromCodePoint(value) : "");

/**
 * Invisible characters that would hide a marker (T\u200bODO, TO\u00adDO) without changing what readers
 * see: zero-width space/joiners, word joiner, BOM, soft hyphen, combining grapheme joiner, Mongolian
 * vowel separator and the invisible math operators (U+2061–2064).
 */
const ZERO_WIDTH = /[\u00AD\u034F\u180E\u200B-\u200D\u2060-\u2064\uFEFF]/g;

/**
 * Decodes HTML entities (&#123; &#x7B; &lbrace;) and JS escapes (\x7b \u007b \u{7b}), repeatedly for
 * double encoding, and drops zero-width characters (raw or produced by decoding).
 */
export function decode(input: MappedText): MappedText {
  let current = mapReplace(input, ZERO_WIDTH, () => "");
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
    const stripped = mapReplace(next, ZERO_WIDTH, () => "");
    if (stripped.text === current.text) return stripped;
    current = stripped;
  }
  return current;
}

/** Collapses every run of whitespace (and escaped newlines in strings) into one space. */
export const collapseWhitespace = (input: MappedText): MappedText => mapReplace(input, /(?:\s|\\[nrt])+/g, () => " ");

/**
 * Look-alike letters that would hide a marker from the ASCII rules (T\u041EDO with a Cyrillic О,
 * Greek Τ…): Cyrillic and Greek letters drawn like Latin ones, folded for matching only.
 */
const CONFUSABLES: Record<string, string> = {
  // Cyrillic
  "А": "A", "В": "B", "Е": "E", "К": "K", "М": "M", "Н": "H", "О": "O", "Р": "P", "С": "C", "Т": "T", "Х": "X", "І": "I", "Ј": "J", "Ѕ": "S", "Ԁ": "D", "Ԛ": "Q", "Ԝ": "W",
  "а": "a", "е": "e", "о": "o", "р": "p", "с": "c", "у": "y", "х": "x", "і": "i", "ј": "j", "ѕ": "s", "ԁ": "d", "ӏ": "l", "һ": "h", "ԛ": "q", "ԝ": "w", "м": "m", "т": "t", "к": "k", "в": "b", "н": "h",
  // Greek
  "Α": "A", "Β": "B", "Ε": "E", "Ζ": "Z", "Η": "H", "Ι": "I", "Κ": "K", "Μ": "M", "Ν": "N", "Ο": "O", "Ρ": "P", "Τ": "T", "Υ": "Y", "Χ": "X", "Ϝ": "F",
  "ο": "o", "ι": "i", "κ": "k", "ν": "v", "ρ": "p", "τ": "t", "υ": "u", "χ": "x",
};

/**
 * NFKC per character (fullwidth ｛｝ → {}, ﬁ → fi, no-break space → space), then the look-alike
 * fold above. Per character so every output character keeps its source offset.
 */
export const foldCompatibility = (input: MappedText): MappedText =>
  mapReplace(input, /[^\x00-\x7F]/gu, (m) => {
    const folded = m[0].normalize("NFKC");
    return [...folded].map((c) => CONFUSABLES[c] ?? c).join("");
  });

export const normalize = (input: MappedText): MappedText => collapseWhitespace(foldCompatibility(decode(input)));

/**
 * Every marker match in already-extracted text, with source ranges; `source` is the original file
 * text. Overlapping matches (`TODO:` inside `{{TODO: x}}`) are all kept, so each can be judged on its
 * own; report with `dedupeOverlaps`.
 */
export function findMarkerMatches(input: MappedText, source: string, file: string): MarkerMatch[] {
  const { text, offsets } = normalize(input);
  const lineAt = lineIndex(source);
  const matches: MarkerMatch[] = [];
  for (const { label, pattern } of MARKERS) {
    for (const match of text.matchAll(pattern)) {
      const offset = offsets[match.index] ?? 0;
      const end = (offsets[match.index + match[0].length - 1] ?? offset) + 1;
      matches.push({ file, line: lineAt(offset), text: match[0].trim(), offset, end, label });
    }
  }
  return matches.sort((a, b) => a.offset - b.offset || b.end - a.end);
}

/** One entry per group of overlapping matches (the outermost one), for reports. */
export function dedupeOverlaps<T extends { offset: number; end: number }>(matches: readonly T[]): T[] {
  const kept: T[] = [];
  for (const match of [...matches].sort((a, b) => a.offset - b.offset || b.end - a.end)) {
    const previous = kept.at(-1);
    if (previous && match.offset < previous.end) continue;
    kept.push(match);
  }
  return kept;
}

/** Finds markers in already-extracted text; `source` is the original file text, for line numbers. */
export function findMarkers(input: MappedText, source: string, file: string): PlaceholderHit[] {
  return dedupeOverlaps(findMarkerMatches(input, source, file)).map(({ file: f, line, text }) => ({ file: f, line, text }));
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
