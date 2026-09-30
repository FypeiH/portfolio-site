import { describe, expect, it } from "vitest";
import { hashComment } from "@/lib/content/diagrams";
import { collectContentIssues, type ContentSnapshot } from "@/lib/content/rules";
import type { Experience, Profile, SiteConfig, SkillGroup } from "@/lib/content/types";
import { findAdjacent, selectFeatured, selectVisibleProjects } from "@/lib/content/visibility";
import { mdxBody, memoryFiles, project } from "./fixtures";

const flags = { strict: false, showDrafts: false };
const profile = { cv: { href: "/cv.pdf", label: "Resume", updatedAt: "2026-09" } } as Profile;
const base: Omit<ContentSnapshot, "projects"> = {
  site: {} as SiteConfig,
  profile,
  experience: [{ id: "altyra", projects: ["email-scraper"] }] as Experience[],
  skills: [{ id: "backend", label: "Backend", items: [{ name: "C#", projects: ["email-scraper"] }] }] as SkillGroup[],
};
const featuredBody = mdxBody(6, 320);
const cleanFiles = (slugs: string[], extra: Record<string, string> = {}) =>
  memoryFiles({
    "public/cv.pdf": "%PDF",
    ...Object.fromEntries(slugs.map((slug) => [`content/projects/${slug}.mdx`, featuredBody])),
    ...extra,
  });
const published = ["a", "b", "c"].map((slug, i) => project({ slug, order: i + 1 }));
const emailScraper = project({ slug: "email-scraper", featured: false, order: 9, status: "draft" });

describe("collectContentIssues", () => {
  it("passes a launch-ready snapshot", () => {
    const issues = collectContentIssues({ ...base, projects: [...published, emailScraper] }, cleanFiles(["a", "b", "c"]), flags);
    expect(issues).toEqual([]);
  });

  it("flags fewer than 3 published featured projects as a launch blocker", () => {
    const issues = collectContentIssues({ ...base, projects: [published[0]!, emailScraper] }, cleanFiles(["a"]), flags);
    expect(issues).toContainEqual({ severity: "launch", message: expect.stringContaining("1 featured projects are published") });
  });

  it("scans placeholders only in published projects, never in drafts, even in preview", () => {
    const files = cleanFiles(["a", "b", "c"], { "content/projects/email-scraper.mdx": "`{{TODO: x}}`" });
    const snapshot = { ...base, projects: [...published, emailScraper] };
    for (const showDrafts of [false, true]) {
      expect(collectContentIssues(snapshot, files, { ...flags, showDrafts }).some((i) => i.message.includes("placeholders"))).toBe(false);
    }
  });

  it("flags placeholders in published projects, their diagrams and the global files", () => {
    const diagram = { kind: "mermaid" as const, source: "content/diagrams/a.mmd", alt: "x".repeat(20), caption: "y".repeat(40) };
    const withDiagram = [project({ slug: "a", order: 1, diagram }), ...published.slice(1)];
    const files = cleanFiles(["a", "b", "c"], {
      "content/diagrams/a.mmd": 'A["{{TODO: tech}}"]',
      "public/diagrams/a.svg": `${hashComment('A["{{TODO: tech}}"]')}<svg/>`,
      "content/profile.ts": 'tagline: "{{TODO: tagline}}"',
    });
    const [issue] = collectContentIssues({ ...base, projects: [...withDiagram, emailScraper] }, files, flags);
    expect(issue?.message).toContain("2 content placeholders");
    expect(issue?.message).toContain("content/diagrams/a.mmd:1");
    expect(issue?.message).toContain("content/profile.ts:1");
  });

  it("applies the short-body rule to published non-featured projects", () => {
    const shortProject = project({ slug: "short", featured: false, order: 8 });
    const files = cleanFiles(["a", "b", "c"], { "content/projects/short.mdx": mdxBody(3, 90) });
    const issues = collectContentIssues({ ...base, projects: [...published, shortProject, emailScraper] }, files, flags);
    expect(issues.filter((i) => i.message.includes("Case study"))).toEqual([]);
  });

  it("flags a featured case study below 300 words", () => {
    const files = cleanFiles(["a", "b"], { "content/projects/c.mdx": mdxBody(6, 100) });
    const issues = collectContentIssues({ ...base, projects: [...published, emailScraper] }, files, flags);
    expect(issues).toContainEqual({ severity: "launch", message: expect.stringContaining('"c"') });
  });

  it("rejects references to unknown slugs and experiences", () => {
    const orphan = project({ slug: "a", experienceId: "nowhere" });
    const issues = collectContentIssues({ ...base, projects: [orphan] }, cleanFiles(["a"]), flags);
    expect(issues.filter((i) => i.severity === "error").map((i) => i.message)).toEqual([
      expect.stringContaining('unknown experience "nowhere"'),
      expect.stringContaining('Experience "altyra" references unknown project "email-scraper"'),
      expect.stringContaining('Skill "C#" references unknown project "email-scraper"'),
    ]);
  });

  it("detects out-of-date diagrams (V5)", () => {
    const diagram = { kind: "mermaid" as const, source: "content/diagrams/a.mmd", alt: "x".repeat(20), caption: "y".repeat(40) };
    const withDiagram = [project({ slug: "a", order: 1, diagram }), ...published.slice(1)];
    const current = cleanFiles(["a", "b", "c"], { "content/diagrams/a.mmd": "graph LR", "public/diagrams/a.svg": `${hashComment("graph LR")}<svg/>` });
    const stale = cleanFiles(["a", "b", "c"], { "content/diagrams/a.mmd": "graph TD", "public/diagrams/a.svg": `${hashComment("graph LR")}<svg/>` });
    expect(collectContentIssues({ ...base, projects: [...withDiagram, emailScraper] }, current, flags)).toEqual([]);
    expect(collectContentIssues({ ...base, projects: [...withDiagram, emailScraper] }, stale, flags)).toContainEqual({
      severity: "launch",
      message: 'V5: diagram out of date for "a": run pnpm diagrams',
    });
  });

  it("refuses SHOW_DRAFTS together with CONTENT_STRICT", () => {
    const issues = collectContentIssues({ ...base, projects: [...published, emailScraper] }, cleanFiles(["a", "b", "c"]), { strict: true, showDrafts: true });
    expect(issues).toContainEqual({ severity: "error", message: expect.stringContaining("SHOW_DRAFTS") });
  });
});

describe("visibility", () => {
  const draft = project({ slug: "d", status: "draft", order: 4 });
  it("hides drafts unless previewing", () => {
    expect(selectVisibleProjects([...published, draft], false).map((p) => p.slug)).toEqual(["a", "b", "c"]);
    expect(selectVisibleProjects([...published, draft], true)).toHaveLength(4);
  });

  it("orders featured projects and finds neighbours", () => {
    expect(selectFeatured([published[2]!, published[0]!]).map((p) => p.slug)).toEqual(["a", "c"]);
    expect(findAdjacent(published, "b")).toEqual({ prev: published[0], next: published[2] });
  });
});
