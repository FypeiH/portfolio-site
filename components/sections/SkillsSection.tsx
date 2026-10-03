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

/** Ruled table (visual-direction B2): group in columns 1–3, items as mono text in 4–12; items with a case study link to it. */
export function SkillsSection({ groups, projectTitles }: SkillsSectionProps) {
  const ui = getUi();
  return (
    <Section id="skills" title={ui.skillsTitle} intro={ui.skillsIntro}>
      <div className="ui-ruled">
        {groups.map((group, index) => (
          <Reveal key={group.id} variant="fade" index={index} className="skills-row p-0!">
            <h3 id={`skills-${group.id}`} className="ui-label px-5 pt-4 lg:pb-4">
              {group.label}
            </h3>
            <ul aria-labelledby={`skills-${group.id}`} className="ui-slash-list px-5 pb-3 lg:py-1">
              {group.items.map((item) => {
                const slug = item.projects?.find((candidate) => projectTitles.has(candidate));
                const title = slug && projectTitles.get(slug);
                const name =
                  slug && title ? (
                    <Link href={`/projects/${slug}`} title={fill(ui.skillSeeIn, { project: title })} className="ui-chip ui-link">
                      {item.name}
                      <span aria-hidden="true">&nbsp;↗</span>
                      <span className="sr-only">, {fill(ui.skillSeeIn, { project: title })}</span>
                    </Link>
                  ) : (
                    <span className="ui-chip">{item.name}</span>
                  );
                return (
                  <li key={item.name} className={item.note ? "w-full" : undefined}>
                    {name}
                    {item.note && <span className="block text-xs text-muted">{item.note}</span>}
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
