import { ImageResponse } from "next/og";
import { getProfile, getProjectBySlug, getProjects, getUi } from "@/lib/content/load";
import { fill } from "@/lib/content/ui";
import { loadOgFonts, OG_SIZE, OgFrame, ogColors } from "@/lib/og";


const MAX_TAGS = 4;

export function generateStaticParams() {
  return getProjects().map((project) => ({ slug: project.slug }));
}

export function generateImageMetadata({ params }: { params: { slug: string } }) {
  const title = getProjectBySlug(params.slug)?.title ?? "";
  return [{ id: "og", size: OG_SIZE, contentType: "image/png", alt: fill(getUi().ogProjectAlt, { title }) }];
}

export default async function ProjectOpenGraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const project = getProjectBySlug((await params).slug);
  const fonts = await loadOgFonts();
  return new ImageResponse(
    (
      <OgFrame>
        <div style={{ fontSize: 28, color: ogColors.accent }}>{getProfile().name}</div>
        <div style={{ marginTop: 20, fontSize: 68, fontWeight: 700, maxWidth: 1000 }}>{project?.title}</div>
        <div style={{ marginTop: 24, fontSize: 30, color: ogColors.muted, maxWidth: 950 }}>{project?.summary}</div>
        <div style={{ marginTop: 40, display: "flex", gap: 12 }}>
          {project?.stack.slice(0, MAX_TAGS).map((tech) => (
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
