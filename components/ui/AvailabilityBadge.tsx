import type { Profile } from "@/lib/content/types";
import { cn } from "@/lib/cn";

const SQUARE = { open: "bg-success", selective: "bg-accent", closed: "bg-muted" } as const;

/** `[■ OPEN TO …]` in mono (visual-direction B3); the square carries the status colour. */
export function AvailabilityBadge({ availability }: { availability: Profile["availability"] }) {
  return (
    <p className="availability-badge inline-flex max-w-full items-center text-fg!">
      <span aria-hidden="true">[</span>
      <span aria-hidden="true" className={cn("size-[0.77em] shrink-0", SQUARE[availability.status])} />
      {availability.label}
      <span aria-hidden="true">]</span>
    </p>
  );
}
