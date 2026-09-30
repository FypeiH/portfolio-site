import { analyzeBody, bodyProblems } from "./body";
import { avatarThumbPath, projectFile } from "./conventions";
import { isDiagramCurrent, renderedDiagramPath } from "./diagrams";
import type { ContentFlags } from "./flags";
import { findPlaceholders, formatHits } from "./placeholders";
import type { Experience, Profile, Project, SiteConfig, SkillGroup } from "./types";
import { selectVisibleProjects } from "./visibility";

export interface ContentSnapshot {
  site: SiteConfig;
  profile: Profile;
  experience: Experience[];
  skills: SkillGroup[];
  projects: Project[];
}

/** Repo-relative file access ("content/…", "public/…"), injected so the rules stay testable. */
export interface ContentFiles {
  exists(path: string): boolean;
  read(path: string): string | undefined;
}

/** "error" always breaks the build; "launch" breaks it only under CONTENT_STRICT. */
export interface ContentIssue {
  severity: "error" | "launch";
  message: string;
}

export const CORE_CONTENT_FILES = ["content/site.ts", "content/profile.ts", "content/experience.ts", "content/skills.ts"];

const FEATURED_RANGE = { min: 3, max: 4 };

export function collectContentIssues(content: ContentSnapshot, files: ContentFiles, flags: ContentFlags): ContentIssue[] {
  return [
    ...checkFlags(flags),
    ...checkReferences(content),
    ...checkFeatured(content.projects),
    ...checkPublicFiles(content, files),
    ...checkDiagrams(content.projects, files),
    ...checkPlaceholders(content.projects, files),
    ...checkBodies(content.projects, files),
  ];
}

function checkFlags(flags: ContentFlags): ContentIssue[] {
  return flags.strict && flags.showDrafts
    ? [{ severity: "error", message: "SHOW_DRAFTS=true cannot be combined with CONTENT_STRICT=true." }]
    : [];
}

function checkReferences({ experience, skills, projects }: ContentSnapshot): ContentIssue[] {
  const slugs = new Set(projects.map((p) => p.slug));
  const experienceIds = new Set(experience.map((e) => e.id));
  const missingSlug = (owner: string) => (slug: string) =>
    slugs.has(slug) ? [] : [{ severity: "error" as const, message: `${owner} references unknown project "${slug}".` }];

  return [
    ...projects.flatMap((p) =>
      p.experienceId && !experienceIds.has(p.experienceId)
        ? [{ severity: "error" as const, message: `V7: project "${p.slug}" references unknown experience "${p.experienceId}".` }]
        : [],
    ),
    ...experience.flatMap((e) => (e.projects ?? []).flatMap(missingSlug(`Experience "${e.id}"`))),
    ...skills.flatMap((g) => g.items.flatMap((item) => (item.projects ?? []).flatMap(missingSlug(`Skill "${item.name}"`)))),
  ];
}

function checkFeatured(projects: Project[]): ContentIssue[] {
  const featured = projects.filter((p) => p.featured);
  const orders = featured.map((p) => p.order);
  const issues: ContentIssue[] = [];
  if (new Set(orders).size !== orders.length) issues.push({ severity: "error", message: "Featured projects need a unique order." });

  const published = featured.filter((p) => p.status === "published").length;
  if (published < FEATURED_RANGE.min || published > FEATURED_RANGE.max) {
    issues.push({
      severity: "launch",
      message: `${published} featured projects are published; launch needs ${FEATURED_RANGE.min}–${FEATURED_RANGE.max}.`,
    });
  }
  return issues;
}

function checkPublicFiles({ profile, projects }: ContentSnapshot, files: ContentFiles): ContentIssue[] {
  const missing = (src: string) => !files.exists(`public${src}`);
  const issues: ContentIssue[] = [];
  if (missing(profile.cv.href)) issues.push({ severity: "launch", message: `Resume file is missing: public${profile.cv.href}` });
  if (profile.avatar && missing(profile.avatar.src)) issues.push({ severity: "error", message: `Avatar is missing: public${profile.avatar.src}` });
  if (profile.avatar && missing(avatarThumbPath(profile.avatar.src)))
    issues.push({ severity: "error", message: `Avatar thumbnail is missing: public${avatarThumbPath(profile.avatar.src)} (run pnpm avatar)` });
  for (const p of projects) {
    if (p.cover && missing(p.cover.src)) issues.push({ severity: "error", message: `Cover of "${p.slug}" is missing: public${p.cover.src}` });
    if (p.diagram?.kind === "image" && missing(p.diagram.src))
      issues.push({ severity: "error", message: `V6: diagram of "${p.slug}" is missing: public${p.diagram.src}` });
  }
  return issues;
}

function checkDiagrams(projects: Project[], files: ContentFiles): ContentIssue[] {
  return projects.flatMap((p): ContentIssue[] => {
    if (p.diagram?.kind !== "mermaid") return [];
    const source = files.read(p.diagram.source);
    if (source === undefined) return [{ severity: "error", message: `V5: diagram source is missing: ${p.diagram.source}` }];
    const svg = files.read(`public${renderedDiagramPath(p.diagram.source)}`);
    if (svg === undefined || !isDiagramCurrent(source, svg))
      return [{ severity: "launch", message: `V5: diagram out of date for "${p.slug}": run pnpm diagrams` }];
    return [];
  });
}

/** Body format of published case studies (featured: full format; others: short format). */
function checkBodies(projects: Project[], files: ContentFiles): ContentIssue[] {
  return selectVisibleProjects(projects, false).flatMap((p) =>
    bodyProblems(analyzeBody(files.read(projectFile(p.slug)) ?? ""), p.featured).map((problem) => ({
      severity: "launch" as const,
      message: `Case study "${p.slug}": ${problem}.`,
    })),
  );
}

/** Scans the global files plus published projects and their diagrams; drafts and `_` files never ship (PM decision). */
function checkPlaceholders(projects: Project[], files: ContentFiles): ContentIssue[] {
  const shipped = selectVisibleProjects(projects, false).flatMap((p) => [
    projectFile(p.slug),
    ...(p.diagram?.kind === "mermaid" ? [p.diagram.source] : []),
  ]);
  const hits = [...CORE_CONTENT_FILES, ...shipped].flatMap((file) => findPlaceholders(files.read(file) ?? "", file));
  return hits.length === 0
    ? []
    : [{ severity: "launch", message: `${hits.length} content placeholders left in published content:\n${formatHits(hits)}` }];
}

