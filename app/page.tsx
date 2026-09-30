import { ScrollProgress } from "@/components/layout/ScrollProgress";
import { AboutSection } from "@/components/sections/AboutSection";
import { ContactSection } from "@/components/sections/ContactSection";
import { ExperienceSection } from "@/components/sections/ExperienceSection";
import { HeroSection } from "@/components/sections/HeroSection";
import { ProjectsSection } from "@/components/sections/ProjectsSection";
import { SkillsSection } from "@/components/sections/SkillsSection";
import { JsonLdScript } from "@/components/ui/JsonLdScript";
import { getExperience, getFeaturedProjects, getProfile, getProjectTitles, getSite, getSkills } from "@/lib/content/load";
import { known } from "@/lib/content/placeholders";
import { resolveSiteUrl } from "@/lib/env";
import { personJsonLd } from "@/lib/seo";

export default function HomePage() {
  const profile = getProfile();
  const skills = getSkills();
  const projectTitles = getProjectTitles();
  const github = profile.links.find((link) => link.kind === "github");

  return (
    <>
      <ScrollProgress />
      <HeroSection profile={profile} />
      <ProjectsSection projects={getFeaturedProjects()} githubUrl={known(github?.href)} />
      <ExperienceSection items={getExperience()} projectTitles={projectTitles} />
      <SkillsSection groups={skills} projectTitles={projectTitles} />
      <AboutSection profile={profile} />
      <ContactSection email={profile.email} links={profile.links} cv={profile.cv} />
      <div id="page-end" aria-hidden="true" />
      <JsonLdScript data={personJsonLd(profile, skills, resolveSiteUrl(getSite().url))} />
    </>
  );
}
