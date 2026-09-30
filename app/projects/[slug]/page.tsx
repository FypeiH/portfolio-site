import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CaseStudyLayout } from "@/components/project/CaseStudyLayout";
import { JsonLdScript } from "@/components/ui/JsonLdScript";
import { getAdjacentProjects, getDiagramImage, getDiagramSlots, getProfile, getProjectBySlug } from "@/lib/content/load";
import { baseOpenGraph } from "@/lib/metadata";
import { siteUrl } from "@/lib/site-url";
import { projectJsonLd } from "@/lib/seo";

type Params = Promise<{ slug: string }>;

export const dynamicParams = false;

export { projectStaticParams as generateStaticParams } from "@/lib/content/static-params";

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const project = getProjectBySlug((await params).slug);
  if (!project) return {};
  const url = `/projects/${project.slug}`;
  return {
    title: project.title,
    description: project.seo?.description ?? project.summary,
    alternates: { canonical: url },
    openGraph: { ...baseOpenGraph(), type: "article", title: project.title, description: project.summary, url },
  };
}

export default async function ProjectPage({ params }: { params: Params }) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project) notFound();

  const { default: Body } = await import(`@/content/projects/${slug}.mdx`);
  const { prev, next } = getAdjacentProjects(slug);

  return (
    <>
      <CaseStudyLayout project={project} prev={prev} next={next} body={Body} diagram={getDiagramImage(project)} diagramSlots={getDiagramSlots(slug)} />
      <JsonLdScript data={projectJsonLd(project, getProfile().name, siteUrl())} />
    </>
  );
}
