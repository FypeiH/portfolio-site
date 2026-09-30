import { Reveal } from "@/components/motion/Reveal";
import { ProjectCard } from "@/components/project/ProjectCard";
import { ExternalLink } from "@/components/ui/ExternalLink";
import { Section } from "@/components/ui/Section";
import { getUi } from "@/lib/content/load";
import type { Project } from "@/lib/content/types";

interface ProjectsSectionProps {
  projects: readonly Project[];
  githubUrl?: string;
}

export function ProjectsSection({ projects, githubUrl }: ProjectsSectionProps) {
  const ui = getUi();
  return (
    <Section id="projects" title={ui.projectsTitle} intro={ui.projectsIntro}>
      {projects.length > 0 ? (
        <ol className="grid gap-6 md:grid-cols-2">
          {projects.map((project, index) => (
            <Reveal as="li" key={project.slug} index={index}>
              <ProjectCard project={project} />
            </Reveal>
          ))}
        </ol>
      ) : (
        <p className="text-muted">{ui.projectsEmpty}</p>
      )}
      {githubUrl && (
        <p className="mt-8">
          <ExternalLink href={githubUrl} className="inline-flex min-h-11 items-center text-sm text-accent underline underline-offset-4 hover:text-accent-strong">
            {ui.moreOnGithub}
          </ExternalLink>
        </p>
      )}
    </Section>
  );
}
