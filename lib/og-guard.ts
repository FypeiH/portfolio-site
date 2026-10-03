import { isValidElement, type ReactElement, type ReactNode } from "react";
import { scanRenderedOutput, type OutputHit } from "@/lib/content/output-scan";
import type { AllowedMarker } from "@/lib/content/scan";

/**
 * Text guard for the Open Graph images (spec §8.1, QA FIL-8 r3 O1). An OG image ships as a PNG, so
 * the post-build output scan (scripts/check-output.ts) can't read it; instead the element tree handed
 * to ImageResponse is checked before rendering. Function components (OgFrame…) are expanded, so text
 * they add is read too. Adjacent strings inside one element are joined (Satori draws them as one run);
 * separate elements are separate lines. Same marker rules and exemptions as the rendered-output scan:
 * a bare TBD/TODO/FIXME the source scan exempted with `placeholder-ok` passes (for the routes its file
 * renders on); `{{…}}`, `[TODO…]` and `TODO:` never do.
 */
export function ogText(node: ReactNode): string[] {
  const lines: string[] = [];
  const visit = (value: ReactNode): void => {
    if (value === null || value === undefined || typeof value === "boolean") return;
    if (typeof value === "string" || typeof value === "number") {
      lines.push(String(value));
      return;
    }
    if (Array.isArray(value)) {
      let run = "";
      for (const child of value as ReactNode[]) {
        if (typeof child === "string" || typeof child === "number") run += String(child);
        else {
          if (run) lines.push(run);
          run = "";
          visit(child);
        }
      }
      if (run) lines.push(run);
      return;
    }
    if (isValidElement(value)) {
      const element = value as ReactElement<Record<string, unknown>>;
      const { type, props } = element;
      if (typeof type === "function") {
        visit((type as (p: Record<string, unknown>) => ReactNode)(props));
        return;
      }
      // Text-like props Satori can draw or expose (alt is never drawn, but keep it honest).
      for (const key of ["alt", "title", "aria-label"]) if (typeof props[key] === "string") lines.push(props[key] as string);
      visit(props.children as ReactNode);
      return;
    }
    if (typeof value === "object" && Symbol.iterator in value) visit(Array.from(value as Iterable<ReactNode>));
  };
  visit(node);
  return lines.filter((line) => line.trim() !== "");
}

/** Placeholder markers in the text of an OG image tree. `route` is the page's path ("/", "/projects/<slug>"). */
export function ogTextHits(route: string, node: ReactNode, allowed: readonly AllowedMarker[] = []): OutputHit[] {
  // "og/app/projects/<slug>" gives routeScope() the case-study scope, as for that page's HTML.
  const file = `og/app${route === "/" ? "/index" : route}`;
  return ogText(node).flatMap((line) => scanRenderedOutput(file, line, allowed));
}

/**
 * Throws (failing the prerender, hence the build) when a strict build would draw a placeholder into an
 * OG image. Non-strict builds (preview, local) only render; they never ship to production.
 */
export function assertOgText(
  route: string,
  node: ReactNode,
  { strict = process.env.CONTENT_STRICT === "true", allowed = () => [] }: { strict?: boolean; allowed?: () => readonly AllowedMarker[] } = {},
): void {
  if (!strict) return;
  const hits = ogTextHits(route, node, allowed());
  if (hits.length === 0) return;
  throw new Error(
    `Rendered output check failed: ${hits.length} placeholder markers in the OG image text of ${route}:\n` +
      hits.map((hit) => `  og:${route}: …${hit.text}…`).join("\n"),
  );
}
