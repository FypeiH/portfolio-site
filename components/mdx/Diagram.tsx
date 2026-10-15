import type { CSSProperties } from "react";
import { DiagramZoom } from "@/components/mdx/DiagramZoom";
import { getUi } from "@/lib/content/load";
import type { DiagramImage } from "@/lib/content/diagrams";

/**
 * Smallest share of its intrinsic width a diagram is drawn at from md up. Labels are rendered at 18 px
 * (scripts/render-diagrams.ts), so they never drop below 14 px; a wider diagram scrolls sideways.
 */
export const DIAGRAM_MIN_SCALE = 14 / 18;

/**
 * Architecture diagram (spec §3.3, §7.3): pre-rendered SVG, wider than the text column (up to
 * 1100 px), never upscaled, plus a full-size view and a link to the raw SVG.
 */
export function Diagram({ image, label }: { image: DiagramImage; label: string }) {
  const ui = getUi();
  const size = { "--diagram-w": `${image.width}px`, "--diagram-min-w": `${Math.ceil(image.width * DIAGRAM_MIN_SCALE)}px` } as CSSProperties;
  return (
    <figure className="diagram-figure ui-panel my-8 bg-surface p-4 md:p-6">
      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={label}>
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG: the image optimizer adds nothing */}
        <img src={image.src} alt={image.alt} width={image.width} height={image.height} loading="lazy" decoding="async" className="diagram-img" style={size} />
      </div>
      <figcaption className="mt-4 border-t border-border pt-3 text-sm text-muted">
        <span className="ui-label text-fg!">{label}. </span>
        {image.caption}
        <span className="mt-3 flex flex-wrap items-center gap-4">
          <DiagramZoom
            src={image.src}
            alt={image.alt}
            width={image.width}
            height={image.height}
            labels={{ open: ui.diagramEnlarge, close: ui.diagramClose }}
          />
          <a href={image.src} target="_blank" rel="noopener" className="ui-text-link">
            {ui.diagramOpenSvg}
            <span aria-hidden="true">&nbsp;↗</span>
          </a>
        </span>
      </figcaption>
    </figure>
  );
}
