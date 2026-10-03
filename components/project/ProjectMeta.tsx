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
    <dl className="ui-ruled text-sm sm:grid-cols-2">
      {rows.map((row, index) => (
        // An odd last row spans both columns, so the ruled grid has no empty cell.
        <div key={row.label} className={index === rows.length - 1 && rows.length % 2 === 1 ? "sm:col-span-2" : undefined}>
          <dt className="ui-label">{row.label}</dt>
          <dd className="mt-1">{row.value}</dd>
        </div>
      ))}
      <div className="sm:col-span-2">
        <dt className="ui-label">{ui.metaStack}</dt>
        <dd className="mt-2">
          <TagList items={project.stack} />
        </dd>
      </div>
      <div className="sm:col-span-2">
        <dt className="ui-label">{ui.metaLinks}</dt>
        <dd>
          <ProjectLinks project={project} />
        </dd>
      </div>
    </dl>
  );
}
