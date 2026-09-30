import { ExternalLink } from "@/components/ui/ExternalLink";
import { Icon } from "@/components/ui/Icon";
import { getUi } from "@/lib/content/load";
import { known } from "@/lib/content/placeholders";
import type { Project } from "@/lib/content/types";
import { VisibilityBadge } from "./VisibilityBadge";

const linkClass = "relative z-10 inline-flex min-h-11 items-center gap-1.5 text-sm text-accent hover:text-accent-strong";

/** "Source" only for public projects, otherwise the visibility badge; plus demo/store/docs when filled. */
export function ProjectLinks({ project }: { project: Project }) {
  const ui = getUi();
  const repo = known(project.links.repo);
  const demo = known(project.links.demo);
  const store = known(project.links.store);
  const docs = known(project.links.docs);
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
      {project.visibility === "public"
        ? repo && (
            <ExternalLink href={repo} className={linkClass}>
              <Icon name="github" /> {ui.source}
            </ExternalLink>
          )
        : <VisibilityBadge visibility={project.visibility} />}
      {demo && (
        <ExternalLink href={demo} className={linkClass}>
          <Icon name="external" /> {ui.liveDemo}
        </ExternalLink>
      )}
      {store && (
        <ExternalLink href={store} className={linkClass}>
          <Icon name="external" /> {ui.appStore}
        </ExternalLink>
      )}
      {docs && (
        <ExternalLink href={docs} className={linkClass}>
          <Icon name="external" /> {ui.docs}
        </ExternalLink>
      )}
    </div>
  );
}
