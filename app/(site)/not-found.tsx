import type { Metadata } from "next";
import { NotFoundContent } from "@/components/layout/NotFoundContent";
import { getUi } from "@/lib/content/load";

export function generateMetadata(): Metadata {
  return { title: getUi().metaNotFoundTitle };
}

export default function NotFound() {
  return <NotFoundContent />;
}
