import { notFound } from "next/navigation";
import { getProfile, getProjectBySlug, getUi } from "@/lib/content/load";
import { OG_SIZE, OgFrame, ogColors, ogImageResponse, OgLabel } from "@/lib/og";
import { OG_MAX_TAGS } from "@/lib/og-size";

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
  // Anton is condensed: ~30 uppercase characters fit a line at 88 px; longer titles (≤ 60) step down.
  const titleSize = project.title.length <= 30 ? 88 : 68;
  return ogImageResponse(
    `/projects/${slug}`,
    <OgFrame footer={`${getProfile().name} · Portfolio`}>
      <OgLabel>Case study</OgLabel>
      <div style={{ marginTop: 22, fontFamily: "Anton", fontSize: titleSize, lineHeight: 1.05, textTransform: "uppercase", maxWidth: 1000 }}>{project.title}</div>
      <div style={{ marginTop: 22, fontSize: 28, lineHeight: 1.35, color: ogColors.muted, maxWidth: 960 }}>{project.summary}</div>
      <div style={{ marginTop: 32, display: "flex", gap: 14 }}>
        {project.stack.slice(0, OG_MAX_TAGS).map((tech) => (
          <div
            key={tech}
            style={{ fontSize: 20, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", padding: "8px 16px", border: `2px solid ${ogColors.borderStrong}`, color: ogColors.fg }}
          >
            {tech}
          </div>
        ))}
      </div>
    </OgFrame>,
  );
}
