import { AvailabilityBadge } from "@/components/ui/AvailabilityBadge";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ExternalLink } from "@/components/ui/ExternalLink";
import { getUi } from "@/lib/content/load";
import { known } from "@/lib/content/placeholders";
import type { Profile } from "@/lib/content/types";

/**
 * Hero (visual-direction §3, B4): system fonts only and nothing animated, so the h1 and the intro
 * paint with the HTML. No images here; the portrait lives in #about.
 */
export function HeroSection({ profile }: { profile: Profile }) {
  const ui = getUi();
  const links = [
    ...profile.links.flatMap((link) => {
      const href = known(link.href);
      return (link.kind === "github" || link.kind === "linkedin") && href ? [{ href, label: link.kind === "github" ? ui.github : ui.linkedin }] : [];
    }),
    { href: profile.cv.href, label: `${ui.resume} ${ui.pdfSuffix}` },
  ];

  return (
    <section id="top" aria-labelledby="top-heading" className="ui-container pb-(--section-py) pt-(--space-9)">
      <AvailabilityBadge availability={profile.availability} />
      <h1 id="top-heading" className="hero-name mt-(--space-5)">
        {profile.name}
      </h1>
      <p className="ui-label mt-(--space-4) text-accent!">{profile.role}</p>
      <div className="mt-(--space-6) max-w-[42rem]">
        <p className="text-lead font-medium">{profile.tagline}</p>
        <p className="mt-(--space-4) text-muted">{profile.intro}</p>
      </div>
      <div className="mt-(--space-6) flex flex-wrap gap-4">
        <ButtonLink href="#projects">{ui.heroCtaProjects}</ButtonLink>
        <ButtonLink href="#contact" variant="secondary">
          {ui.heroCtaContact}
        </ButtonLink>
      </div>
      <ul className="mt-(--space-5) flex flex-wrap items-center gap-x-3">
        {links.map((link, index) => (
          <li key={link.href} className="flex items-center gap-x-3">
            {index > 0 && (
              <span aria-hidden="true" className="text-subtle">
                ·
              </span>
            )}
            <ExternalLink href={link.href} className="ui-text-link">
              {link.label}
              <span aria-hidden="true">&nbsp;↗</span>
            </ExternalLink>
          </li>
        ))}
      </ul>
    </section>
  );
}
