import type { MDXComponents } from "mdx/types";

/** Required by @next/mdx. Case-study components are injected per page (see app/projects/[slug]/page.tsx). */
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return components;
}
