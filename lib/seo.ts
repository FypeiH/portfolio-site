import { known } from "@/lib/content/placeholders";
import type { Profile, Project, SkillGroup } from "@/lib/content/types";

type JsonLd = Record<string, unknown>;

export function personJsonLd(profile: Profile, skills: readonly SkillGroup[], siteUrl: URL): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.name,
    jobTitle: profile.role,
    url: siteUrl.href,
    email: known(profile.email) && `mailto:${profile.email}`,
    image: profile.avatar && new URL(profile.avatar.src, siteUrl).href,
    sameAs: profile.links.flatMap((link) => known(link.href) ?? []),
    alumniOf: [...new Set(profile.education.map((entry) => entry.institution))].map((name) => ({ "@type": "EducationalOrganization", name })),
    knowsAbout: skills.flatMap((group) => group.items.map((item) => item.name)),
  };
}

/** SoftwareSourceCode only for public projects; private and NDA work is a plain CreativeWork (spec §7.1). */
export function projectJsonLd(project: Project, author: string, siteUrl: URL): JsonLd {
  const base = {
    "@context": "https://schema.org",
    name: project.title,
    description: project.summary,
    url: new URL(`/projects/${project.slug}`, siteUrl).href,
    author: { "@type": "Person", name: author },
    keywords: project.stack.join(", "),
  };
  const repo = known(project.links.repo);
  return project.visibility === "public" && repo
    ? { ...base, "@type": "SoftwareSourceCode", codeRepository: repo }
    : { ...base, "@type": "CreativeWork" };
}

/** Serialises JSON-LD safely for an inline <script>. */
export function serializeJsonLd(data: JsonLd): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
