import type { ReactNode } from "react";
import { getSite } from "@/lib/content/load";
import type { SectionId } from "@/lib/content/types";

interface SectionProps {
  id: SectionId;
  title: string;
  intro?: string;
  /** Shown as `[nn]` at the end of the label row (e.g. the number of projects). */
  count?: number;
  children: ReactNode;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Characters the marquee track should hold, so short titles still fill the width while it moves. */
const TRACK_CHARS = 40;

/** aria-hidden copies after the title, alternating outline/solid; at least 3 (§7.1). */
const copiesFor = (title: string) => Array.from({ length: Math.max(3, Math.ceil(TRACK_CHARS / title.length)) }, (_, i) => i % 2 === 0);

/**
 * Section anatomy (visual-direction §4): mono label row `§nn / NAV LABEL ── [count]`, a full-bleed
 * marquee h2 (Anton), then the content 48 px below. `§nn` is the section's position in site.nav.
 */
export function Section({ id, title, intro, count, children }: SectionProps) {
  const headingId = `${id}-heading`;
  const { nav } = getSite();
  const position = nav.findIndex((item) => item.id === id);
  const label = nav[position]?.label ?? title;
  return (
    <section id={id} aria-labelledby={headingId} className="ui-section">
      <div className="ui-container">
        <p className="section-label ui-label" aria-hidden="true">
          <span>
            §{pad(position + 1)} / {label}
          </span>
          {count !== undefined && <span>[{pad(count)}]</span>}
        </p>
        <h2 id={headingId} className="marquee">
          <span className="marquee-track">
            <span>{title}</span>
            {copiesFor(title).map((ghost, index) => (
              <span key={index} aria-hidden="true" className={ghost ? "marquee-ghost" : undefined}>
                {title}
              </span>
            ))}
          </span>
        </h2>
        {intro && <p className="mt-(--space-5) max-w-2xl text-muted">{intro}</p>}
        <div className="mt-(--space-8)">{children}</div>
      </div>
    </section>
  );
}
