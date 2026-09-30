import { describe, expect, it } from "vitest";
import { ProjectFrontmatterSchema } from "@/lib/content/schema";
import { privateProject, publicProject } from "./fixtures";

const issues = (data: unknown) => {
  const result = ProjectFrontmatterSchema.safeParse(data);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe("ProjectFrontmatterSchema visibility rules (spec §3.3)", () => {
  it("V1: rejects a public project without a repo", () => {
    expect(issues({ ...publicProject, links: {} })).toContain("V1: public projects need links.repo");
  });

  it("V2: rejects a private project that links a repo", () => {
    expect(issues({ ...privateProject, links: { repo: "https://github.com/x/y" } })).toContain(
      "V2: private/nda projects must not link a repo",
    );
  });

  it("V3: rejects a private project without a diagram", () => {
    const { diagram: _diagram, ...withoutDiagram } = privateProject;
    expect(issues(withoutDiagram)).toContain("V3: a project without a public repo needs an architecture diagram");
  });

  it("V3: rejects a private project without an impact", () => {
    const { impact: _impact, ...withoutImpact } = privateProject;
    expect(issues(withoutImpact)).toContain("V3: a project without a public repo needs an impact description");
  });

  it("V4: rejects an nda project without a confidentiality note", () => {
    expect(issues({ ...privateProject, visibility: "nda" })).toContain("V4: nda projects need a confidentialityNote");
  });

  it("accepts a complete private project", () => {
    expect(issues(privateProject)).toEqual([]);
  });

  it("accepts a public project with a repo and no diagram", () => {
    expect(issues(publicProject)).toEqual([]);
  });

  it("requires a roleNote for team projects", () => {
    expect(issues({ ...publicProject, role: "team" })).toContain("roleNote is required for team projects");
  });

  it("accepts an App Store link as links.store and rejects a non-URL", () => {
    expect(issues({ ...privateProject, links: { store: "https://apps.apple.com/app/id1" } })).toEqual([]);
    expect(issues({ ...privateProject, links: { store: "App Store" } })).not.toEqual([]);
  });

  it("fails loudly on unknown link kinds and unknown frontmatter keys instead of stripping them", () => {
    expect(issues({ ...publicProject, links: { ...publicProject.links, appstore: "https://apps.apple.com/app/id1" } })).not.toEqual([]);
    expect(issues({ ...publicProject, feautred: true })).not.toEqual([]);
  });

  it("tolerates an exact placeholder in a formatted field but not a malformed value", () => {
    expect(issues({ ...publicProject, role: "{{TODO: individual | team}}" })).toEqual([]);
    expect(issues({ ...publicProject, updatedAt: "Aug 2025" })).not.toEqual([]);
  });

  it("rejects a period that ends before it starts", () => {
    expect(issues({ ...publicProject, period: { start: "2025-08", end: "2025-07" } })).toContain(
      "period.end must not be before period.start",
    );
  });
});
