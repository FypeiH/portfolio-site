import { TimelineItem } from "@/components/experience/TimelineItem";
import { Reveal } from "@/components/motion/Reveal";
import { Section } from "@/components/ui/Section";
import { getUi } from "@/lib/content/load";
import type { Experience } from "@/lib/content/types";

interface ExperienceSectionProps {
  items: readonly Experience[];
  projectTitles: ReadonlyMap<string, string>;
}

/** Ruled table (visual-direction B2): dates in columns 1–3, the role in 4–12. */
export function ExperienceSection({ items, projectTitles }: ExperienceSectionProps) {
  return (
    <Section id="experience" title={getUi().experienceTitle}>
      <ol className="ui-ruled">
        {items.map((item, index) => (
          <Reveal as="li" key={item.id} index={index} variant="fade">
            <TimelineItem item={item} projectTitles={projectTitles} />
          </Reveal>
        ))}
      </ol>
    </Section>
  );
}
