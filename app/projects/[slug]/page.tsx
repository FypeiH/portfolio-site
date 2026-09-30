import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Diagram } from "@/components/mdx/Diagram";
import { CaseStudyLayout } from "@/components/project/CaseStudyLayout";
import { JsonLdScript } from "@/components/ui/JsonLdScript";
import { getAdjacentProjects, getDiagramImage, getProfile, getProjectBySlug, getProjects, getUi } from "@/lib/content/load";
import { siteUrl } from "@/lib/site-url";
import { projectJsonLd } from "@/lib/seo";

type Params = Promise<{ slug: string }>;

export const dynamicParams = false;

export function generateStaticParams() {
  return getProjects().map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const project = getProjectBySlug((await params).slug);
  if (!project) return {};
  const url = `/projects/${project.slug}`;
  return {
    title: project.title,
    description: project.seo?.description ?? project.summary,
    alternates: { canonical: url },
    openGraph: { type: "article", title: project.title, description: project.summary, url },
  };
}

export default async function ProjectPage({ params }: { params: Params }) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project) notFound();

  const { default: Body } = await import(`@/content/projects/${slug}.mdx`);
  const { prev, next } = getAdjacentProjects(slug);
  const diagram = getDiagramImage(project);
  const diagramLabel = getUi().diagramLabel;

  return (
    <>
      <CaseStudyLayout project={project} prev={prev} next={next}>
        <Body components={{ Diagram: () => (diagram ? <Diagram image={diagram} label={diagramLabel} /> : null) }} />
      </CaseStudyLayout>
      <JsonLdScript data={projectJsonLd(project, getProfile().name, siteUrl())} />
    </>
  );
}
