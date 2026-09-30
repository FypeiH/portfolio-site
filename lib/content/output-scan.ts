import { dedupeOverlaps, findMarkerMatches, mapped, mapReplace, type MappedText } from "./placeholders";
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
function htmlRun(html: string): TextRun {
  const code = Array.from(html.matchAll(CODE_ELEMENT), (m): [number, number] => [m.index, m.index + m[0].length]);
  const text = mapReplace(mapReplace(mapped(html), FLIGHT_SCRIPT, () => ""), /<!--\s*-->/g, () => "");
  return { id: "html", text, inCode: (offset) => code.some(([a, b]) => offset >= a && offset < b) };
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
      emit(id, run, inCode);
      run = "";
      walk(id, child, inCode);
    }
    emit(id, run, inCode);
  }

  function walk(id: string, node: unknown, inCode: boolean): void {
    if (typeof node === "string") return emit(id, node, inCode);
    if (isElement(node)) {
      const [, type, , props] = node;
      const code = inCode || type === "code" || type === "pre";
      for (const [key, value] of Object.entries(props ?? {})) {
        if (key === "children") children(id, value, code);
        else if (!NON_TEXT_PROPS.has(key)) walk(id, value, code);
      }
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
  if (file.endsWith(".html")) return [htmlRun(body), ...fromRsc(inlineFlight(body), "flight:")];
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
    const isAllowed = (match: (typeof matches)[number]) =>
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
