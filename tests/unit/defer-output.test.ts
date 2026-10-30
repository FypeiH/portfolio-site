import { describe, expect, it } from "vitest";
import { deferTargets } from "@/lib/defer-output";

const HASH = "0574d05a00dc4ddcaa8949649bd67b0cbcb30c1b51e38c4909d3404aab6791e8";

describe("defer-chunks targets (both build output layouts)", () => {
  it("picks the HTML pages under .next/server/app", () => {
    const pages = deferTargets(".next/server", [".next/server/app/index.html", ".next/server/app/index.rsc", ".next/server/pages/500.html"]);
    expect(pages).toEqual([{ path: ".next/server/app/index.html", route: "index.html" }]);
  });
  it("picks the HTML pages in the Vercel adapter's route-cache", () => {
    const index = `.next/server/route-cache/APP_PAGE/${HASH}/$/index.html`;
    const project = `.next/server/route-cache/APP_PAGE/${HASH}/$/projects/x.html`;
    const pages = deferTargets(".next/server", [index, project, ".next/server/app/robots.txt/route.js"]);
    expect(pages.map((p) => p.route)).toEqual(["index.html", "projects/x.html"]);
    expect(pages[0]?.path).toBe(index);
  });
  it("fails loudly when no prerendered index.html is found", () => {
    expect(() => deferTargets(".next/server", [".next/server/app/robots.txt/route.js"])).toThrow(/no prerendered index.html/);
    expect(() => deferTargets(".next/server", [])).toThrow(/no prerendered index.html/);
  });
});
