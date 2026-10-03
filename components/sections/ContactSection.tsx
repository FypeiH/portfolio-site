import { Reveal } from "@/components/motion/Reveal";
import { CopyEmailButton } from "@/components/ui/CopyEmailButton";
import { ExternalLink } from "@/components/ui/ExternalLink";
import { Section } from "@/components/ui/Section";
import { getUi } from "@/lib/content/load";
import { known } from "@/lib/content/placeholders";
import type { Link, Profile } from "@/lib/content/types";

interface ContactSectionProps {
  email: string;
  links: readonly Link[];
  cv: Profile["cv"];
}

/** Big text links, no icons; the email with a rectangular COPY button. */
export function ContactSection({ email, links, cv }: ContactSectionProps) {
  const ui = getUi();
  const address = known(email);
  const textLinks = [
    ...links.flatMap((link) => {
      const href = known(link.href);
      return href && (link.kind === "linkedin" || link.kind === "github") ? [{ href, label: link.kind === "github" ? ui.github : ui.linkedin }] : [];
    }),
    { href: cv.href, label: `${ui.downloadResume} ${ui.pdfSuffix}` },
  ];

  return (
    <Section id="contact" title={ui.contactTitle}>
      <Reveal variant="fade" className="max-w-4xl">
        <p className="text-h1-page font-extrabold uppercase">{ui.contactHeading}</p>
        <p className="mt-(--space-4) max-w-2xl text-muted">{ui.contactIntro}</p>
        {address && (
          <div className="mt-(--space-6) flex flex-wrap items-center gap-4">
            <a href={`mailto:${address}`} className="ui-link break-all text-h3 font-bold">
              <span className="sr-only">{ui.emailLabel}: </span>
              {address}
            </a>
            <CopyEmailButton email={address} labels={{ copy: ui.copyEmail, copyAria: ui.copyEmailAria, copied: ui.copied, failed: ui.copyFailed }} />
          </div>
        )}
        <ul className="mt-(--space-6) flex flex-col items-start gap-2">
          {textLinks.map((link) => (
            <li key={link.href}>
              <ExternalLink href={link.href} className="ui-link inline-flex min-h-11 items-center text-h3 font-bold uppercase">
                {link.label}
                <span aria-hidden="true">&nbsp;↗</span>
              </ExternalLink>
            </li>
          ))}
        </ul>
      </Reveal>
    </Section>
  );
}
