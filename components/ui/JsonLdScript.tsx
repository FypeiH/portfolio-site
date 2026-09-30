import { serializeJsonLd } from "@/lib/seo";

export function JsonLdScript({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}
