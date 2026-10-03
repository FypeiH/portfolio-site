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

/** One rule: finds its matches (index in the normalised text, and the matched text). */
export interface Marker {
  label: string;
  find(text: string): Iterable<{ index: number; text: string }>;
}

const regexMarker = (label: string, pattern: RegExp): Marker => ({
  label,
  find: (text) => Array.from(text.matchAll(pattern), (m) => ({ index: m.index, text: m[0] })),
});

/** Characters of context reported after a `{{` that is never closed. */
const UNCLOSED_CONTEXT = 40;

/**
 * Any literal `{{…}}` (spec §8.1): any case, any spacing (`{ {`), any length, inner braces allowed
 * (`{{PROBLEM {x} HERE}}`), ending at the first `}}` like a lazy regex. A `{{` that is never closed is
 * reported too. Linear on any input (Sonar nit: the lazy regex was quadratic on a run of unclosed `{{`):
 * each search for `}}` starts where the previous match ended, and once it fails no later `{{` can be
 * closed either, so it is never repeated.
 */
export function findBraces(text: string): { index: number; text: string }[] {
  const open = /\{\s?\{/g;
  const close = /\}\s?\}/g;
  const found: { index: number; text: string }[] = [];
  let closable = true;
  for (let o = open.exec(text); o; o = open.exec(text)) {
    const start = o.index;
    const afterOpen = start + o[0].length;
    let c: RegExpExecArray | null = null;
    if (closable) {
      close.lastIndex = afterOpen;
      c = close.exec(text);
      closable = c !== null;
    }
    if (c) {
      const end = c.index + c[0].length;
      found.push({ index: start, text: text.slice(start, end) });
      open.lastIndex = end;
    } else {
      found.push({ index: start, text: text.slice(start, afterOpen + UNCLOSED_CONTEXT) });
      open.lastIndex = afterOpen;
    }
  }
  return found;
}

/**
 * Bidirectional embedding/override/isolate controls (U+202A–202E, U+2066–2069, plus the LRM/RLM/ALM
 * marks): an RLO can make reversed text display as "TODO". Never needed in this site's content, so any
 * of them fails outright (Sonar m4).
 */
const BIDI_CONTROLS = /[\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/g;

/** Characters of text shown after a bidi control in reports. */
const BIDI_CONTEXT = 20;

/**
 * Every rule is word-bounded so real words ("tbdx", "todos", "lorems") don't match.
 * Case rules (shared with the rendered-output check, output-scan.ts): bare `TODO` is uppercase only,
 * so "a Todo app" passes; `todo:` and `[todo…]` match in any case; TBD, FIXME and lorem ipsum in any case.
 */
export const MARKERS: readonly Marker[] = [
  { label: "{{…}}", find: findBraces },
  regexMarker("bidi control", BIDI_CONTROLS),
  regexMarker("[TODO…]", /\[\s?todo\b[^\]]{0,300}\]/gi),
  regexMarker("TODO:", /\btodo\s?:/gi),
  regexMarker("TODO", /\bTODO\b/g),
  regexMarker("TBD", /\btbd\b/gi),
  regexMarker("FIXME", /\bfixme\b/gi),
  regexMarker("Lorem ipsum", /\blorem\s?ipsum\b/gi),
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
 * Markers that are always placeholders, whatever the context: `[TODO…]`, `TODO:`, every literal
 * `{{…}}` (spec §8.1: inside code too, e.g. an Angular `{{ user.name }}` must be written another way)
 * and bidi controls. `placeholder-ok` can't exempt them (scan.ts).
 */
export const isPlaceholderMarker = (match: Pick<MarkerMatch, "label" | "text">) =>
  match.label === "[TODO…]" || match.label === "TODO:" || match.label === "{{…}}" || match.label === "bidi control";

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
    // A match kept as is keeps its own offsets (e.g. markup left alone inside code).
    if (replacement === match[0]) copy(start, start + replacement.length);
    else for (let i = 0; i < replacement.length; i++) offsets.push(input.offsets[start] ?? 0);
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

const COMBINING_MARK = /^\p{M}$/u;

/**
 * NFKC per character (fullwidth ｛｝ → {}, ﬁ → fi, no-break space → space), then combining marks are
 * dropped (T\u0336ODO draws as a struck-through TODO, Sonar m4) and look-alikes folded as above. Per
 * character so every output character keeps its source offset. Matching view only: nothing rendered
 * is rewritten.
 */
export const foldCompatibility = (input: MappedText): MappedText =>
  mapReplace(input, /[^\x00-\x7F]/gu, (m) => {
    const folded = m[0].normalize("NFKC");
    return [...folded]
      .filter((c) => !COMBINING_MARK.test(c))
      .map((c) => CONFUSABLES[c] ?? c)
      .join("");
  });

export const normalize = (input: MappedText): MappedText => collapseWhitespace(foldCompatibility(decode(input)));

/** "U+202E (bidi control) before "ODOT fill me"": the code point plus the text it reorders. */
function describeBidi(text: string, index: number): string {
  const code = `U+${text.codePointAt(index)?.toString(16).toUpperCase().padStart(4, "0")}`;
  const after = text.slice(index + 1, index + 1 + BIDI_CONTEXT).replace(BIDI_CONTROLS, "").trim();
  return after ? `${code} (bidi control) before "${after}"` : `${code} (bidi control)`;
}

/**
 * Every marker match in already-extracted text, with source ranges; `source` is the original file
 * text. Overlapping matches (`TODO:` inside `{{TODO: x}}`) are all kept, so each can be judged on its
 * own; report with `dedupeOverlaps`.
 */
export function findMarkerMatches(input: MappedText, source: string, file: string): MarkerMatch[] {
  const { text, offsets } = normalize(input);
  const lineAt = lineIndex(source);
  const matches: MarkerMatch[] = [];
  for (const { label, find } of MARKERS) {
    for (const match of find(text)) {
      const offset = offsets[match.index] ?? 0;
      const end = (offsets[match.index + match.text.length - 1] ?? offset) + 1;
      const shown = label === "bidi control" ? describeBidi(text, match.index) : match.text.trim();
      matches.push({ file, line: lineAt(offset), text: shown, offset, end, label });
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
