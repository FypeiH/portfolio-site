import { z } from "zod";
import { isYearMonth, SLUG_PATTERN, YEAR_MONTH_PATTERN } from "./conventions";

export const PlaceholderSchema = z.templateLiteral(["{{", z.string(), "}}"]);

/** Outside CONTENT_STRICT, a value that is exactly a `{{…}}` placeholder is tolerated (spec §3.3). */
const pending = <T extends z.ZodType>(schema: T) => z.union([schema, PlaceholderSchema]);

const text = (maxLength: number) => pending(z.string().trim().min(1).max(maxLength));
const uiLabel = z.string().trim().min(1).max(30);
const yearMonth = pending(z.string().regex(YEAR_MONTH_PATTERN, "Use YYYY-MM"));
const yearMonthOrPresent = z.union([yearMonth, z.literal("present")]);
const url = pending(z.url());
const slug = z.string().regex(SLUG_PATTERN, "Use kebab-case");
const publicPath = z.string().startsWith("/");

export const LinkSchema = z.object({
  kind: z.enum(["github", "linkedin", "email", "cv", "website", "repo", "demo", "docs", "notebook", "video", "paper", "other"]),
  label: text(40),
  href: url,
});

export const ImageRefSchema = z.object({
  src: publicPath,
  alt: z.string().max(125),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

export const MetricSchema = z.object({
  value: text(12),
  label: text(40),
  context: z.enum(["production", "academic", "personal", "benchmark"]),
  note: text(120).optional(),
});

const EducationSchema = z.object({
  degree: text(80),
  institution: text(60),
  start: yearMonth.optional(),
  end: yearMonthOrPresent,
  note: text(120).optional(),
});

const LanguageSchema = z.object({
  name: text(30),
  level: z.enum(["native", "advanced", "intermediate", "basic"]),
});

export const ProfileSchema = z.object({
  name: text(40),
  role: text(40),
  tagline: text(90),
  intro: text(220),
  location: text(40),
  availability: z.object({ status: z.enum(["open", "selective", "closed"]), label: text(40) }),
  lookingFor: z.object({
    roles: z.array(text(40)).min(1).max(3),
    areas: z.array(text(40)).max(5).optional(),
    workModes: z.array(pending(z.enum(["remote", "hybrid", "onsite"]))).min(1),
    locations: z.array(text(80)).min(1),
    startDate: text(60).optional(),
    note: text(200).optional(),
  }),
  about: z.array(text(350)).min(2).max(4),
  education: z.array(EducationSchema).min(1).max(3),
  languages: z.array(LanguageSchema).max(5).optional(),
  email: pending(z.email()),
  links: z.array(LinkSchema).min(2).max(5),
  cv: z.object({ href: publicPath, label: text(40), updatedAt: yearMonth }),
  avatar: ImageRefSchema.optional(),
  seo: z.object({ title: text(60), description: z.string().min(120).max(160) }),
});

export const ExperienceSchema = z
  .object({
    id: slug,
    company: text(60),
    companyUrl: url.optional(),
    role: text(60),
    employmentType: pending(z.enum(["full-time", "part-time", "internship", "freelance", "research"])),
    location: text(40).optional(),
    workMode: z.enum(["remote", "hybrid", "onsite"]).optional(),
    start: yearMonth,
    end: yearMonthOrPresent,
    summary: text(200),
    highlights: z.array(text(200)).min(1).max(3),
    stack: z.array(text(20)).min(1).max(12),
    projects: z.array(slug).optional(),
  })
  .refine((e) => isChronological(e.start, e.end), { path: ["end"], message: "end must not be before start" });

export const ExperienceListSchema = z.array(ExperienceSchema).min(1);

export const SkillGroupSchema = z.object({
  id: z.enum(["backend", "frontend", "mobile", "ai-ml", "data-automation", "infra-devops", "other"]),
  label: text(40),
  items: z.array(z.object({ name: text(30), note: text(160).optional(), projects: z.array(slug).optional() })).min(2).max(10),
});

export const SkillGroupListSchema = z
  .array(SkillGroupSchema)
  .min(1)
  .refine((groups) => groups.reduce((total, g) => total + g.items.length, 0) <= 25, "At most 25 skills in total");

export const SectionIdSchema = z.enum(["projects", "experience", "skills", "demo", "about", "contact"]);

export const SiteConfigSchema = z
  .object({
    locale: z.literal("en"),
    nav: z.array(z.object({ id: SectionIdSchema, label: text(20) })).min(1).max(6),
    features: z.object({
      demoSection: z.literal(false, "The AI demo is deferred to Phase B; demoSection must be false in v1"),
    }),
    repoUrl: url.optional(),
    builtWith: z.array(text(30)).min(1),
    demo: z.object({
      suggestedQuestions: z.array(text(120)),
      examples: z.array(z.object({ question: text(300), answer: text(1200) })),
    }),
    // Every key is a required string (checked against content/site.ts in load.ts); labels shown next to content are also non-empty.
    ui: z.object({ problemLabel: uiLabel, solutionLabel: uiLabel, impactLabel: uiLabel }).catchall(z.string()),
  })
  .refine((s) => !s.nav.some((item) => item.id === "demo"), { path: ["nav"], message: "Nav cannot link #demo in v1" });

export const DiagramSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("mermaid"),
    source: z.string().regex(/^content\/diagrams\/[a-z0-9-]+\.mmd$/),
    alt: z.string().min(20).max(160),
    caption: z.string().min(40).max(400),
  }),
  z.object({
    kind: z.literal("image"),
    src: z.string().regex(/^\/diagrams\/.+\.(svg|png|webp)$/),
    alt: z.string().min(20).max(160),
    caption: z.string().min(40).max(400),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }),
]);

export const ProjectFrontmatterSchema = z
  .strictObject({
    title: text(60),
    summary: text(140),
    problem: text(200),
    solution: text(200),
    impact: pending(z.string().trim().min(40).max(220)).optional(),
    visibility: z.enum(["public", "private", "nda"]),
    organization: text(50).optional(),
    experienceId: slug.optional(),
    confidentialityNote: text(160).optional(),
    role: pending(z.enum(["individual", "team"])),
    roleNote: text(100).optional(),
    teamSize: z.number().int().min(2).max(50).optional(),
    period: z.object({ start: yearMonth, end: yearMonthOrPresent.optional() }),
    stack: z.array(text(20)).min(2).max(8),
    metrics: z.array(MetricSchema).max(3),
    // Strict: an unknown link kind must fail loudly instead of being stripped (it happened with links.store).
    links: z.strictObject({
      repo: url.optional(),
      demo: url.optional(),
      store: url.optional(),
      docs: url.optional(),
      notebook: url.optional(),
      video: url.optional(),
    }),
    cover: ImageRefSchema.optional(),
    diagram: DiagramSchema.optional(),
    featured: z.boolean(),
    order: z.number().int().min(1),
    status: z.enum(["published", "draft"]),
    updatedAt: yearMonth,
    disclaimer: text(160).optional(),
    seo: z.object({ description: z.string().min(50).max(160).optional() }).optional(),
  })
  .superRefine((p, ctx) => {
    const issue = (path: string[], message: string) => ctx.addIssue({ code: "custom", path, message });
    if (p.visibility === "public" && !p.links.repo) issue(["links", "repo"], "V1: public projects need links.repo");
    if (p.visibility !== "public" && p.links.repo) issue(["links", "repo"], "V2: private/nda projects must not link a repo");
    if (!p.links.repo && !p.diagram) issue(["diagram"], "V3: a project without a public repo needs an architecture diagram");
    if (!p.links.repo && !p.impact) issue(["impact"], "V3: a project without a public repo needs an impact description");
    if (p.visibility === "nda" && !p.confidentialityNote) issue(["confidentialityNote"], "V4: nda projects need a confidentialityNote");
    if (p.role === "team" && !p.roleNote) issue(["roleNote"], "roleNote is required for team projects");
    if (p.period.end && !isChronological(p.period.start, p.period.end)) issue(["period", "end"], "period.end must not be before period.start");
  });

function isChronological(start: string, end: string): boolean {
  return !isYearMonth(start) || !isYearMonth(end) || start <= end;
}
