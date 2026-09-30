import type { Profile } from "@/lib/content/types";
import { cn } from "@/lib/cn";

const DOT = { open: "bg-success", selective: "bg-accent", closed: "bg-muted" } as const;

export function AvailabilityBadge({ availability }: { availability: Profile["availability"] }) {
  return (
    <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-sm text-muted">
      <span aria-hidden="true" className={cn("size-2 rounded-full", DOT[availability.status])} />
      {availability.label}
    </p>
  );
}
