import type { MetadataRoute } from "next";
import { getProjects, getSite } from "@/lib/content/load";
import { known } from "@/lib/content/placeholders";
import { resolveSiteUrl } from "@/lib/env";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = resolveSiteUrl(getSite().url);
  return [
    { url: base.href, changeFrequency: "monthly", priority: 1 },
    ...getProjects().map((project) => {
      const updatedAt = known(project.updatedAt);
      return {
        url: new URL(`/projects/${project.slug}`, base).href,
        lastModified: updatedAt && `${updatedAt}-01`,
        changeFrequency: "monthly" as const,
        priority: 0.8,
      };
    }),
  ];
}
