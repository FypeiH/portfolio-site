import Link from "next/link";
import { TagList } from "@/components/ui/Tag";
import { getUi } from "@/lib/content/load";
import type { Project } from "@/lib/content/types";
import { formatPeriod } from "@/lib/format";
import { DraftBadge } from "./DraftBadge";
import { MetricBadge } from "./MetricBadge";
import { ProjectLinks } from "./ProjectLinks";
import { roleLabel } from "./role";

export function ProjectCard({ project }: { project: Project }) {
  const ui = getUi();
  const [metric] = project.metrics;
  const context = [project.organization, formatPeriod(project.period.start, project.period.end, ui.present), roleLabel(project, ui)]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="ui-card group relative flex h-full flex-col gap-4 p-6 transition-colors hover:border-accent/60">
      {project.status === "draft" && (
        <div>
          <DraftBadge />
        </div>
      )}
      <div>
        <h3 className="text-lg font-semibold tracking-tight">
          <Link href={`/projects/${project.slug}`} className="after:absolute after:inset-0 after:rounded-xl group-hover:text-accent">
            {project.title}
          </Link>
        </h3>
        <p className="mt-1 text-sm text-muted">{context}</p>
      </div>
      {/* Spec §1.1: the card shows problem and solution (not the summary). */}
      <div className="space-y-2 text-sm">
        <p className="text-muted">{project.problem}</p>
        <p>{project.solution}</p>
      </div>
      {metric && <MetricBadge metric={metric} />}
      <TagList items={project.stack} label={ui.metaStack} />
      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-2">
        <span aria-hidden="true" className="text-sm font-medium text-fg group-hover:text-accent">
          {ui.readCaseStudy} →
        </span>
        <ProjectLinks project={project} />
      </div>
    </article>
  );
}
