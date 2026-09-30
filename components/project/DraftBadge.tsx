import { getUi } from "@/lib/content/load";

/** Only reachable in preview mode (SHOW_DRAFTS=true): drafts are never rendered otherwise. */
export function DraftBadge() {
  return (
    <span className="inline-flex items-center rounded-full border border-dashed border-accent px-2.5 py-1 text-xs text-accent">
      {getUi().draftBadge}
    </span>
  );
}
