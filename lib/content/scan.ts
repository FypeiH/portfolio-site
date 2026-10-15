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

/**
 * Braces that are syntax, not text (QA r3 FP3/FP4), as [start, end) ranges of single characters:
 * - Mermaid's hexagon shape `id{{label}}` in a `.mmd` source (the label is still scanned, and the
 *   rendered SVG has no braces);
 * - the outer braces of a JSX expression prop inside a tag in MDX (`<span style={{ fontWeight: 700 }}>`
 *   renders `style="font-weight:700"`; the expression itself is still scanned).
 * Any `{{` that reaches the rendered output (HTML, RSC, SVG, OG text) still fails the output check.
 */
function syntaxBraceRanges(file: string, source: string, comments: readonly [number, number][]): [number, number][] {
  const inComment = (offset: number) => comments.some(([a, b]) => offset >= a && offset < b);
  const ranges: [number, number][] = [];
  if (file.endsWith(".mmd")) {
    for (const m of source.matchAll(/[A-Za-z0-9_-]\{\{[^\n]*?\}\}/g)) {
      const open = m.index + 1;
      const close = m.index + m[0].length - 2;
      ranges.push([open, open + 2], [close, close + 2]);
    }
    return ranges;
  }
  if (!file.endsWith(".mdx")) return ranges;
  const code = codeRanges(file, source);
  const inCode = (offset: number) => code.some(([a, b]) => offset >= a && offset < b);
  const bodyStart = frontmatterEnd(source);
  for (const m of source.matchAll(/\s[A-Za-z_:][\w:.-]*\s*=\s*\{/g)) {
    const open = m.index + m[0].length - 1;
    if (open < bodyStart || inCode(open) || inComment(open)) continue;
    // Inside a tag: the last `<` before the prop is after the last `>`.
    if (source.lastIndexOf("<", open) <= source.lastIndexOf(">", open)) continue;
    const end = skipExpression(source, open);
    if (source[end - 1] !== "}") continue;
    ranges.push([open, open + 1], [end - 1, end]);
  }
  return ranges;
}

/** What never renders is blanked (same length, so offsets and lines stay valid), and so are syntax braces. */
export function renderableText(file: string, source: string): string {
  const comments = commentRanges(file, source);
  return blank(source, [...comments, ...syntaxBraceRanges(file, source, comments)]);
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

/**
 * What an MDX body reads like once inline markup is gone: emphasis delimiters (`*`, `_`, `~`) and
 * inline JSX/HTML tags are dropped outside code, so `{"{"}*{"{"}*fill me}}`, `Lo*rem* ipsum`,
 * `TO<span></span>DO` read `{{fill me}}`, `Lorem ipsum`, `TODO` (Sonar f49). Scanned in addition to
 * the plain view, never instead of it. Offsets are kept.
 */
function withoutInlineMarkup(file: string, input: MappedText, code: readonly [number, number][]): MappedText | undefined {
  if (!file.endsWith(".mdx")) return undefined;
  const inCode = (offset: number) => code.some(([a, b]) => offset >= a && offset < b);
  return mapReplace(input, /<\/?[A-Za-z][\w.-]*(?:\s[^<>]*)?\/?>|[*_~]+/g, (m) => (inCode(input.offsets[m.index] ?? 0) ? m[0] : ""));
}

/**
 * Hard cap on `withoutInlineElements` passes (one nesting level each). Real content nests a few levels;
 * reaching the cap means hostile or broken input, so the scan fails instead of letting it through.
 */
export const ELEMENT_PASS_LIMIT = 200;

/** Names of the second and third views in reports (their text isn't in the file as such). */
export const MARKUP_VIEW = "read without inline markup";
export const ELEMENTS_VIEW = "read without inline elements";

/**
 * Third view of an MDX body: inline JSX/HTML elements removed together with their content, outside
 * code, innermost first until nothing changes. An element can be hidden from readers by CSS
 * (`<span hidden>x</span>`, `style={…}`, a class), so `{<span hidden>x</span>{ fill me }}` renders as
 * `{{ fill me }}` while the other views read `{x{ fill me }}` (Sonar f49var G3). Each element becomes
 * one space, so surrounding words aren't glued together (`TO<span>x</span>DO` reads `TO DO`, not
 * `TODO`), and only the `{{…}}` rule runs on this view (the `{ {` spacing still matches).
 */
function withoutInlineElements(file: string, input: MappedText, code: readonly [number, number][]): MappedText | undefined {
  if (!file.endsWith(".mdx")) return undefined;
  const inCode = (offset: number) => code.some(([a, b]) => offset >= a && offset < b);
  const element = /<([A-Za-z][\w.-]*)(?:\s[^<>]*)?(?:\/>|>[^<]*<\/\1\s*>)/g;
  let current = input;
  for (let pass = 0; ; pass++) {
    if (pass >= ELEMENT_PASS_LIMIT) {
      throw new Error(`${file}: inline elements nested more than ${ELEMENT_PASS_LIMIT} levels deep; the placeholder scan can't check this file.`);
    }
    const next = mapReplace(current, element, (m) => (inCode(current.offsets[m.index] ?? 0) ? m[0] : " "));
    if (next.text === current.text) return current;
    current = next;
  }
}

const BRACES_ONLY: ReadonlySet<string> = new Set(["{{…}}"]);

/** Matches of every view, one per (offset, rule). */
function scanViews(file: string, source: string, code: readonly [number, number][]): MarkerMatch[] {
  const plain = unwrapJsxStrings(file, renderableText(file, source), code);
  const matches = findMarkerMatches(plain, source, file);
  const seen = new Set(matches.map((m) => `${m.offset}:${m.label}`));
  const add = (found: MarkerMatch[], view?: string) => {
    for (const match of found) {
      const key = `${match.offset}:${match.label}`;
      if (seen.has(key)) continue;
      seen.add(key);
      // The text of this view isn't in the file as such: say how it was read.
      matches.push(view ? { ...match, text: `${match.text} (${view})` } : match);
    }
  };
  const markupFree = withoutInlineMarkup(file, plain, code);
  if (markupFree) add(findMarkerMatches(markupFree, source, file), MARKUP_VIEW);
  const elementFree = withoutInlineElements(file, plain, code);
  if (elementFree) add(findMarkerMatches(elementFree, source, file, BRACES_ONLY), ELEMENTS_VIEW);
  return matches.sort((x, y) => x.offset - y.offset || y.end - x.end);
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
 * Scans one content file. Placeholder markers (`[TODO…]`, `TODO:`, any literal `{{…}}`, code
 * included) always count (spec §8.1). Any other marker is exempt only when its line is covered by a
 * `placeholder-ok` comment.
 */
export function scanContentFileDetailed(file: string, source: string): FileScan {
  const exemptLines = optOutLines(file, source);
  const code = codeRanges(file, source);
  const blocking: MarkerMatch[] = [];
  const allowed: AllowedMarker[] = [];
  const exemptions: Exemption[] = [];
  for (const match of scanViews(file, source, code)) {
    const optOut = exemptLines.get(match.line);
    const reason = !isPlaceholderMarker(match) && optOut !== undefined ? `placeholder-ok on line ${optOut}` : undefined;
    if (!reason) {
      blocking.push(match);
      continue;
    }
    allowed.push({ text: match.text, scope: scopeOf(file, match.offset, source), where: "anywhere" });
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
