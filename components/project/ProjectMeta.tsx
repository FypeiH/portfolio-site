import { TagList } from "@/components/ui/Tag";
import { getUi } from "@/lib/content/load";
import type { Project } from "@/lib/content/types";
import { formatPeriod } from "@/lib/format";
import { ProjectLinks } from "./ProjectLinks";
import { roleLabel } from "./role";

const joinUnique = (parts: Array<string | undefined>) => [...new Set(parts.filter(Boolean))].join(" · ") || undefined;

export function ProjectMeta({ project }: { project: Project }) {
  const ui = getUi();
  const rows = [
    { label: ui.metaOrganization, value: project.organization },
    { label: ui.metaRole, value: joinUnique([roleLabel(project, ui), project.roleNote]) },
    { label: ui.metaPeriod, value: formatPeriod(project.period.start, project.period.end, ui.present) },
  ].filter((row) => row.value);

  return (
    <dl className="grid gap-x-8 gap-y-4 ui-card p-5 text-sm sm:grid-cols-2">
      {rows.map((row) => (
        <div key={row.label}>
          <dt className="text-muted">{row.label}</dt>
          <dd className="mt-0.5">{row.value}</dd>
        </div>
      ))}
      <div className="sm:col-span-2">
        <dt className="text-muted">{ui.metaStack}</dt>
        <dd className="mt-2">
          <TagList items={project.stack} />
        </dd>
      </div>
      <div className="sm:col-span-2">
        <dt className="text-muted">{ui.metaLinks}</dt>
        <dd>
          <ProjectLinks project={project} />
        </dd>
      </div>
    </dl>
  );
}
