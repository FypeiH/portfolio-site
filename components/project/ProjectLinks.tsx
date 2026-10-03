import { ExternalLink } from "@/components/ui/ExternalLink";
import { getUi } from "@/lib/content/load";
import { known } from "@/lib/content/placeholders";
import type { Project } from "@/lib/content/types";
import { VisibilityBadge } from "./VisibilityBadge";

const linkClass = "ui-text-link relative z-10";

/** "Source" only for public projects, otherwise the visibility badge; plus demo/store/docs when filled. */
export function ProjectLinks({ project }: { project: Project }) {
  const ui = getUi();
  const repo = known(project.links.repo);
  const links = [
    project.visibility === "public" && repo ? { href: repo, label: ui.source } : undefined,
    { href: known(project.links.demo), label: ui.liveDemo },
    { href: known(project.links.store), label: ui.appStore },
    { href: known(project.links.docs), label: ui.docs },
  ].filter((link): link is { href: string; label: string } => Boolean(link?.href));
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
      {project.visibility !== "public" && <VisibilityBadge visibility={project.visibility} />}
      {links.map((link) => (
        <ExternalLink key={link.href} href={link.href} className={linkClass}>
          {link.label}
          <span aria-hidden="true">&nbsp;↗</span>
        </ExternalLink>
      ))}
    </div>
  );
}
