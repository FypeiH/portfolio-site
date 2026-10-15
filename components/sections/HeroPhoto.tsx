import { HeroGrid } from "@/components/sections/HeroGrid";
import { HERO_PHOTO, heroPhotoPath } from "@/lib/hero-photo";

/** Tailwind's lg breakpoint: the photo column only exists from here up. */
const WIDE = "(min-width: 64rem)";
/** Below lg the <img> keeps this inline pixel, so phones never request the photo (and it can't be their LCP). */
const NO_DOWNLOAD = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

const srcSet = (format: "avif" | "webp") => HERO_PHOTO.srcsetWidths.map((width) => `${heroPhotoPath(width, format)} ${width}w`).join(", ");

/**
 * Hero visual on wide screens: Filipe's real portrait in the duotone treatment of scripts/hero-photo.ts,
 * framed like the rest of the site, over the decorative grid. Hidden below lg.
 */
export function HeroPhoto() {
  return (
    <div className="relative hidden lg:col-span-4 lg:block">
      <HeroGrid className="h-auto w-full" />
      <div className="absolute inset-0 flex items-center justify-center">
        <picture>
          <source media={WIDE} type="image/avif" srcSet={srcSet("avif")} sizes={`${HERO_PHOTO.width}px`} />
          <source media={WIDE} type="image/webp" srcSet={srcSet("webp")} sizes={`${HERO_PHOTO.width}px`} />
          {/* Plain <img> in <picture>: art direction by media query; next/image can't skip the download on phones. */}
          <img src={NO_DOWNLOAD} alt={HERO_PHOTO.alt} width={HERO_PHOTO.width} height={HERO_PHOTO.height} fetchPriority="high" decoding="async" className="hero-photo" />
        </picture>
      </div>
    </div>
  );
}
