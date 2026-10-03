import { Reveal } from "@/components/motion/Reveal";
import { ProjectCard } from "@/components/project/ProjectCard";
import { ExternalLink } from "@/components/ui/ExternalLink";
import { Section } from "@/components/ui/Section";
import { cn } from "@/lib/cn";
import { getUi } from "@/lib/content/load";
import type { Project } from "@/lib/content/types";

interface ProjectsSectionProps {
  projects: readonly Project[];
  githubUrl?: string;
}

export function ProjectsSection({ projects, githubUrl }: ProjectsSectionProps) {
  const ui = getUi();
  // With an odd number of cards the first one spans both columns, so the grid has no hole (§5, 08-featured-grid).
  const wideFirst = projects.length % 2 === 1 && projects.length > 1;
  return (
    <Section id="projects" title={ui.projectsTitle} intro={ui.projectsIntro} count={projects.length}>
      {projects.length > 0 ? (
        <ol className="grid gap-(--gutter) md:grid-cols-2">
          {projects.map((project, index) => {
            const wide = wideFirst && index === 0;
            return (
              <Reveal as="li" key={project.slug} index={index} className={cn(wide && "md:col-span-2")}>
                <ProjectCard project={project} position={index + 1} wide={wide} />
              </Reveal>
            );
          })}
        </ol>
      ) : (
        <p className="text-muted">{ui.projectsEmpty}</p>
      )}
      {githubUrl && (
        <p className="mt-(--space-6)">
          <ExternalLink href={githubUrl} className="ui-text-link">
            {ui.moreOnGithub}
            <span aria-hidden="true">&nbsp;↗</span>
          </ExternalLink>
        </p>
      )}
    </Section>
  );
}
