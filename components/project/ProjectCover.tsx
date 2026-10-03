import { cn } from "@/lib/cn";
import type { CoverImage } from "@/lib/project-covers";

/**
 * Project cover (lib/project-covers.ts). Decorative: the title next to it names the project, so the
 * alt is empty. A plain <img>: the covers are pre-sized SVG/WebP files, so next/image would only add
 * client JS. Lazy, never high priority: covers are never the LCP element (visual-direction §5).
 */
export function ProjectCover({ cover, wide, className }: { cover: CoverImage; wide?: boolean; className?: string }) {
  return (
    <div className={cn("card-media", className)} data-wide={wide || undefined}>
      {/* eslint-disable-next-line @next/next/no-img-element -- static SVG/WebP, see above */}
      <img src={cover.src} alt="" width={cover.width} height={cover.height} loading="lazy" decoding="async" />
    </div>
  );
}
