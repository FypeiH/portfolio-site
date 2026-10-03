import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { getProfile, getProjectBySlug } from "@/lib/content/load";
import { PROJECT_OG_IMAGE_ID, projectOgAlt } from "@/lib/metadata";
import { loadOgFonts, OG_SIZE, OgFrame, ogColors } from "@/lib/og";

const MAX_TAGS = 4;

// One image per slug the page renders (same static params). generateImageMetadata gives each case
// study its own og:image:alt / twitter:image:alt (QA FIL-8 r2, N3); the image URL is
// /projects/<slug>/opengraph-image/card. dynamicParams stays on here (Next doesn't prerender the
// metadata id segment from generateStaticParams), so the 404 for drafts and unknown slugs comes from
// generateImageMetadata (no image) and notFound() below; content flags are build-time (lib/build-env.ts).
export const contentType = "image/png";
export { projectStaticParams as generateStaticParams } from "@/lib/content/static-params";

export function generateImageMetadata({ params }: { params: { slug: string } }) {
  const project = getProjectBySlug(params.slug);
  return project ? [{ id: PROJECT_OG_IMAGE_ID, alt: projectOgAlt(project.title), size: OG_SIZE, contentType }] : [];
}

export default async function ProjectOpenGraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const project = getProjectBySlug((await params).slug);
  if (!project) notFound();
  const fonts = await loadOgFonts();
  return new ImageResponse(
    (
      <OgFrame>
        <div style={{ fontSize: 28, color: ogColors.accent }}>{getProfile().name}</div>
        <div style={{ marginTop: 20, fontSize: 68, fontWeight: 700, maxWidth: 1000 }}>{project.title}</div>
        <div style={{ marginTop: 24, fontSize: 30, color: ogColors.muted, maxWidth: 950 }}>{project.summary}</div>
        <div style={{ marginTop: 40, display: "flex", gap: 12 }}>
          {project.stack.slice(0, MAX_TAGS).map((tech) => (
            <div key={tech} style={{ fontSize: 24, padding: "8px 18px", border: `1px solid ${ogColors.border}`, borderRadius: 9999, color: ogColors.fg }}>
              {tech}
            </div>
          ))}
        </div>
      </OgFrame>
    ),
    { ...OG_SIZE, fonts },
  );
}
