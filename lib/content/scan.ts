import matter from "gray-matter";
import { PROJECTS_DIR } from "./conventions";
import { findMarkerMatches, isPlaceholderStyle, mapped, mapReplace, type MappedText, type PlaceholderHit } from "./placeholders";

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

const lineOf = (source: string, offset: number) => source.slice(0, offset).split("\n").length;

/**
 * Lines exempted by a `placeholder-ok` comment: the comment's own line when it shares the line with
 * content; otherwise the block that follows it, up to the next blank line (a fenced code block is
 * taken whole, blank lines included).
 */
export function optOutLines(file: string, source: string): Set<number> {
  const lines = source.split("\n");
  const exempt = new Set<number>();
  for (const [start, end] of commentRanges(file, source)) {
    if (!source.slice(start, end).includes(OPT_OUT)) continue;
    const line = lineOf(source, start);
    const rest = (lines[line - 1] ?? "").replace(source.slice(start, end).split("\n")[0] ?? "", "").trim();
    if (rest.length > 0) {
      exempt.add(line);
      continue;
    }
    let next = lineOf(source, end) + 1;
    const fence = /^\s*(```|~~~)/.exec(lines[next - 1] ?? "")?.[1];
    if (fence) {
      do exempt.add(next++);
      while (next <= lines.length && !(lines[next - 1] ?? "").trim().startsWith(fence));
      exempt.add(next);
      continue;
    }
    while (next <= lines.length && (lines[next - 1] ?? "").trim() !== "") exempt.add(next++);
  }
  return exempt;
}

/** Fenced code blocks and inline code spans of an MDX/MD body (a span never crosses a blank line). */
export function codeRanges(file: string, source: string): [number, number][] {
  if (!file.endsWith(".mdx") && !file.endsWith(".md")) return [];
  const fmEnd = frontmatterEnd(source);
  const body = source.slice(fmEnd);
  const ranges: [number, number][] = [];
  const fences = Array.from(body.matchAll(/^[ \t]*(```|~~~)[^\n]*\n[\s\S]*?^[ \t]*\1[ \t]*$/gm), (m): [number, number] => [m.index, m.index + m[0].length]);
  ranges.push(...fences);
  const outside = blank(body, fences);
  for (const m of outside.matchAll(/(`+)((?:(?!\n[ \t]*\n)[\s\S])+?)\1/g)) ranges.push([m.index, m.index + m[0].length]);
  return ranges.map(([a, b]): [number, number] => [fmEnd + a, fmEnd + b]);
}

/**
 * MDX string expressions render as their text: `{"{"}{"{"}x{"}"}{"}"}` reads `{{x}}`. Unwrapping
 * them (offsets kept) lets the source scan see what the page will show.
 */
function unwrapJsxStrings(file: string, text: string): MappedText {
  const input = mapped(text);
  if (!file.endsWith(".mdx")) return input;
  return mapReplace(input, /\{\s*(?:"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)')\s*\}/g, (m) => m[1] ?? m[2] ?? "");
}

export interface FileScan {
  /** Markers that block a strict build. */
  hits: PlaceholderHit[];
  /** Marker texts exempted by the code rule or an opt-out; the rendered-output check allows exactly these. */
  allowed: string[];
}

/**
 * Scans one content file. A marker is exempt when (a) its line is opted out with `placeholder-ok`, or
 * (b) it is a `{{ … }}` inside inline/fenced code that is not placeholder-style (e.g. an Angular
 * `{{ user.name }}`; `{{TODO: …}}` and `{{PROJECT_NAME}}` still count).
 */
export function scanContentFileDetailed(file: string, source: string): FileScan {
  const exemptLines = optOutLines(file, source);
  const code = codeRanges(file, source);
  const inCode = (offset: number) => code.some(([a, b]) => offset >= a && offset < b);
  const hits: PlaceholderHit[] = [];
  const allowed: string[] = [];
  for (const match of findMarkerMatches(unwrapJsxStrings(file, renderableText(file, source)), source, file)) {
    const exempt = exemptLines.has(match.line) || (match.label === "{{…}}" && inCode(match.offset) && !isPlaceholderStyle(match.text));
    if (exempt) allowed.push(match.text);
    else hits.push({ file: match.file, line: match.line, text: match.text });
  }
  return { hits, allowed };
}

export function scanContentFile(file: string, source: string): PlaceholderHit[] {
  return scanContentFileDetailed(file, source).hits;
}

/** Exempted marker texts across shipped content, for the rendered-output check. */
export function allowedShippedMarkers(tree: ContentTree, known?: readonly ProjectEntry[]): Set<string> {
  return new Set(shippedContentFiles(tree, known).flatMap((file) => scanContentFileDetailed(file, tree.read(file) ?? "").allowed));
}

export function findShippedPlaceholders(tree: ContentTree, known?: readonly ProjectEntry[]): PlaceholderHit[] {
  return shippedContentFiles(tree, known).flatMap((file) => scanContentFile(file, tree.read(file) ?? ""));
}
