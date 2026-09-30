import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Diagram } from "@/components/mdx/Diagram";
import { CaseStudyLayout } from "@/components/project/CaseStudyLayout";
import { KeyFacts } from "@/components/project/KeyFacts";
import { JsonLdScript } from "@/components/ui/JsonLdScript";
import { getAdjacentProjects, getDiagramImage, getProfile, getProjectBySlug, getUi } from "@/lib/content/load";
import { known } from "@/lib/content/placeholders";
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
  const diagram = getDiagramImage(project);
  const ui = getUi();
  const keyFacts = project.visibility !== "public";

  return (
    <>
      <CaseStudyLayout project={project} prev={prev} next={next}>
        <Body
          components={{
            Diagram: () => (
              <>
                {diagram && <Diagram image={diagram} label={ui.diagramLabel} />}
                {keyFacts && <KeyFacts project={project} impact={known(project.impact)} impactLabel={ui.impactLabel} />}
              </>
            ),
          }}
        />
      </CaseStudyLayout>
      <JsonLdScript data={projectJsonLd(project, getProfile().name, siteUrl())} />
    </>
  );
}
