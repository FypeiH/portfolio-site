import { dedupeOverlaps, findMarkerMatches, isPlaceholderMarker, mapped, mapReplace, type MappedText } from "./placeholders";
import type { AllowedMarker, Scope } from "./scan";

/**
 * Render-level guard (QA FIL-8): what the build actually emitted, so a placeholder assembled in a
 * JSX expression or produced by a component is caught even when no source file contains it.
 * Same markers and case rules as the source scan (placeholders.ts MARKERS), and every match is
 * judged on its own, as in the source scan, so the two agree.
 */

export interface OutputHit {
  file: string;
  /** The matched marker, normalised like the source scan's. */
  marker: string;
  text: string;
}

/** A piece of rendered text: where it came from (for dedupe) and whether it renders inside <code>. */
interface TextRun {
  id: string;
  text: MappedText;
  inCode: (offset: number) => boolean;
}

/** `.next/server/app/projects/<slug>…` → "projects/<slug>"; every other route → "site". */
export function routeScope(file: string): Scope {
  const slug = /(?:^|\/)app\/projects\/([^/.]+)/.exec(file.replaceAll("\\", "/"))?.[1];
  return slug ? `projects/${slug}` : "site";
}

const FLIGHT_SCRIPT = /<script>self\.__next_f\.push\((\[[\s\S]*?\])\)<\/script>/g;
const CODE_ELEMENT = /<code\b[^>]*>[\s\S]*?<\/code>/g;

/**
 * The HTML document without its inline RSC payload (scanned separately, as RSC) and without the empty
 * `<!-- -->` React puts between adjacent strings, so `{<!-- -->{` reads `{{`. Offsets point into `html`.
 */
function htmlRuns(html: string): TextRun[] {
  const code = Array.from(html.matchAll(CODE_ELEMENT), (m): [number, number] => [m.index, m.index + m[0].length]);
  const inCode = (offset: number) => code.some(([a, b]) => offset >= a && offset < b);
  const markup = mapReplace(mapReplace(mapped(html), FLIGHT_SCRIPT, () => ""), /<!--\s*-->/g, () => "");
  // Same id: both views keep offsets into `html`, so a marker found by both is reported once.
  return [
    { id: "html", text: markup, inCode },
    { id: "html", text: textOnly(markup), inCode },
  ];
}

/** Phrasing elements that render inline: their tags vanish in the text-only view (`Lo<em>rem</em>` reads "Lorem"). */
const INLINE_TAGS = new Set([
  "a", "abbr", "b", "bdi", "bdo", "cite", "data", "del", "dfn", "em", "i", "ins", "kbd", "mark", "q", "s", "samp",
  "small", "span", "strong", "sub", "sup", "time", "u", "var", "wbr",
]);

/**
 * What a reader sees: inline tags removed, every other tag (block, <br>, <code>, <img>…) a space, and
 * <script>/<style>/<template> bodies dropped. Catches markers split by markup, e.g.
 * `{<span></span>{ fill me }}` or `{<em>{</em>fill me}}`, which the markup view reads as two braces apart.
 */
export function textOnly(input: MappedText): MappedText {
  const noComments = mapReplace(input, /<!--[\s\S]*?-->/g, () => "");
  const noScripts = mapReplace(noComments, /<(script|style|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, () => " ");
  return mapReplace(noScripts, /<\/?([a-z][a-z0-9-]*)\b[^>]*>/gi, (m) => (INLINE_TAGS.has((m[1] ?? "").toLowerCase()) ? "" : " "));
}

/** The inline RSC payload of an HTML document (`self.__next_f.push([1, "…"])` chunks, in order). */
export function inlineFlight(html: string): string {
  return Array.from(html.matchAll(FLIGHT_SCRIPT), (m) => {
    try {
      const chunk = JSON.parse(m[1] ?? "[]") as unknown[];
      return typeof chunk[1] === "string" ? chunk[1] : "";
    } catch {
      return "";
    }
  }).join("");
}

/** Rows of an RSC payload: `id:JSON`, or `id:T<hex byte length>,<text>` for long strings. */
function rscRows(payload: string): { id: string; kind: "json" | "text"; body: string }[] {
  const bytes = Buffer.from(payload, "utf8");
  const rows: { id: string; kind: "json" | "text"; body: string }[] = [];
  let i = 0;
  while (i < bytes.length) {
    const colon = bytes.indexOf(0x3a, i);
    if (colon === -1) break;
    const id = bytes.subarray(i, colon).toString("utf8").trim();
    if (bytes[colon + 1] === 0x54 /* T */) {
      const comma = bytes.indexOf(0x2c, colon);
      const length = parseInt(bytes.subarray(colon + 2, comma).toString("utf8"), 16);
      rows.push({ id, kind: "text", body: bytes.subarray(comma + 1, comma + 1 + length).toString("utf8") });
      i = comma + 1 + length;
      continue;
    }
    const newline = bytes.indexOf(0x0a, colon);
    const end = newline === -1 ? bytes.length : newline;
    rows.push({ id, kind: "json", body: bytes.subarray(colon + 1, end).toString("utf8") });
    i = end + 1;
  }
  return rows;
}

const isReference = (value: string) => /^\$[A-Za-z@]*[0-9a-f]*$/.test(value) || value === "$undefined";
const NON_TEXT_PROPS = new Set(["className", "style", "href", "src", "srcSet", "id", "rel", "target", "type", "precedence", "crossOrigin"]);

/**
 * Text runs of one RSC payload. Strings are joined only when they are adjacent siblings in a
 * `children` array (what React renders as one text run), never across unrelated values.
 */
export function rscRuns(payload: string): { id: string; text: string; inCode: boolean }[] {
  const runs: { id: string; text: string; inCode: boolean }[] = [];
  const emit = (id: string, text: string, inCode: boolean) => {
    if (text && !isReference(text)) runs.push({ id: `${id}#${runs.length}`, text, inCode });
  };
  const isElement = (node: unknown): node is ["$", string, unknown, Record<string, unknown>] =>
    Array.isArray(node) && node[0] === "$" && typeof node[1] === "string" && node.length === 4;

  function children(id: string, node: unknown, inCode: boolean): void {
    if (typeof node === "string") return emit(id, node, inCode);
    if (!Array.isArray(node) || isElement(node)) return walk(id, node, inCode);
    let run = "";
    for (const child of node) {
      if (typeof child === "string" && !isReference(child)) {
        run += child;
        continue;
      }
      // An inline element holding only text (`["$","em",…,{"children":"{"}]`) renders inside the run, so
      // `{<em>{</em>fill me}}` reads `{{fill me}}`, as in the HTML text-only view.
      const inline = inlineText(child);
      if (inline !== undefined && !inCode) {
        run += inline;
        if (isElement(child)) walkProps(id, child[3], inCode, true);
        continue;
      }
      emit(id, run, inCode);
      run = "";
      walk(id, child, inCode);
    }
    emit(id, run, inCode);
  }

  /** The text of an inline element whose children are only strings or other such elements; else undefined. */
  function inlineText(node: unknown): string | undefined {
    if (typeof node === "string") return isReference(node) ? undefined : node;
    if (!isElement(node) || !INLINE_TAGS.has(node[1])) return undefined;
    const kids = node[3]?.children;
    if (kids === undefined || kids === null) return "";
    const list = Array.isArray(kids) && !isElement(kids) ? kids : [kids];
    let text = "";
    for (const kid of list) {
      const part = inlineText(kid);
      if (part === undefined) return undefined;
      text += part;
    }
    return text;
  }

  function walkProps(id: string, props: Record<string, unknown> | undefined, inCode: boolean, skipChildren = false): void {
    for (const [key, value] of Object.entries(props ?? {})) {
      if (key === "children") {
        if (!skipChildren) children(id, value, inCode);
      } else if (!NON_TEXT_PROPS.has(key)) walk(id, value, inCode);
    }
  }

  function walk(id: string, node: unknown, inCode: boolean): void {
    if (typeof node === "string") return emit(id, node, inCode);
    if (isElement(node)) {
      const [, type, , props] = node;
      walkProps(id, props, inCode || type === "code" || type === "pre");
      return;
    }
    if (Array.isArray(node)) for (const item of node) walk(id, item, inCode);
    else if (node && typeof node === "object") for (const value of Object.values(node)) walk(id, value, inCode);
  }

  for (const row of rscRows(payload)) {
    if (row.kind === "text") {
      emit(row.id, row.body, false);
      continue;
    }
    const json = row.body.replace(/^[A-Z]{1,2}(?=[[{"])/, ""); // I[…], HL[…] rows
    try {
      walk(row.id, JSON.parse(json), false);
    } catch {
      emit(row.id, row.body, false);
    }
  }
  return runs;
}

function runsOf(file: string, body: string): TextRun[] {
  const fromRsc = (payload: string, prefix: string) =>
    rscRuns(payload).map((run) => ({ id: `${prefix}${run.id}`, text: mapped(run.text), inCode: () => run.inCode }));
  if (file.endsWith(".rsc")) return fromRsc(body, "rsc:");
  if (file.endsWith(".html")) return [...htmlRuns(body), ...fromRsc(inlineFlight(body), "flight:")];
  return [{ id: "text", text: mapped(body), inCode: () => false }];
}

/**
 * Scans one emitted file (HTML, RSC payload, text body). A match is allowed only when the source scan
 * exempted that exact text, for this route, and (for the code rule) it renders inside <code>.
 */
export function scanRenderedOutput(file: string, body: string, allowed: readonly AllowedMarker[] = []): OutputHit[] {
  const scope = routeScope(file);
  const hits: OutputHit[] = [];
  const seen = new Set<string>();
  for (const run of runsOf(file, body)) {
    const source = run.text.text;
    const matches = findMarkerMatches(run.text, source, file);
    // Placeholder markers ({{…}} anywhere, code included; [TODO…]; TODO:) are never allowed (spec §8.1).
    const isAllowed = (match: (typeof matches)[number]) =>
      !isPlaceholderMarker(match) &&
      allowed.some(
        (entry) => entry.text === match.text && (entry.scope === "site" || entry.scope === scope) && (entry.where === "anywhere" || run.inCode(match.offset)),
      );
    for (const match of dedupeOverlaps(matches.filter((m) => !isAllowed(m)))) {
      const key = `${run.id}@${match.offset}`;
      if (seen.has(key)) continue;
      seen.add(key);
      hits.push({ file, marker: match.text, text: source.slice(Math.max(0, match.offset - 40), match.end + 40).replace(/\s+/g, " ") });
    }
  }
  return hits;
}

/** Emitted route files worth scanning: prerendered HTML, RSC payloads and text bodies (sitemap, robots). */
export const isScannableOutput = (file: string) => /\.(html|rsc)$/.test(file) || /\.(xml|txt)\.body$/.test(file);
