import { describe, expect, it } from "vitest";
import { prerenderFiles, prerenderRoute } from "@/lib/content/build-output";

const HASH = "0574d05a00dc4ddcaa8949649bd67b0cbcb30c1b51e38c4909d3404aab6791e8";

describe("prerendered output paths (Vercel production adapter vs preview)", () => {
  it("maps the plain layout (.next/server/app)", () => {
    expect(prerenderRoute("app/index.html")).toBe("index.html");
    expect(prerenderRoute("app/projects/fidu-bot.rsc")).toBe("projects/fidu-bot.rsc");
  });
  it("maps the adapter's route-cache layout to the same route", () => {
    expect(prerenderRoute(`route-cache/APP_PAGE/${HASH}/$/index.html`)).toBe("index.html");
    expect(prerenderRoute(`route-cache/APP_PAGE/${HASH}/$/projects/fidu-bot.html`)).toBe("projects/fidu-bot.html");
    expect(prerenderRoute(`route-cache\\APP_PAGE\\${HASH}\\$\\index.html`)).toBe("index.html");
  });
  it("ignores other server output", () => {
    expect(prerenderRoute("pages/404.html")).toBeNull();
    expect(prerenderRoute("chunks/ssr/x.js")).toBeNull();
  });
  it("finds index.html in either layout", () => {
    const plain = prerenderFiles(".next/server", [".next/server/app/index.html", ".next/server/pages/500.html"]);
    const adapter = prerenderFiles(".next/server", [`.next/server/route-cache/APP_PAGE/${HASH}/$/index.html`, ".next/server/app/robots.txt/route.js"]);
    expect(plain.map((f) => f.route)).toEqual(["index.html"]);
    expect(adapter.map((f) => f.route)).toEqual(["index.html", "robots.txt/route.js"]);
  });
});
