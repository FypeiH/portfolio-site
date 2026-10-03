import type { DiagramImage } from "@/lib/content/diagrams";

/** Architecture diagram: pre-rendered SVG plus a text caption that describes the flow (spec §3.3, §7.3). */
export function Diagram({ image, label }: { image: DiagramImage; label: string }) {
  return (
    <figure className="ui-panel my-8 bg-surface p-4 md:p-6">
      {/* eslint-disable-next-line @next/next/no-img-element -- static SVG: the image optimizer adds nothing */}
      <img src={image.src} alt={image.alt} width={image.width} height={image.height} loading="lazy" decoding="async" className="mx-auto h-auto max-h-[36rem] w-full object-contain" />
      <figcaption className="mt-4 border-t border-border pt-3 text-sm text-muted">
        <span className="ui-label text-fg!">{label}. </span>
        {image.caption}
      </figcaption>
    </figure>
  );
}
