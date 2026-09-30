import type { z } from "zod";
import type {
  DiagramSchema,
  ExperienceSchema,
  ImageRefSchema,
  LinkSchema,
  MetricSchema,
  PlaceholderSchema,
  ProfileSchema,
  ProjectFrontmatterSchema,
  SectionIdSchema,
  SiteConfigSchema,
  SkillGroupSchema,
} from "./schema";

export type Placeholder = z.infer<typeof PlaceholderSchema>;
export type Link = z.infer<typeof LinkSchema>;
export type ImageRef = z.infer<typeof ImageRefSchema>;
export type Metric = z.infer<typeof MetricSchema>;
export type Profile = z.infer<typeof ProfileSchema>;
export type Experience = z.infer<typeof ExperienceSchema>;
export type SkillGroup = z.infer<typeof SkillGroupSchema>;
export type SectionId = z.infer<typeof SectionIdSchema>;
export type SiteConfig = z.infer<typeof SiteConfigSchema>;
export type NavItem = SiteConfig["nav"][number];
export type Diagram = z.infer<typeof DiagramSchema>;
export type ProjectFrontmatter = z.infer<typeof ProjectFrontmatterSchema>;
export type ProjectVisibility = ProjectFrontmatter["visibility"];
export interface Project extends ProjectFrontmatter {
  slug: string;
}
