import { getUi } from "@/lib/content/load";

/** Non-interactive badge shown instead of a "Source" link (spec §3.4). */
export function VisibilityBadge({ visibility }: { visibility: "private" | "nda" }) {
  const ui = getUi();
  return (
    <span title={ui.privateNote} className="ui-tag relative z-10 text-fg">
      {visibility === "nda" ? ui.ndaProject : ui.privateProject}
      <span className="sr-only">. {ui.privateNote}</span>
    </span>
  );
}
