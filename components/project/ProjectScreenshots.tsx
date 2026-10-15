import type { Screenshot } from "@/lib/content/types";

/** Case-study gallery from the optional frontmatter `screenshots` (up to 3 images), below the body, never above the fold. */
export function ProjectScreenshots({ screenshots, label }: { screenshots: Screenshot[]; label: string }) {
  return (
    <section aria-labelledby="case-study-screenshots" className="mt-12">
      <h2 id="case-study-screenshots" className="ui-h3 uppercase">
        {label}
      </h2>
      <div className="mt-(--space-5) space-y-(--space-6)">
        {screenshots.map((shot) => (
          <figure key={shot.src} className="ui-panel">
            {/* Plain <img>: pre-sized files; next/image would add client JS. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={shot.src} alt={shot.alt} width={shot.width} height={shot.height} loading="lazy" decoding="async" className="block h-auto w-full" />
            {shot.caption && <figcaption className="border-t-2 border-fg p-3 text-sm text-muted">{shot.caption}</figcaption>}
          </figure>
        ))}
      </div>
    </section>
  );
}
