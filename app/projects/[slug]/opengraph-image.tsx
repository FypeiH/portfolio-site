import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { getProfile, getProjectBySlug, getUi } from "@/lib/content/load";
import { loadOgFonts, OG_SIZE, OgFrame, ogColors } from "@/lib/og";

const MAX_TAGS = 4;

// Static exports (no generateImageMetadata): the build prerenders one image per slug the page
// renders, and every other slug is a 404 whatever the runtime env says (QA FIL-8).
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = getUi().ogImageAlt;
export const dynamicParams = false;
export { projectStaticParams as generateStaticParams } from "@/lib/content/static-params";

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
