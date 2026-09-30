import Link from "next/link";
import { Reveal } from "@/components/motion/Reveal";
import { Section } from "@/components/ui/Section";
import { getUi } from "@/lib/content/load";
import type { SkillGroup } from "@/lib/content/types";
import { fill } from "@/lib/content/ui";

interface SkillsSectionProps {
  groups: readonly SkillGroup[];
  /** Only linkable case studies: a skill never links to a hidden draft. */
  projectTitles: ReadonlyMap<string, string>;
}

const chipClass = "inline-flex min-h-11 items-center rounded-md border border-border bg-surface px-3 py-1 text-sm";

export function SkillsSection({ groups, projectTitles }: SkillsSectionProps) {
  const ui = getUi();
  return (
    <Section id="skills" title={ui.skillsTitle} intro={ui.skillsIntro}>
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((group, index) => (
          <Reveal key={group.id} variant="fade" index={index}>
            <h3 id={`skills-${group.id}`} className="text-sm font-semibold uppercase tracking-wider text-muted">
              {group.label}
            </h3>
            <ul className="mt-3 flex flex-wrap gap-2">
              {group.items.map((item) => {
                const slug = item.projects?.find((candidate) => projectTitles.has(candidate));
                const title = slug && projectTitles.get(slug);
                return (
                  <li key={item.name}>
                    {slug && title ? (
                      <Link href={`/projects/${slug}`} title={fill(ui.skillSeeIn, { project: title })} className={`${chipClass} gap-1 text-accent hover:border-accent`}>
                        {item.name}
                        <span aria-hidden="true">↗</span>
                        <span className="sr-only">, {fill(ui.skillSeeIn, { project: title })}</span>
                      </Link>
                    ) : (
                      <span className={chipClass}>{item.name}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
