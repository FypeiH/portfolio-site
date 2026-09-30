import Image from "next/image";
import { AvailabilityBadge } from "@/components/ui/AvailabilityBadge";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ExternalLink } from "@/components/ui/ExternalLink";
import { Icon, type IconName } from "@/components/ui/Icon";
import { getUi } from "@/lib/content/load";
import { known } from "@/lib/content/placeholders";
import type { Profile } from "@/lib/content/types";
import { HeroGraph } from "./HeroGraph";

const ICON_LABEL_KEYS = { github: "heroGithub", linkedin: "heroLinkedin" } as const;

export function HeroSection({ profile }: { profile: Profile }) {
  const ui = getUi();
  const iconLinks = profile.links.flatMap((link) => {
    const href = known(link.href);
    return (link.kind === "github" || link.kind === "linkedin") && href
      ? [{ href, icon: link.kind satisfies IconName, label: ui[ICON_LABEL_KEYS[link.kind]] }]
      : [];
  });

  return (
    <section id="top" aria-labelledby="top-heading" className="relative isolate overflow-hidden">
      <HeroGraph className="pointer-events-none absolute -right-24 top-4 -z-10 w-[36rem] max-w-none md:right-0 md:w-[44rem]" />
      <div className="mx-auto max-w-5xl px-5 pb-20 pt-14 md:px-8 md:pb-28 md:pt-24">
        <div className="flex flex-wrap items-center gap-4">
          {profile.avatar && (
            <Image
              src={profile.avatar.src}
              alt={profile.avatar.alt}
              width={112}
              height={112}
              sizes="112px"
              loading="eager"
              className="size-24 rounded-full border border-border object-cover md:size-28"
            />
          )}
          <AvailabilityBadge availability={profile.availability} />
        </div>
        <h1 id="top-heading" className="mt-8 text-4xl font-bold tracking-tight md:text-6xl">
          {profile.name}
        </h1>
        <p className="mt-3 text-lg font-medium text-accent md:text-xl">{profile.role}</p>
        <p className="mt-6 max-w-2xl text-xl leading-snug text-fg md:text-2xl">{profile.tagline}</p>
        <p className="mt-4 max-w-2xl text-muted">{profile.intro}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="#projects">{ui.heroCtaProjects}</ButtonLink>
          <ButtonLink href="#contact" variant="secondary">
            {ui.heroCtaContact}
          </ButtonLink>
        </div>
        <ul className="mt-6 flex items-center gap-1 text-xl text-muted">
          {iconLinks.map((link) => (
            <li key={link.href}>
              <ExternalLink href={link.href} aria-label={link.label} className="inline-flex size-11 items-center justify-center rounded-md hover:text-fg">
                <Icon name={link.icon} />
              </ExternalLink>
            </li>
          ))}
          <li>
            <ExternalLink href={profile.cv.href} aria-label={ui.heroResume} className="inline-flex size-11 items-center justify-center rounded-md hover:text-fg">
              <Icon name="file" />
            </ExternalLink>
          </li>
        </ul>
      </div>
    </section>
  );
}
