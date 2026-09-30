import matter from "gray-matter";
import { PROJECTS_DIR } from "./conventions";
import {
  dedupeOverlaps,
  findMarkerMatches,
  isPlaceholderMarker,
  lineIndex,
  mapped,
  mapReplace,
  type MappedText,
  type MarkerMatch,
  type PlaceholderHit,
} from "./placeholders";

/**
 * The placeholder guard's file set and per-file extraction, shared by the build (rules.ts) and
 * `pnpm content:check`, so both always scan the same thing (PM rule, QA FIL-8):
 * every file under content/, minus `_`-prefixed files/folders, draft projects and diagrams used only by drafts.
 */

export interface ContentTree {
  /** Repo-relative paths of every file under `dir`, recursively. */
  list(dir: string): string[];
  read(path: string): string | undefined;
}

export const CONTENT_ROOT = "content";

const isUnderscored = (file: string) => file.split("/").some((segment) => segment.startsWith("_"));

export interface ProjectEntry {
  file: string;
  published: boolean;
  diagram?: string;
}

function readProjectEntry(file: string, source: string): ProjectEntry {
  const { data } = matter(source);
  const diagram = data.diagram?.kind === "mermaid" && typeof data.diagram.source === "string" ? data.diagram.source : undefined;
  return { file, published: data.status === "published", diagram };
}

/**
 * Files whose text can reach visitors: the guard scans exactly these. The build passes the statuses
 * it already validated; `pnpm content:check` lets them be read from each file's frontmatter.
 */
export function shippedContentFiles(tree: ContentTree, known?: readonly ProjectEntry[]): string[] {
  const files = tree.list(CONTENT_ROOT).filter((file) => !isUnderscored(file)).sort();
  const byFile = new Map(known?.map((entry) => [entry.file, entry]));
  const projects = files
    .filter((file) => file.startsWith(`${PROJECTS_DIR}/`) && file.endsWith(".mdx"))
    .map((file) => byFile.get(file) ?? readProjectEntry(file, tree.read(file) ?? ""));
  const drafts = new Set(projects.filter((p) => !p.published).map((p) => p.file));
  const publishedDiagrams = new Set(projects.flatMap((p) => (p.published && p.diagram ? [p.diagram] : [])));
  const draftOnlyDiagrams = new Set(projects.flatMap((p) => (!p.published && p.diagram && !publishedDiagrams.has(p.diagram) ? [p.diagram] : [])));
  return files.filter((file) => !drafts.has(file) && !draftOnlyDiagrams.has(file));
}

/** Same length as the input, with the given ranges replaced by spaces: offsets stay valid. */
function blank(source: string, ranges: readonly [number, number][]): string {
  const chars = source.split("");
  for (const [start, end] of ranges) for (let i = start; i < end; i++) if (chars[i] !== "\n") chars[i] = " ";
  return chars.join("");
}

/** `//` and `/* *\/` comments of a TS/JS file, skipping strings and template literals. */
export function codeCommentRanges(source: string): [number, number][] {
  const ranges: [number, number][] = [];
  let quote: string | null = null;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (quote) {
      if (ch === "\\") i++;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") quote = ch;
    else if (ch === "/" && source[i + 1] === "/") {
      const end = source.indexOf("\n", i);
      ranges.push([i, end === -1 ? source.length : end]);
      i = end === -1 ? source.length : end;
    } else if (ch === "/" && source[i + 1] === "*") {
      const end = source.indexOf("*/", i + 2);
      ranges.push([i, end === -1 ? source.length : end + 2]);
      i = end === -1 ? source.length : end + 1;
    }
  }
  return ranges;
}

/** YAML `#` comments (at line start or after whitespace, outside quotes) in the frontmatter block. */
function yamlCommentRanges(source: string, end: number): [number, number][] {
  const ranges: [number, number][] = [];
  let lineStart = 0;
  while (lineStart < end) {
    const lineEnd = Math.min(source.indexOf("\n", lineStart) === -1 ? source.length : source.indexOf("\n", lineStart), end);
    let quote: string | null = null;
    for (let i = lineStart; i < lineEnd; i++) {
      const ch = source[i];
      if (quote) {
        if (ch === "\\" && quote === '"') i++;
        else if (ch === quote) quote = null;
      } else if (ch === '"' || ch === "'") quote = ch;
      else if (ch === "#" && (i === lineStart || /\s/.test(source[i - 1] ?? ""))) {
        ranges.push([i, lineEnd]);
        break;
      }
    }
    lineStart = lineEnd + 1;
  }
  return ranges;
}

/** Ranges of everything that never renders: code comments, YAML comments, MDX comments, Mermaid `%%` lines. */
function commentRanges(file: string, source: string): [number, number][] {
  if (/\.(ts|tsx|js|mjs|cjs)$/.test(file)) return codeCommentRanges(source);
  if (file.endsWith(".mmd")) return Array.from(source.matchAll(/^\s*%%.*$/gm), (m): [number, number] => [m.index, m.index + m[0].length]);
  if (file.endsWith(".mdx") || file.endsWith(".md")) {
    const fmEnd = frontmatterEnd(source);
    const mdxComments = Array.from(source.slice(fmEnd).matchAll(/\{\/\*[\s\S]*?\*\/\}|<!--[\s\S]*?-->/g), (m): [number, number] => [
      fmEnd + m.index,
      fmEnd + m.index + m[0].length,
    ]);
    return [...yamlCommentRanges(source, fmEnd), ...mdxComments];
  }
  return [];
}

const frontmatterEnd = (source: string) => /^---\n[\s\S]*?\n---/.exec(source)?.[0].length ?? 0;

/** What never renders is blanked (same length, so offsets and lines stay valid). */
export function renderableText(file: string, source: string): string {
  return blank(source, commentRanges(file, source));
}

/** The opt-out marker, written inside any comment the file type supports (see README "Content"). */
export const OPT_OUT = "placeholder-ok";

const indentOf = (line: string) => line.length - line.trimStart().length;
const isMdx = (file: string) => file.endsWith(".mdx") || file.endsWith(".md");

/**
 * Lines a standalone `placeholder-ok` comment covers when it sits in YAML frontmatter, TS or Mermaid:
 * the next key only (its first non-blank line plus the lines indented deeper, i.e. its continuation).
 */
function nextKeyLines(lines: readonly string[], after: number, isComment: (line: number) => boolean): number[] {
  let first = after + 1;
  while (first <= lines.length && ((lines[first - 1] ?? "").trim() === "" || isComment(first))) first++;
  if (first > lines.length) return [];
  const indent = indentOf(lines[first - 1] ?? "");
  const covered = [first];
  for (let next = first + 1; next <= lines.length; next++) {
    const line = lines[next - 1] ?? "";
    if (line.trim() !== "" && indentOf(line) <= indent) break;
    covered.push(next);
  }
  return covered;
}

/** MDX body scope: the paragraph below, up to the next blank line, or a whole fenced code block. */
function nextBlockLines(lines: readonly string[], after: number): number[] {
  let next = after + 1;
  const covered: number[] = [];
  const fence = /^\s*(```|~~~)/.exec(lines[next - 1] ?? "")?.[1];
  if (fence) {
    do covered.push(next++);
    while (next <= lines.length && !(lines[next - 1] ?? "").trim().startsWith(fence));
    covered.push(next);
    return covered;
  }
  while (next <= lines.length && (lines[next - 1] ?? "").trim() !== "") covered.push(next++);
  return covered;
}

/**
 * Lines exempted by `placeholder-ok`, with the line of the comment that exempts them. A comment that
 * shares its line with content covers that line. A standalone one covers the next key in YAML
 * frontmatter, TS and Mermaid, and the next paragraph or fenced block in an MDX body.
 */
export function optOutLines(file: string, source: string): Map<number, number> {
  const lines = source.split("\n");
  const lineAt = lineIndex(source);
  const comments = commentRanges(file, source);
  const commentLines = new Set(comments.flatMap(([a, b]) => {
    const [first, last] = [lineAt(a), lineAt(Math.max(a, b - 1))];
    return Array.from({ length: last - first + 1 }, (_, i) => first + i);
  }));
  const isCommentOnly = (line: number) => commentLines.has(line) && /^\s*(#|\/\/|\/\*|\{\/\*|<!--|%%)/.test(lines[line - 1] ?? "");
  const bodyStart = isMdx(file) ? frontmatterEnd(source) : 0;
  const exempt = new Map<number, number>();
  for (const [start, end] of comments) {
    const comment = source.slice(start, end);
    if (!comment.includes(OPT_OUT)) continue;
    const line = lineAt(start);
    const rest = (lines[line - 1] ?? "").replace(comment.split("\n")[0] ?? "", "").trim();
    const covered = rest.length > 0 ? [line] : isMdx(file) && start >= bodyStart ? nextBlockLines(lines, lineAt(end - 1)) : nextKeyLines(lines, lineAt(end - 1), isCommentOnly);
    for (const covers of covered) if (!exempt.has(covers)) exempt.set(covers, line);
  }
  return exempt;
}

/**
 * Inline code spans and fenced code blocks of an MDX/MD body, found by a left-to-right scan so that
 * a backtick escaped with `\` or sitting inside a `{…}` JSX expression never opens a code span.
 */
export function codeRanges(file: string, source: string): [number, number][] {
  if (!isMdx(file)) return [];
  const bodyStart = frontmatterEnd(source);
  const ranges: [number, number][] = [];
  const fence = /^[ \t]*(```|~~~)[^\n]*\n[\s\S]*?^[ \t]*\1[ \t]*$/gm;
  let i = bodyStart;
  while (i < source.length) {
    const ch = source[i];
    const atLineStart = i === bodyStart || source[i - 1] === "\n";
    if (atLineStart) {
      fence.lastIndex = i;
      const block = fence.exec(source);
      if (block && block.index === i) {
        ranges.push([i, i + block[0].length]);
        i += block[0].length;
        continue;
      }
    }
    if (ch === "\\") {
      i += 2;
      continue;
    }
    if (ch === "{") {
      i = skipExpression(source, i);
      continue;
    }
    if (ch === "`") {
      const run = /^`+/.exec(source.slice(i))?.[0] ?? "`";
      const close = findClosingRun(source, i + run.length, run);
      if (close !== -1) {
        ranges.push([i, close + run.length]);
        i = close + run.length;
        continue;
      }
      i += run.length;
      continue;
    }
    i++;
  }
  return ranges;
}

/** Start of the backtick run closing a code span opened by `run`, or -1 (a span never crosses a blank line). */
function findClosingRun(source: string, from: number, run: string): number {
  for (let i = from; i < source.length; i++) {
    if (source[i] === "\n" && /^\n[ \t]*\n/.test(source.slice(i, i + 64))) return -1;
    if (source.startsWith(run, i) && source[i + run.length] !== "`" && source[i - 1] !== "`") return i;
  }
  return -1;
}

/** Index just past the `}` closing the JSX expression opened at `open` (strings and templates skipped). */
function skipExpression(source: string, open: number): number {
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    const ch = source[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      for (i++; i < source.length && source[i] !== ch; i++) if (source[i] === "\\") i++;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) return i + 1;
  }
  return source.length;
}

/**
 * MDX string expressions render as their text: `{"{"}{"{"}x{"}"}{"}"}` reads `{{x}}`. Unwrapping
 * them (offsets kept) lets the source scan see what the page will show. Code spans are literal.
 */
function unwrapJsxStrings(file: string, text: string, code: readonly [number, number][]): MappedText {
  const input = mapped(text);
  if (!file.endsWith(".mdx")) return input;
  const inCode = (offset: number) => code.some(([a, b]) => offset >= a && offset < b);
  return mapReplace(input, /\{\s*(?:"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)')\s*\}/g, (m) => (inCode(m.index) ? m[0] : (m[1] ?? m[2] ?? "")));
}

/** Which routes can render a file's text: a case-study body only its own page; anything else, every page. */
export type Scope = "site" | `projects/${string}`;

export function scopeOf(file: string, offset: number, source: string): Scope {
  const slug = new RegExp(`^${PROJECTS_DIR}/([^/]+)\\.mdx$`).exec(file)?.[1];
  return slug && offset >= frontmatterEnd(source) ? `projects/${slug}` : "site";
}

/** An exempted marker: the rendered-output check allows this exact text, in this scope, only where stated. */
export interface AllowedMarker {
  text: string;
  scope: Scope;
  /** "code": only inside rendered <code>; "anywhere": opted out with placeholder-ok. */
  where: "code" | "anywhere";
}

export interface Exemption extends PlaceholderHit {
  reason: string;
}

export interface FileScan {
  /** Markers that block a strict build (one per group of overlapping matches). */
  hits: PlaceholderHit[];
  /** What the rendered-output check may allow. */
  allowed: AllowedMarker[];
  /** Every exemption with its reason, listed by `pnpm content:check`. */
  exemptions: Exemption[];
}

/**
 * Scans one content file. Placeholder markers (`[TODO…]`, `TODO:`, placeholder-style `{{…}}`) always
 * count. Any other marker is exempt when (a) it is a `{{ … }}` inside inline/fenced code (e.g. an
 * Angular `{{ user.name }}`), or (b) its line is covered by a `placeholder-ok` comment.
 */
export function scanContentFileDetailed(file: string, source: string): FileScan {
  const exemptLines = optOutLines(file, source);
  const code = codeRanges(file, source);
  const inCode = (offset: number) => code.some(([a, b]) => offset >= a && offset < b);
  const blocking: MarkerMatch[] = [];
  const allowed: AllowedMarker[] = [];
  const exemptions: Exemption[] = [];
  for (const match of findMarkerMatches(unwrapJsxStrings(file, renderableText(file, source), code), source, file)) {
    const optOut = exemptLines.get(match.line);
    const reason = isPlaceholderMarker(match)
      ? undefined
      : match.label === "{{…}}" && inCode(match.offset)
        ? "{{ … }} inside code"
        : optOut !== undefined
          ? `placeholder-ok on line ${optOut}`
          : undefined;
    if (!reason) {
      blocking.push(match);
      continue;
    }
    allowed.push({ text: match.text, scope: scopeOf(file, match.offset, source), where: reason.startsWith("{{") ? "code" : "anywhere" });
    exemptions.push({ file, line: match.line, text: match.text, reason });
  }
  return { hits: dedupeOverlaps(blocking).map(({ line, text }) => ({ file, line, text })), allowed, exemptions };
}

export function scanContentFile(file: string, source: string): PlaceholderHit[] {
  return scanContentFileDetailed(file, source).hits;
}

/** Exempted markers across shipped content, for the rendered-output check. */
export function allowedShippedMarkers(tree: ContentTree, known?: readonly ProjectEntry[]): AllowedMarker[] {
  return shippedContentFiles(tree, known).flatMap((file) => scanContentFileDetailed(file, tree.read(file) ?? "").allowed);
}

export function findShippedPlaceholders(tree: ContentTree, known?: readonly ProjectEntry[]): PlaceholderHit[] {
  return shippedContentFiles(tree, known).flatMap((file) => scanContentFile(file, tree.read(file) ?? ""));
}
