import Link from "next/link";
import { getUi } from "@/lib/content/load";
import type { Project } from "@/lib/content/types";

export function ProjectPager({ prev, next }: { prev?: Project; next?: Project }) {
  const ui = getUi();
  return (
    <nav aria-label={`${ui.previousProject} / ${ui.nextProject}`} className="grid gap-4 sm:grid-cols-2">
      {prev ? (
        <Link href={`/projects/${prev.slug}`} className="rounded-xl border border-border p-4 hover:border-accent">
          <span className="block text-sm text-muted">← {ui.previousProject}</span>
          <span className="font-medium">{prev.title}</span>
        </Link>
      ) : (
        <span />
      )}
      {next && (
        <Link href={`/projects/${next.slug}`} className="rounded-xl border border-border p-4 text-right hover:border-accent sm:col-start-2">
          <span className="block text-sm text-muted">{ui.nextProject} →</span>
          <span className="font-medium">{next.title}</span>
        </Link>
      )}
    </nav>
  );
}
