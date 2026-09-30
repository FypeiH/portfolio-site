import Link from "next/link";
import type { ComponentProps } from "react";

type HomeLinkProps = Omit<ComponentProps<typeof Link>, "href" | "prefetch"> & { href: "/" | `/#${string}` };

/**
 * Link to the home page or one of its sections. Never prefetched, so case studies don't download
 * the home page's code up front; navigation stays client-side on click.
 */
export function HomeLink(props: HomeLinkProps) {
  return <Link {...props} prefetch={false} />;
}
