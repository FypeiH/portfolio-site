import { notFound } from "next/navigation";
import { getProfile, getProjectBySlug, getUi } from "@/lib/content/load";
import { OG_SIZE, ogImageResponse } from "@/lib/og";
import { ProjectOgCard } from "@/lib/og-project-card";

// Static exports, no generateImageMetadata: the build prerenders one image per published slug and
// dynamicParams = false makes every other slug a 404 without rendering or caching anything (Sonar M1).
// The per-project alt text lives in the page's generateMetadata (openGraph.images / twitter.images),
// which takes precedence over this file's metadata; `alt` here is only the generic fallback.
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = getUi().ogImageAlt;
export const dynamicParams = false;
export { projectStaticParams as generateStaticParams } from "@/lib/content/static-params";

export default async function ProjectOpenGraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug;
  const project = getProjectBySlug(slug);
  if (!project) notFound();
  return ogImageResponse(
    `/projects/${slug}`,
    <ProjectOgCard title={project.title} summary={project.summary} stack={project.stack} footer={`${getProfile().name} · Portfolio`} />,
  );
}
