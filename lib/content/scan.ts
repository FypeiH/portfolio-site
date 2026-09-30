import matter from "gray-matter";
import { PROJECTS_DIR } from "./conventions";
import { findMarkers, mapped, type PlaceholderHit } from "./placeholders";

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

/** What never renders: code comments, YAML comments, MDX `{/* *\/}` comments, Mermaid `%%` lines. */
export function renderableText(file: string, source: string): string {
  if (/\.(ts|tsx|js|mjs|cjs)$/.test(file)) return blank(source, codeCommentRanges(source));
  if (file.endsWith(".mmd")) return blank(source, Array.from(source.matchAll(/^\s*%%.*$/gm), (m) => [m.index, m.index + m[0].length]));
  if (file.endsWith(".mdx") || file.endsWith(".md")) {
    const frontmatter = /^---\n[\s\S]*?\n---/.exec(source);
    const fmEnd = frontmatter ? frontmatter[0].length : 0;
    const mdxComments = Array.from(source.slice(fmEnd).matchAll(/\{\/\*[\s\S]*?\*\/\}|<!--[\s\S]*?-->/g), (m): [number, number] => [
      fmEnd + m.index,
      fmEnd + m.index + m[0].length,
    ]);
    return blank(source, [...yamlCommentRanges(source, fmEnd), ...mdxComments]);
  }
  return source;
}

export function scanContentFile(file: string, source: string): PlaceholderHit[] {
  return findMarkers(mapped(renderableText(file, source)), source, file);
}

export function findShippedPlaceholders(tree: ContentTree, known?: readonly ProjectEntry[]): PlaceholderHit[] {
  return shippedContentFiles(tree, known).flatMap((file) => scanContentFile(file, tree.read(file) ?? ""));
}
