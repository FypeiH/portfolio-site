import { Reveal } from "@/components/motion/Reveal";
import { CopyEmailButton } from "@/components/ui/CopyEmailButton";
import { ExternalLink } from "@/components/ui/ExternalLink";
import { Icon } from "@/components/ui/Icon";
import { Section } from "@/components/ui/Section";
import { getUi } from "@/lib/content/load";
import { known } from "@/lib/content/placeholders";
import type { Link, Profile } from "@/lib/content/types";

interface ContactSectionProps {
  email: string;
  links: readonly Link[];
  cv: Profile["cv"];
}

const linkClass = "inline-flex min-h-11 items-center gap-2 text-muted underline-offset-4 hover:text-fg hover:underline";

export function ContactSection({ email, links, cv }: ContactSectionProps) {
  const ui = getUi();
  const address = known(email);
  const socialLinks = links.flatMap((link) => {
    const href = known(link.href);
    return href && (link.kind === "linkedin" || link.kind === "github") ? [{ ...link, href, kind: link.kind }] : [];
  });

  return (
    <Section id="contact" title={ui.contactTitle}>
      <Reveal variant="fade" className="max-w-2xl">
        <p className="text-3xl font-semibold tracking-tight md:text-4xl">{ui.contactHeading}</p>
        <p className="mt-4 text-muted">{ui.contactIntro}</p>
        {address && (
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a href={`mailto:${address}`} className="inline-flex min-h-11 items-center gap-2 break-all text-xl font-medium text-accent underline underline-offset-4 hover:text-accent-strong md:text-2xl">
              <Icon name="mail" />
              <span className="sr-only">{ui.emailLabel}: </span>
              {address}
            </a>
            <CopyEmailButton
              email={address}
              labels={{ copy: ui.copyEmail, copyAria: ui.copyEmailAria, copied: ui.copied, failed: ui.copyFailed }}
              icons={{ copy: <Icon name="copy" />, check: <Icon name="check" /> }}
            />
          </div>
        )}
        <ul className="mt-8 flex flex-wrap gap-x-6">
          {socialLinks.map((link) => (
            <li key={link.href}>
              <ExternalLink href={link.href} className={linkClass}>
                <Icon name={link.kind} /> {link.kind === "github" ? ui.github : ui.linkedin}
              </ExternalLink>
            </li>
          ))}
          <li>
            <ExternalLink href={cv.href} className={linkClass}>
              <Icon name="file" /> {ui.downloadResume} {ui.pdfSuffix}
            </ExternalLink>
          </li>
        </ul>
      </Reveal>
    </Section>
  );
}
