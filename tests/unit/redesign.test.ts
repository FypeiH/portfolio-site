import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildEnv, BUILD_ENV_KEYS } from "@/lib/build-env";
import { PROJECTS_DIR } from "@/lib/content/conventions";
import { formatYearRange } from "@/lib/format";
import { COVER_HEIGHT, COVER_SOURCES, COVER_WIDTH, coverFor, coverPath, type CoverSlug } from "@/lib/project-covers";
import { COVERS_MANIFEST, staleCoverReasons } from "@/lib/project-covers-manifest";

describe("project covers", () => {
  it("are current for their committed sources", () => {
    expect(staleCoverReasons()).toEqual([]);
  });

  it("exist for every project, with the 16:10 size the <img> declares", () => {
    const slugs = fs.readdirSync(PROJECTS_DIR).filter((name) => name.endsWith(".mdx") && !name.startsWith("_")).map((name) => name.slice(0, -4));
    expect(slugs.length).toBeGreaterThan(0);
    for (const slug of slugs) {
      const cover = coverFor(slug);
      expect(cover, slug).toEqual({ src: expect.stringMatching(/^\/covers\/.+\.(svg|webp)$/), width: COVER_WIDTH, height: COVER_HEIGHT });
    }
    expect(COVER_WIDTH / COVER_HEIGHT).toBe(16 / 10);
  });

  it("never ship PNG/JPG, and SVG covers have no external references (an <img> would not load them)", () => {
    for (const slug of Object.keys(COVER_SOURCES) as CoverSlug[]) {
      const file = path.join("public", coverPath(slug));
      expect(file).toMatch(/\.(svg|webp)$/);
      if (!file.endsWith(".svg")) continue;
      const svg = fs.readFileSync(file, "utf8");
      expect(svg).toContain(`viewBox="0 0 ${COVER_WIDTH} ${COVER_HEIGHT}"`);
      expect(svg).not.toMatch(/(?:href|src)="(?!#|data:)/);
      expect(svg).not.toMatch(/<script|<foreignObject/i);
    }
  });

  it("are stale once a source changes or the manifest is missing", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "covers-"));
    const copy = (file: string) => {
      fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
      fs.copyFileSync(file, path.join(root, file));
    };
    copy(COVERS_MANIFEST);
    for (const slug of Object.keys(COVER_SOURCES) as CoverSlug[]) {
      copy(COVER_SOURCES[slug].file);
      copy(path.join("public", coverPath(slug)));
    }
    expect(staleCoverReasons(root)).toEqual([]);
    fs.appendFileSync(path.join(root, COVER_SOURCES["fidu-bot"].file), "\n");
    expect(staleCoverReasons(root)).toEqual(["fidu-bot: public/diagrams/fidu-bot.svg changed after the cover was made"]);
    fs.rmSync(path.join(root, COVERS_MANIFEST));
    expect(staleCoverReasons(root)).toEqual([`missing ${COVERS_MANIFEST}`]);
    fs.rmSync(root, { recursive: true, force: true });
  });
});

describe("footer build sheet", () => {
  it("inlines the commit and a build date (defaulting to the build day)", () => {
    expect(BUILD_ENV_KEYS).toContain("VERCEL_GIT_COMMIT_SHA");
    const env = buildEnv({ VERCEL_GIT_COMMIT_SHA: "3f9c2a1deadbeef" }, new Date("2026-09-30T23:30:00Z"));
    expect(env.VERCEL_GIT_COMMIT_SHA).toBe("3f9c2a1deadbeef");
    expect(env.BUILD_DATE).toBe("2026-09-30");
    expect(buildEnv({ BUILD_DATE: "2026-01-02" }).BUILD_DATE).toBe("2026-01-02");
    expect(buildEnv({}).VERCEL_GIT_COMMIT_SHA).toBe("");
  });
});

describe("formatYearRange (card bar)", () => {
  it("shows years only", () => {
    expect(formatYearRange("2024-03", "2025-02", "Present")).toBe("2024–2025");
    expect(formatYearRange("2025-07", "2025-08", "Present")).toBe("2025");
    expect(formatYearRange("2025-04", "present", "Present")).toBe("2025–Present");
    expect(formatYearRange("2025-04", undefined, "Present")).toBe("2025");
    expect(formatYearRange("{{TODO: YYYY-MM}}", "2025-01", "Present")).toBe("—–2025");
  });
});
