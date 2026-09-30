import createMDX from "@next/mdx";
import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-Frame-Options", value: "DENY" },
];

/** Same test as lib/env.ts; evaluated at build time, which is when Vercel sets VERCEL_ENV too. */
const isProductionBuild = process.env.VERCEL_ENV === "production";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Keeps the analytics client chunk out of preview and local builds, where it is never rendered.
  turbopack: isProductionBuild ? {} : { resolveAlias: { "@vercel/analytics/next": "./components/analytics/AnalyticsOff.tsx" } },
  images: { formats: ["image/avif", "image/webp"] },
  async redirects() {
    return [{ source: "/projects", destination: "/#projects", permanent: true }];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

const withMDX = createMDX({
  options: {
    remarkPlugins: ["remark-frontmatter", "remark-gfm"],
  },
});

export default withMDX(nextConfig);
