import type { Project } from "./types";

export function selectVisibleProjects(projects: readonly Project[], showDrafts: boolean): Project[] {
  return projects.filter((p) => showDrafts || p.status === "published");
}

export function selectFeatured(projects: readonly Project[]): Project[] {
  return projects.filter((p) => p.featured).sort((a, b) => a.order - b.order);
}

export function findAdjacent(projects: readonly Project[], slug: string): { prev?: Project; next?: Project } {
  const index = projects.findIndex((p) => p.slug === slug);
  if (index === -1) return {};
  return { prev: projects[index - 1], next: projects[index + 1] };
}
