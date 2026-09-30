import { collapseWhitespace, decode, mapped, MARKERS } from "./placeholders";

/**
 * Render-level guard (QA FIL-8): what the build actually emitted, so a placeholder assembled in a
 * JSX expression or produced by a component is caught even when no source file contains it.
 * Same markers and case rules as the source scan (placeholders.ts MARKERS).
 */

export interface OutputHit {
  file: string;
  /** The matched marker, normalised like the source scan's (compared with the allow-list). */
  marker: string;
  text: string;
}

/**
 * Views of one emitted file to scan. React splits adjacent JSX strings: HTML gets an empty `<!-- -->`
 * between them and the RSC payload separate JSON strings (`"{","{"`), so `{"{"}{"{"}x{"}"}{"}"}`
 * only reads `{{x}}` once those seams are removed. The unjoined view is kept too, because joining
 * two unrelated strings could glue a marker to the next word.
 */
export function outputViews(body: string): string[] {
  const seamless = body.replace(/<!--\s*-->/g, "");
  const joined = seamless.replace(/(?<!\\)"\s*,\s*"/g, "");
  return [seamless, joined].map((view) => view.replace(/\\"/g, '"').replace(/\\\\/g, "\\"));
}

/**
 * Scans one emitted file (HTML, RSC payload, text body) after decoding entities and escapes.
 * `allowed` holds the marker texts the source scan exempted (code rule or `placeholder-ok`).
 */
export function scanRenderedOutput(file: string, body: string, allowed: ReadonlySet<string> = new Set()): OutputHit[] {
  const seen = new Set<string>();
  const hits: OutputHit[] = [];
  for (const view of outputViews(body)) {
    const { text } = collapseWhitespace(decode(mapped(view)));
    for (const { pattern } of MARKERS) {
      for (const match of text.matchAll(pattern)) {
        const marker = match[0].trim();
        if (allowed.has(marker)) continue;
        const context = text.slice(Math.max(0, match.index - 40), match.index + match[0].length + 40);
        const key = `${marker}\u0000${context.replace(/"\s*,\s*"/g, "")}`; // same hit seen in both views
        if (seen.has(key)) continue;
        seen.add(key);
        hits.push({ file, marker, text: context });
      }
    }
  }
  return hits;
}

/** Emitted route files worth scanning: prerendered HTML, RSC payloads and text bodies (sitemap, robots). */
export const isScannableOutput = (file: string) => /\.(html|rsc)$/.test(file) || /\.(xml|txt)\.body$/.test(file);
