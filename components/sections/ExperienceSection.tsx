import { TimelineItem } from "@/components/experience/TimelineItem";
import { Reveal } from "@/components/motion/Reveal";
import { Section } from "@/components/ui/Section";
import { getUi } from "@/lib/content/load";
import type { Experience } from "@/lib/content/types";

interface ExperienceSectionProps {
  items: readonly Experience[];
  projectTitles: ReadonlyMap<string, string>;
}

export function ExperienceSection({ items, projectTitles }: ExperienceSectionProps) {
  return (
    <Section id="experience" title={getUi().experienceTitle}>
      <div className="timeline relative ml-1.5">
        <span aria-hidden="true" className="timeline-line absolute inset-y-0 left-0 w-px bg-border" />
        <ol className="space-y-12">
          {items.map((item, index) => (
            <Reveal as="li" key={item.id} index={index}>
              <TimelineItem item={item} projectTitles={projectTitles} />
            </Reveal>
          ))}
        </ol>
      </div>
    </Section>
  );
}
