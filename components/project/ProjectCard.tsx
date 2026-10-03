import Link from "next/link";
import { TagList } from "@/components/ui/Tag";
import { getUi } from "@/lib/content/load";
import type { Project } from "@/lib/content/types";
import { formatYearRange } from "@/lib/format";
import { coverFor } from "@/lib/project-covers";
import { DraftBadge } from "./DraftBadge";
import { MetricBadge } from "./MetricBadge";
import { ProjectCover } from "./ProjectCover";
import { ProjectLinks } from "./ProjectLinks";
import { roleLabel } from "./role";

interface ProjectCardProps {
  project: Project;
  /** 1-based position, shown as `[01]` in the card bar. */
  position: number;
  /** Full-width card: wider media (21:9). */
  wide?: boolean;
}

/** Card (visual-direction §5): bar, 16:10 cover, problem → solution, metric, stack, links. The whole card is the case-study link. */
export function ProjectCard({ project, position, wide }: ProjectCardProps) {
  const ui = getUi();
  const [metric] = project.metrics;
  const cover = coverFor(project.slug);
  const role = roleLabel(project, ui);

  return (
    <article className="ui-card group flex h-full flex-col">
      <p className="card-bar">
        <span className="text-subtle group-hover:text-bg group-focus-within:text-bg">[{String(position).padStart(2, "0")}]</span>
        <span className="text-right">
          {project.organization} · {formatYearRange(project.period.start, project.period.end, ui.present)}
        </span>
      </p>
      {cover && <ProjectCover cover={cover} wide={wide} />}
      <div className="flex flex-1 flex-col gap-4 p-(--space-5)">
        {project.status === "draft" && (
          <div>
            <DraftBadge />
          </div>
        )}
        <div>
          <h3 className="ui-h3">
            <Link
              href={`/projects/${project.slug}`}
              className="decoration-2 underline-offset-4 after:absolute after:inset-0 group-focus-within:underline group-hover:underline"
            >
              {project.title}
            </Link>
          </h3>
          {role && <p className="mt-2 text-xs text-subtle">{role}</p>}
        </div>
        {/* Spec §1.1: the card shows problem and solution (not the summary). */}
        <div className="space-y-2 text-sm">
          <p className="text-muted">{project.problem}</p>
          <p>{project.solution}</p>
        </div>
        {metric && <MetricBadge metric={metric} />}
        <TagList items={project.stack} label={ui.metaStack} />
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-2">
          <span aria-hidden="true" className="ui-label text-fg! group-hover:text-accent! group-focus-within:text-accent!">
            {ui.readCaseStudy} →
          </span>
          <ProjectLinks project={project} />
        </div>
      </div>
    </article>
  );
}
