import { describe, expect, it } from "vitest";
import { siteUrl } from "@/lib/site-url";

describe("siteUrl", () => {
  it("prefers NEXT_PUBLIC_SITE_URL", () => {
    expect(siteUrl({ NEXT_PUBLIC_SITE_URL: "https://filipebravo.dev", VERCEL_PROJECT_PRODUCTION_URL: "x.vercel.app" }).href).toBe(
      "https://filipebravo.dev/",
    );
  });

  it("falls back to the Vercel production host", () => {
    expect(siteUrl({ VERCEL_PROJECT_PRODUCTION_URL: "portfolio-site.vercel.app" }).href).toBe("https://portfolio-site.vercel.app/");
  });

  it("falls back to localhost", () => {
    expect(siteUrl({}).href).toBe("http://localhost:3000/");
  });
});
