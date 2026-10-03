import type { Profile } from "@/lib/content/types";
import { cn } from "@/lib/cn";

const SQUARE = { open: "bg-success", selective: "bg-accent", closed: "bg-muted" } as const;

/** `[■ OPEN TO …]` in mono (visual-direction B3); the square carries the status colour. */
export function AvailabilityBadge({ availability }: { availability: Profile["availability"] }) {
  return (
    <p className="ui-label inline-flex items-center gap-2 text-fg!">
      <span aria-hidden="true">[</span>
      <span aria-hidden="true" className={cn("size-2.5", SQUARE[availability.status])} />
      {availability.label}
      <span aria-hidden="true">]</span>
    </p>
  );
}
