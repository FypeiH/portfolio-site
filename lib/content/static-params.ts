import "server-only";

import { getProjects } from "./load";

/** Case-study slugs to prerender: the page and its OG image share this list (drafts only in preview). */
export function projectStaticParams(): { slug: string }[] {
  return getProjects().map((project) => ({ slug: project.slug }));
}
