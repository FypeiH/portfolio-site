import { Icon } from "@/components/ui/Icon";
import { getUi } from "@/lib/content/load";

/** Non-interactive badge shown instead of a "Source" link (spec §3.4). */
export function VisibilityBadge({ visibility }: { visibility: "private" | "nda" }) {
  const ui = getUi();
  return (
    <span title={ui.privateNote} className="relative z-10 inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs text-muted">
      <Icon name="lock" />
      {visibility === "nda" ? ui.ndaProject : ui.privateProject}
      <span className="sr-only">. {ui.privateNote}</span>
    </span>
  );
}
