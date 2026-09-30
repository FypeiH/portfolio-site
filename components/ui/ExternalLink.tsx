import type { ComponentPropsWithoutRef } from "react";
import { getUi } from "@/lib/content/load";

type ExternalLinkProps = Omit<ComponentPropsWithoutRef<"a">, "target" | "rel"> & { href: string };

/** New-tab link that always announces "(opens in new tab)", also when it carries its own aria-label. */
export function ExternalLink({ children, "aria-label": ariaLabel, ...props }: ExternalLinkProps) {
  const newTab = getUi().externalLink;
  return (
    <a target="_blank" rel="noopener noreferrer" aria-label={ariaLabel && `${ariaLabel} ${newTab}`} {...props}>
      {children}
      {!ariaLabel && <span className="sr-only"> {newTab}</span>}
    </a>
  );
}
