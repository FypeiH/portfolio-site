import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildEnv, BUILD_ENV_KEYS, buildInfo } from "@/lib/build-env";
import { PROJECTS_DIR } from "@/lib/content/conventions";
import { formatYearRange } from "@/lib/format";
import { COVER_HEIGHT, COVER_SOURCES, COVER_WIDTH, coverFile, coverFor, coverInputs, type CoverSlug } from "@/lib/project-covers";
import { nestSvg, sanitizeSvg, UnsafeSvgError } from "@/lib/project-covers-compose";
import { COVERS_MANIFEST, sha256, staleCoverReasons, type CoversManifest } from "@/lib/project-covers-manifest";
import { MissingAssetError, publishAssets, publishedAssetPaths, readProjectAssets } from "@/lib/publish-assets";
import { RENDERED_DIR, renderedFile } from "@/lib/rendered-assets";

const COVER_SLUGS = Object.keys(COVER_SOURCES) as CoverSlug[];

/** A temp checkout holding only what the covers need (manifest, sources, outputs, and the script). */
function coversCheckout(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "covers-"));
  const copy = (file: string) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.copyFileSync(file, path.join(root, file));
  };
  copy(COVERS_MANIFEST);
  for (const slug of COVER_SLUGS) {
    coverInputs(COVER_SOURCES[slug]).forEach(copy);
    copy(coverFile(slug));
  }
  return root;
}

const coversCheck = (root: string) =>
  spawnSync("pnpm", ["exec", "tsx", "scripts/project-covers.ts", "--check", "--root", root], { encoding: "utf8" });

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
    for (const slug of COVER_SLUGS) {
      const file = coverFile(slug);
      expect(file).toMatch(/\.(svg|webp)$/);
      if (!file.endsWith(".svg")) continue;
      const svg = fs.readFileSync(file, "utf8");
      expect(svg).toContain(`viewBox="0 0 ${COVER_WIDTH} ${COVER_HEIGHT}"`);
      expect(svg).not.toMatch(/(?:href|src)="(?!#|data:)/);
      expect(svg).not.toMatch(/<script|<foreignObject|<\?xml|<!DOCTYPE/i);
    }
  });

  it("email-scraper and takefreetours share the client logo but are different covers", () => {
    const a = fs.readFileSync(coverFile("email-scraper"));
    const b = fs.readFileSync(coverFile("takefreetours"));
    expect(COVER_SOURCES["email-scraper"].file).toBe(COVER_SOURCES.takefreetours.file);
    expect(a.equals(b)).toBe(false);
  });

  it("are stale once a source changes or the manifest is missing", () => {
    const root = coversCheckout();
    expect(staleCoverReasons(root)).toEqual([]);
    fs.appendFileSync(path.join(root, COVER_SOURCES["fidu-bot"].file), "\n");
    expect(staleCoverReasons(root)).toEqual(["fidu-bot: assets/rendered/diagrams/fidu-bot.svg changed after the cover was made"]);
    fs.rmSync(path.join(root, COVERS_MANIFEST));
    expect(staleCoverReasons(root)).toEqual([`missing ${COVERS_MANIFEST}`]);
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("detect a tampered SVG cover and an overwritten WebP cover (output hashes)", () => {
    const root = coversCheckout();
    const svg = path.join(root, coverFile("fidu-bot"));
    fs.writeFileSync(svg, fs.readFileSync(svg, "utf8").replace("</svg>\n", '<rect width="1" height="1"/></svg>\n'));
    const webp = path.join(root, coverFile("benched"));
    fs.copyFileSync(path.join(root, coverFile("benched")), `${webp}.bak`);
    fs.writeFileSync(webp, Buffer.concat([fs.readFileSync(webp), Buffer.from([0])]));
    expect(staleCoverReasons(root)).toEqual([
      "benched: assets/rendered/covers/benched.webp was modified after it was generated",
      "fidu-bot: assets/rendered/covers/fidu-bot.svg was modified after it was generated",
    ]);
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("detect an SVG cover rewritten together with its manifest hash (regenerated in memory)", () => {
    const root = coversCheckout();
    const file = coverFile("fidu-bot");
    const forged = fs.readFileSync(path.join(root, file), "utf8").replace("#141414", "#ff0000");
    fs.writeFileSync(path.join(root, file), forged);
    const manifest = JSON.parse(fs.readFileSync(path.join(root, COVERS_MANIFEST), "utf8")) as CoversManifest;
    manifest["fidu-bot"]!.sha256 = sha256(forged);
    fs.writeFileSync(path.join(root, COVERS_MANIFEST), JSON.stringify(manifest));
    expect(staleCoverReasons(root)).toEqual(["fidu-bot: assets/rendered/covers/fidu-bot.svg differs from a fresh render"]);
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("`pnpm covers --check` exits 1 on tampering and 0 when current", () => {
    const root = coversCheckout();
    expect(coversCheck(root).status).toBe(0);
    fs.appendFileSync(path.join(root, coverFile("fidu-bot")), " ");
    const tampered = coversCheck(root);
    expect(tampered.status).toBe(1);
    expect(tampered.stderr).toContain("fidu-bot");
    fs.rmSync(root, { recursive: true, force: true });
  }, 30_000);
});

describe("cover SVG sanitizer", () => {
  const ok = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><defs><clipPath id="c"/></defs><rect clip-path="url(#c)"/><use href="#c"/><image href="data:image/png;base64,AA"/></svg>';

  it("strips the XML prologue, DOCTYPE and comments, then nests", () => {
    const withProlog = `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n<!-- Generator -->\n${ok}`;
    expect(sanitizeSvg(withProlog, "x.svg")).toBe(ok);
    expect(nestSvg(withProlog, "x.svg", { x: 1, y: 2, width: 3, height: 4 })).toMatch(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" viewBox="0 0 10 10" x="1" y="2" width="3" height="4"/);
  });

  it.each([
    ["script", '<svg><script>alert(1)</script></svg>'],
    ["foreignObject", "<svg><foreignObject><div/></foreignObject></svg>"],
    ["on* handler", '<svg onload="x()"><rect/></svg>'],
    ["on* handler on a child", "<svg><rect onclick='x()'/></svg>"],
    ["external href", '<svg><image href="https://evil.example/x.png"/></svg>'],
    ["external xlink:href", '<svg><use xlink:href="other.svg#a"/></svg>'],
    ["javascript: href", '<svg><a href="javascript:alert(1)"><text>x</text></a></svg>'],
    ["external url()", '<svg><rect style="fill:url(https://evil.example/p)"/></svg>'],
    ["@import", "<svg><style>@import 'x.css';</style></svg>"],
    ["href animation", '<svg><a><set attributeName="href" to="javascript:x"/></a></svg>'],
    ["entity declaration", '<svg><!ENTITY x "y"></svg>'],
    ["not an svg document", "<html><svg/></html>"],
  ])("rejects %s", (_name, svg) => {
    expect(() => sanitizeSvg(svg, "x.svg")).toThrow(UnsafeSvgError);
  });

  it("accepts the committed logo and diagrams", () => {
    for (const file of new Set(COVER_SLUGS.flatMap((slug) => coverInputs(COVER_SOURCES[slug])).filter((f) => f.endsWith(".svg")))) {
      expect(() => sanitizeSvg(fs.readFileSync(file, "utf8"), file)).not.toThrow();
    }
  });
});

describe("published assets (drafts never ship)", () => {
  const projects = readProjectAssets(process.cwd());
  const drafts = projects.filter((p) => p.status !== "published").map((p) => p.slug);

  it("production builds publish only published projects' covers and diagrams", () => {
    expect(drafts.length).toBeGreaterThan(0);
    const published = publishedAssetPaths(projects, false);
    for (const slug of drafts) expect(published.filter((src) => src.includes(`/${slug}.`)), slug).toEqual([]);
    expect(published).toContain("/covers/email-scraper.svg");
    expect(published).toContain("/diagrams/fidu-bot.svg");
  });

  it("preview builds publish every project's assets, and every one exists in assets/rendered", () => {
    const all = publishedAssetPaths(projects, true);
    for (const slug of drafts) expect(all.some((src) => src.includes(`/${slug}.`)), slug).toBe(true);
    for (const src of all) expect(fs.existsSync(renderedFile(src)), src).toBe(true);
  });

  it("publishAssets empties the public folders first, so assets of an earlier preview build don't linger", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "publish-"));
    fs.cpSync("content/projects", path.join(root, "content/projects"), { recursive: true });
    fs.cpSync(RENDERED_DIR, path.join(root, RENDERED_DIR), { recursive: true });
    publishAssets(root, true);
    expect(fs.existsSync(path.join(root, "public/covers/benched.webp"))).toBe(true);
    publishAssets(root, false);
    expect(fs.existsSync(path.join(root, "public/covers/benched.webp"))).toBe(false);
    expect(fs.existsSync(path.join(root, "public/covers/email-scraper.svg"))).toBe(true);
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("publishAssets throws, naming the project and file, when a shown project's image is missing (Sonar m3)", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "publish-"));
    fs.cpSync("content/projects", path.join(root, "content/projects"), { recursive: true });
    fs.cpSync(RENDERED_DIR, path.join(root, RENDERED_DIR), { recursive: true });
    fs.rmSync(path.join(root, RENDERED_DIR, "diagrams/fidu-bot.svg"));
    let error: unknown;
    try {
      publishAssets(root, false);
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(MissingAssetError);
    expect((error as MissingAssetError).slug).toBe("fidu-bot");
    expect((error as Error).message).toContain("fidu-bot");
    expect((error as Error).message).toContain("assets/rendered/diagrams/fidu-bot.svg");
    // A missing draft image fails preview builds too, but not production builds, which don't ship it.
    fs.cpSync(path.join(RENDERED_DIR, "diagrams/fidu-bot.svg"), path.join(root, RENDERED_DIR, "diagrams/fidu-bot.svg"));
    fs.rmSync(path.join(root, RENDERED_DIR, "covers/benched.webp"));
    expect(() => publishAssets(root, true)).toThrow(/"benched".*assets\/rendered\/covers\/benched\.webp/);
    expect(() => publishAssets(root, false)).not.toThrow();
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

describe("footer build info", () => {
  it("takes the copyright year from BUILD_DATE, not the clock", () => {
    expect(buildInfo({ VERCEL_GIT_COMMIT_SHA: "3f9c2a1deadbeef", BUILD_DATE: "2026-12-31" })).toEqual({ commit: "3f9c2a1", date: "2026-12-31", year: 2026 });
    expect(buildInfo({})).toEqual({ commit: "local", date: undefined, year: undefined });
  });
});

describe("case-study OG image alt (QA r2 N3)", () => {
  it("is built per project from site.ui.ogProjectAlt", async () => {
    const { site } = await import("@/content/site");
    const { fill } = await import("@/lib/content/ui");
    expect(site.ui.ogProjectAlt).toContain("{title}");
    expect(fill(site.ui.ogProjectAlt, { title: "Email Scraper" })).toBe(site.ui.ogProjectAlt.replace("{title}", "Email Scraper"));
    expect(fill(site.ui.ogProjectAlt, { title: "A" })).not.toBe(fill(site.ui.ogProjectAlt, { title: "B" }));
  });
});
