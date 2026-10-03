import { cn } from "@/lib/cn";
import type { CoverImage } from "@/lib/project-covers";

/**
 * Project cover (lib/project-covers.ts). Decorative: the title next to it names the project, so the
 * alt is empty. A plain <img>: the covers are pre-sized SVG/WebP files, so next/image would only add
 * client JS. Never high priority: covers are never the LCP element on the budgeted (mobile) run
 * (visual-direction §5). Cards are lazy; `eager` (case-study header) starts the request at parse time
 * with low fetch priority, because on large screens (1920×1080) the cover is partly in the first viewport.
 */
export function ProjectCover({ cover, wide, eager, className }: { cover: CoverImage; wide?: boolean; eager?: boolean; className?: string }) {
  return (
    <div className={cn("card-media", className)} data-wide={wide || undefined}>
      {/* eslint-disable-next-line @next/next/no-img-element -- static SVG/WebP, see above */}
      <img
        src={cover.src}
        alt=""
        width={cover.width}
        height={cover.height}
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "low" : undefined}
        decoding="async"
      />
    </div>
  );
}
