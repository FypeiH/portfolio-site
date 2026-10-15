import { HeroPhoto } from "@/components/sections/HeroPhoto";
import { AvailabilityBadge } from "@/components/ui/AvailabilityBadge";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { getUi } from "@/lib/content/load";
import { known } from "@/lib/content/placeholders";
import type { Profile } from "@/lib/content/types";

/**
 * Hero (visual-direction §3, B4; spec §1.1; Filipe's hierarchy, 2026-10-15): the name as the h1 in
 * Anton, the role in two short lines, one supporting line, the availability badge and two CTAs, with the
 * duotone portrait on wide screens (HeroPhoto; phones never download it). The name paints in a local fallback
 * face until the page has loaded (styles/globals.css, hero-name), so nothing here waits for a web font.
 */
export function HeroSection({ profile }: { profile: Profile }) {
  const ui = getUi();
  const email = known(profile.email);
  return (
    <section id="top" aria-labelledby="top-heading" className="ui-container grid items-center gap-(--space-8) pb-(--section-py) pt-(--space-9) lg:grid-cols-12 lg:gap-x-(--gutter)">
      <div className="@container lg:col-span-8">
        <h1 id="top-heading" className="hero-name">
          {profile.name}
        </h1>
        <p className="hero-title mt-(--space-4)">
          {ui.heroTitleLine1}
          <br />{" "}
          {ui.heroTitleLine2}
        </p>
        <p className="mt-(--space-5) max-w-[38rem] text-lead text-muted">{ui.heroSupport}</p>
        <div className="mt-(--space-5)">
          <AvailabilityBadge availability={profile.availability} />
        </div>
        <div className="mt-(--space-6) flex flex-wrap gap-4">
          <ButtonLink href={email ? `mailto:${email}` : "#contact"}>{ui.heroCtaContact}</ButtonLink>
          <ButtonLink href="#projects" variant="secondary">
            {ui.heroCtaProjects}
          </ButtonLink>
        </div>
      </div>
      <HeroPhoto />
    </section>
  );
}
