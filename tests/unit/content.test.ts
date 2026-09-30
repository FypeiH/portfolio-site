import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { describe, expect, it } from "vitest";
import { experience } from "@/content/experience";
import { profile } from "@/content/profile";
import { site } from "@/content/site";
import { skills } from "@/content/skills";
import { repoFiles } from "@/lib/content/repo-files";
import { collectContentIssues } from "@/lib/content/rules";
import { ExperienceListSchema, ProfileSchema, ProjectFrontmatterSchema, SiteConfigSchema, SkillGroupListSchema } from "@/lib/content/schema";
import { parseContent } from "@/lib/content/validate";

const root = path.resolve(import.meta.dirname, "../..");
const files = repoFiles(root);
const projects = fs
  .readdirSync(path.join(root, "content/projects"))
  .filter((name) => name.endsWith(".mdx") && !name.startsWith("_"))
  .map((name) => {
    const file = `content/projects/${name}`;
    return { ...parseContent(ProjectFrontmatterSchema, matter(files.read(file) ?? "").data, file), slug: name.replace(/\.mdx$/, "") };
  });
const snapshot = {
  site: parseContent(SiteConfigSchema, site, "site"),
  profile: parseContent(ProfileSchema, profile, "profile"),
  experience: parseContent(ExperienceListSchema, experience, "experience"),
  skills: parseContent(SkillGroupListSchema, skills, "skills"),
  projects,
};

describe("current content (Will, rev. 2)", () => {
  it("passes every schema and has no hard errors, in both preview and default mode", () => {
    for (const showDrafts of [false, true]) {
      expect(collectContentIssues(snapshot, files, { strict: false, showDrafts }).filter((i) => i.severity === "error")).toEqual([]);
    }
  });

  it("frozen content (rev. 6): 3 featured published and no placeholders in published content", () => {
    const published = projects.filter((p) => p.status === "published");
    expect(published.filter((p) => p.featured).map((p) => p.slug).sort()).toEqual(["email-scraper", "fidu-bot", "portfolio-site"]);
    expect(projects.find((p) => p.slug === "dynamic-cv")?.featured).toBe(false);
    const messages = collectContentIssues(snapshot, files, { strict: true, showDrafts: false }).map((i) => i.message);
    expect(messages.filter((m) => m.includes("placeholders") || m.includes("featured projects are published"))).toEqual([]);
  });

  it("resolves every project-to-experience reference (V7), including the altyra-internship split", () => {
    const experienceIds = new Set(snapshot.experience.map((e) => e.id));
    for (const p of projects) if (p.experienceId) expect(experienceIds).toContain(p.experienceId);
    expect(projects.find((p) => p.slug === "takefreetours")?.experienceId).toBe("altyra-internship");
    expect(projects.find((p) => p.slug === "benched")?.experienceId).toBe("altyra-internship");
  });

  it("keeps Benched's links.store after zod parsing (not stripped)", () => {
    const benched = projects.find((p) => p.slug === "benched");
    expect(benched?.links.store).toMatch(/^https:\/\/apps\.apple\.com\//);
    expect(benched?.links.demo).toBeUndefined();
  });

  it("never publishes a phone number", () => {
    const shipped = ["content/site.ts", "content/profile.ts", "content/experience.ts", ...projects.map((p) => `content/projects/${p.slug}.mdx`)];
    for (const file of shipped) expect(files.read(file)).not.toMatch(/\+351|\b9\d{2}\s?\d{3}\s?\d{3}\b/);
  });
});
