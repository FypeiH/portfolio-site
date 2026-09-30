import { collapseWhitespace, decode, mapped } from "./placeholders";

/**
 * Render-level guard (QA FIL-8): what the build actually emitted, so a placeholder assembled in a
 * JSX expression or produced by a component is caught even when no source file contains it.
 */
const OUTPUT_MARKERS = [/\{\{/g, /\btodo\b/gi, /\btbd\b/gi, /\bfixme\b/gi, /\blorem\b/gi];

export interface OutputHit {
  file: string;
  text: string;
}

/** Scans one emitted file (HTML, RSC payload, text body); entities and escapes are decoded first. */
export function scanRenderedOutput(file: string, body: string): OutputHit[] {
  const { text } = collapseWhitespace(decode(mapped(body)));
  return OUTPUT_MARKERS.flatMap((pattern) =>
    Array.from(text.matchAll(pattern), (match) => ({
      file,
      text: text.slice(Math.max(0, match.index - 40), match.index + match[0].length + 40),
    })),
  );
}

/** Emitted route files worth scanning: prerendered HTML, RSC payloads and text bodies (sitemap, robots). */
export const isScannableOutput = (file: string) => /\.(html|rsc)$/.test(file) || /\.(xml|txt)\.body$/.test(file);
