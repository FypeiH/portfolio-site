import { getUi } from "@/lib/content/load";

/** Only reachable in preview mode (SHOW_DRAFTS=true): drafts are never rendered otherwise. */
export function DraftBadge() {
  return <span className="ui-tag border-dashed border-accent text-accent">{getUi().draftBadge}</span>;
}
