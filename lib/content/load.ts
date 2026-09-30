import "server-only";

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import { cache } from "react";
import { experience } from "@/content/experience";
import { profile } from "@/content/profile";
import { site } from "@/content/site";
import { skills } from "@/content/skills";
import { PROJECTS_DIR, projectFile, SLUG_PATTERN } from "./conventions";
import { countDiagramSlots } from "./diagram-slots";
import { renderedDiagramPath, svgSize, type DiagramImage } from "./diagrams";
import { buildContentFlags } from "./flags";
import { repoFiles } from "./repo-files";
import { collectContentIssues, type ContentIssue } from "./rules";
import {
  ExperienceListSchema,
  ProfileSchema,
  ProjectFrontmatterSchema,
  SiteConfigSchema,
  SkillGroupListSchema,
} from "./schema";
import type { Project, SiteConfig } from "./types";
import type { UiStrings } from "./ui";
import { ContentError, parseContent } from "./validate";
import { findAdjacent, selectFeatured, selectVisibleProjects } from "./visibility";

const ROOT = process.cwd();

const files = repoFiles(ROOT);

function readProjects(): Project[] {
  return files
    .list(PROJECTS_DIR)
    .map((file) => file.slice(PROJECTS_DIR.length + 1))
    .filter((name) => name.endsWith(".mdx") && !name.startsWith("_") && !name.includes("/"))
    .map((name) => {
      const slug = name.slice(0, -".mdx".length);
      const file = projectFile(slug);
      if (!SLUG_PATTERN.test(slug)) throw new ContentError(`${file}: file name must be a kebab-case slug.`);
      const { data } = matter(files.read(file) ?? "");
      return { ...parseContent(ProjectFrontmatterSchema, data, file), slug };
    });
}

/**
 * `next build` loads content in several worker processes. The first one to create this marker prints
 * the warnings; `.next` is emptied at the start of every build, so each build prints them once.
 */
const WARNINGS_MARKER = ".next/content-warnings.txt";
/** Outside builds (dev), content is reloaded per request: print each distinct set of warnings once per process. */
const printedInProcess = new Set<string>();

function claimWarnings(text: string): boolean {
  if (process.env.NEXT_PHASE !== PHASE_PRODUCTION_BUILD) {
    if (printedInProcess.has(text)) return false;
    printedInProcess.add(text);
    return true;
  }
  try {
    fs.writeFileSync(path.join(/*turbopackIgnore: true*/ ROOT, WARNINGS_MARKER), text, { flag: "wx" });
    return true;
  } catch (error) {
    // Another worker printed them already; anything else is a real error.
    if ((error as NodeJS.ErrnoException).code === "EEXIST") return false;
    throw error;
  }
}

function report(issues: ContentIssue[], strict: boolean): void {
  const blocking = issues.filter((i) => i.severity === "error" || strict);
  if (blocking.length > 0) {
    const mode = strict ? " (CONTENT_STRICT=true)" : "";
    throw new ContentError(`Content check failed${mode}:\n- ${blocking.map((i) => i.message).join("\n- ")}`);
  }
  const text = issues.map(({ message }) => `[content] ${message}`).join("\n");
  if (text && claimWarnings(text)) console.warn(text);
}

/** Narrows the validated record to UiStrings after checking that every declared key survived parsing. */
function withUiKeys(parsed: Record<string, string | undefined>): UiStrings {
  const missing = Object.keys(site.ui).filter((key) => typeof parsed[key] !== "string");
  if (missing.length > 0) throw new ContentError(`content/site.ts: ui is missing ${missing.join(", ")}.`);
  return parsed as unknown as UiStrings;
}

const loadContent = cache(() => {
  const flags = buildContentFlags();
  const snapshot = {
    site: parseContent(SiteConfigSchema, site, "content/site.ts"),
    profile: parseContent(ProfileSchema, profile, "content/profile.ts"),
    experience: parseContent(ExperienceListSchema, experience, "content/experience.ts"),
    skills: parseContent(SkillGroupListSchema, skills, "content/skills.ts"),
    projects: readProjects().sort((a, b) => a.order - b.order),
  };
  report(collectContentIssues(snapshot, files, flags), flags.strict);
  return { ...snapshot, ui: withUiKeys(snapshot.site.ui), visibleProjects: selectVisibleProjects(snapshot.projects, flags.showDrafts) };
});

export const getSite = (): SiteConfig => loadContent().site;
/** The zod-validated UI strings, typed with the literal keys declared in content/site.ts. */
export const getUi = (): UiStrings => loadContent().ui;
export const getProfile = () => loadContent().profile;
export const getExperience = () => loadContent().experience;
export const getSkills = () => loadContent().skills;

/** Projects that may be rendered and linked: published ones, plus drafts in preview mode. */
export const getProjects = () => loadContent().visibleProjects;
export const getFeaturedProjects = () => selectFeatured(getProjects());
export const getProjectBySlug = (slug: string) => getProjects().find((p) => p.slug === slug);
export const getAdjacentProjects = (slug: string) => findAdjacent(getProjects(), slug);
export const getProjectTitles = (): ReadonlyMap<string, string> => new Map(getProjects().map((p) => [p.slug, p.title]));

/** How many `<Diagram />` slots the case study body has (KeyFacts placement, spec §3.4). */
export const getDiagramSlots = (slug: string) => countDiagramSlots(matter(files.read(projectFile(slug)) ?? "").content);

export function getDiagramImage({ diagram }: Project): DiagramImage | undefined {
  if (!diagram) return undefined;
  if (diagram.kind === "image") return diagram;
  const src = renderedDiagramPath(diagram.source);
  const size = svgSize(files.read(`public${src}`) ?? "");
  return size && { src, alt: diagram.alt, caption: diagram.caption, ...size };
}
