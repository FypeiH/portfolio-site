import { HeroGrid } from "@/components/sections/HeroGrid";
import { AvailabilityBadge } from "@/components/ui/AvailabilityBadge";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { getUi } from "@/lib/content/load";
import { known } from "@/lib/content/placeholders";
import type { Profile } from "@/lib/content/types";

/**
 * Hero (visual-direction §3, B4; spec §1.1): the availability badge and the name small above a
 * two-line title, one supporting line and two CTAs, with an inline-SVG grid on the right. System fonts
 * only and nothing animated, so the h1 and the support line (the LCP element on mobile) paint with the
 * HTML. No images; the portrait lives in #about.
 */
export function HeroSection({ profile }: { profile: Profile }) {
  const ui = getUi();
  const email = known(profile.email);
  return (
    <section id="top" aria-labelledby="top-heading" className="ui-container grid items-center gap-(--space-8) pb-(--section-py) pt-(--space-9) lg:grid-cols-12 lg:gap-x-(--gutter)">
      <div className="lg:col-span-8">
        <AvailabilityBadge availability={profile.availability} />
        <h1 id="top-heading" className="mt-(--space-5)">
          <span className="ui-label block text-accent!">{profile.name}</span>{" "}
          <span className="hero-title mt-(--space-4) block">
            {ui.heroTitleLine1}
            <br />{" "}
            {ui.heroTitleLine2}
          </span>
        </h1>
        <p className="mt-(--space-5) max-w-[38rem] text-lead text-muted">{ui.heroSupport}</p>
        <div className="mt-(--space-6) flex flex-wrap gap-4">
          <ButtonLink href={email ? `mailto:${email}` : "#contact"}>{ui.heroCtaContact}</ButtonLink>
          <ButtonLink href="#projects" variant="secondary">
            {ui.heroCtaProjects}
          </ButtonLink>
        </div>
      </div>
      <HeroGrid className="mx-auto w-full max-w-[22rem] lg:col-span-4 lg:max-w-none" />
    </section>
  );
}
