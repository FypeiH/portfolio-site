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
    const source = path.join(root, COVER_SOURCES["fidu-bot"].file);
    // Bytes outside the drawing (trailing newline, comments) don't count: SVG sources are hashed sanitized.
    fs.appendFileSync(source, "\n<!-- re-rendered -->\n");
    expect(staleCoverReasons(root)).toEqual([]);
    const svg = fs.readFileSync(source, "utf8");
    fs.writeFileSync(source, svg.replace(/<\/svg>(?![\s\S]*<\/svg>)/, '<rect width="1" height="1"/></svg>'));
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
  const SVG = 'xmlns="http://www.w3.org/2000/svg"';
  const ok = `<svg ${SVG} viewBox="0 0 10 10"><defs><clipPath id="c"><rect width="1" height="1"/></clipPath></defs><style>.a{fill:url(#c)} @keyframes k{from{opacity:0}}</style><rect clip-path="url(#c)" style="fill:#fff" data-id="x"/><text x="1">Hi &amp; bye</text></svg>`;

  it("strips the XML prologue, DOCTYPE and comments, re-serialises the checked tree, then nests", () => {
    const withProlog = `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n<!-- Generator -->\n${ok.replace("<defs>", "<!-- inner --><defs>")}`;
    expect(sanitizeSvg(withProlog, "x.svg")).toBe(ok);
    expect(nestSvg(withProlog, "x.svg", { x: 1, y: 2, width: 3, height: 4 })).toMatch(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" viewBox="0 0 10 10" x="1" y="2" width="3" height="4"/);
  });

  it.each([
    ["script", `<svg ${SVG}><script>alert(1)</script></svg>`],
    ["foreignObject", `<svg ${SVG}><foreignObject><div/></foreignObject></svg>`],
    ["on* handler on the root", `<svg ${SVG} onload="x()"><rect/></svg>`],
    ["on* handler on a child", `<svg ${SVG}><rect onclick='x()'/></svg>`],
    ["external href", `<svg ${SVG}><image href="https://evil.example/x.png"/></svg>`],
    ["external xlink:href", `<svg ${SVG} xmlns:xlink="http://www.w3.org/1999/xlink"><use xlink:href="other.svg#a"/></svg>`],
    ["javascript: href", `<svg ${SVG}><a href="javascript:alert(1)"><text>x</text></a></svg>`],
    ["external url()", `<svg ${SVG}><rect style="fill:url(https://evil.example/p)"/></svg>`],
    ["external url() in a presentation attribute", `<svg ${SVG}><rect fill="url(https://evil.example/p)"/></svg>`],
    ["@import", `<svg ${SVG}><style>@import 'x.css';</style></svg>`],
    ["href animation", `<svg ${SVG}><a><set attributeName="href" to="javascript:x"/></a></svg>`],
    ["entity declaration", `<!DOCTYPE svg [<!ENTITY x "y">]><svg ${SVG}><text>&x;</text></svg>`],
    ["not an svg document", "<html><svg/></html>"],
    ["malformed XML", `<svg ${SVG}><rect></svg>`],
    // QA r3 bypasses of the regex sanitizer:
    ["SVG-namespace prefix <s:script>", '<svg xmlns="http://www.w3.org/2000/svg" xmlns:s="http://www.w3.org/2000/svg"><s:script>alert(1)</s:script></svg>'],
    ["XHTML <h:script>", `<svg ${SVG} xmlns:h="http://www.w3.org/1999/xhtml"><h:script>alert(1)</h:script></svg>`],
    ["SVG-namespace prefix <s:foreignObject>", `<svg ${SVG} xmlns:s="http://www.w3.org/2000/svg"><s:foreignObject><div xmlns="http://www.w3.org/1999/xhtml">x</div></s:foreignObject></svg>`],
    ["CSS escape @\\69mport", `<svg ${SVG}><style>@\\69mport 'https://evil.example/x.css';</style></svg>`],
    ["CSS escape \\75rl()", `<svg ${SVG}><rect style="fill:\\75rl(https://evil.example/p)"/></svg>`],
    ["CSS comment hiding a token", `<svg ${SVG}><style>.a{fill:u/**/rl(https://evil.example/p)}</style></svg>`],
    ["data:text/html href", `<svg ${SVG}><a href="data:text/html,&lt;script&gt;alert(1)&lt;/script&gt;"><text>x</text></a></svg>`],
    ["data: url()", `<svg ${SVG}><rect style="fill:url(data:image/svg+xml,x)"/></svg>`],
    ["unknown attribute", `<svg ${SVG}><rect formaction="x"/></svg>`],
    ["foreign-namespace attribute", `<svg ${SVG} xmlns:ev="http://www.w3.org/2001/xml-events"><rect ev:event="click"/></svg>`],
    ["foreign xmlns declaration", `<svg ${SVG} xmlns:h="http://www.w3.org/1999/xhtml"><rect/></svg>`],
    ["processing instruction", `<svg ${SVG}><?xml-stylesheet href="x.css"?><rect/></svg>`],
  ])("rejects %s", (_name, svg) => {
    expect(() => sanitizeSvg(svg, "x.svg")).toThrow(UnsafeSvgError);
  });

  it("allows only same-document fragment references", () => {
    expect(() => sanitizeSvg(`<svg ${SVG}><rect clip-path="url(#c)" fill="url('#g')"/></svg>`, "x.svg")).not.toThrow();
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

describe("case-study OG image URL cache-buster", () => {
  const card = { slug: "email-scraper", title: "Email Scraper", summary: "Pulls bookings.", stack: ["Python", "Gmail API", "Sheets", "Cron", "Extra"] };

  it("is the prerendered path plus a 16-hex hash, stable for the same card", async () => {
    const { projectOgImagePath, projectOgImages } = await import("@/lib/metadata");
    const url = projectOgImagePath(card);
    expect(url).toMatch(/^\/projects\/email-scraper\/opengraph-image\?[0-9a-f]{16}$/);
    expect(projectOgImagePath({ ...card })).toBe(url);
    expect(projectOgImages(card)[0]).toMatchObject({ url, width: 1200, height: 630 });
  });

  it("changes when anything the card draws changes, not otherwise", async () => {
    const { projectOgImagePath } = await import("@/lib/metadata");
    const url = projectOgImagePath(card);
    expect(projectOgImagePath({ ...card, title: "Email Scraper 2" })).not.toBe(url);
    expect(projectOgImagePath({ ...card, summary: "Other." })).not.toBe(url);
    expect(projectOgImagePath({ ...card, stack: ["Go", ...card.stack.slice(1)] })).not.toBe(url);
    // Only the first OG_MAX_TAGS tags are drawn.
    expect(projectOgImagePath({ ...card, stack: [...card.stack.slice(0, 4), "Other"] })).toBe(url);
  });
});
