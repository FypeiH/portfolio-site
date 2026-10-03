import Link from "next/link";
import { getUi } from "@/lib/content/load";
import type { Project } from "@/lib/content/types";

export function ProjectPager({ prev, next }: { prev?: Project; next?: Project }) {
  const ui = getUi();
  return (
    <nav aria-label={`${ui.previousProject} / ${ui.nextProject}`} className="grid gap-4 sm:grid-cols-2">
      {prev ? (
        <Link href={`/projects/${prev.slug}`} className="ui-panel group p-4 transition-colors hover:bg-fg hover:text-bg">
          <span className="ui-label block group-hover:text-bg!">← {ui.previousProject}</span>
          <span className="mt-1 block font-bold">{prev.title}</span>
        </Link>
      ) : (
        <span />
      )}
      {next && (
        <Link href={`/projects/${next.slug}`} className="ui-panel group p-4 text-right transition-colors hover:bg-fg hover:text-bg sm:col-start-2">
          <span className="ui-label block group-hover:text-bg!">{ui.nextProject} →</span>
          <span className="mt-1 block font-bold">{next.title}</span>
        </Link>
      )}
    </nav>
  );
}
