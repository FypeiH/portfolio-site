import type { ReactNode } from "react";

export function Callout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <aside className="ui-panel border-l-accent p-5 [border-left-width:6px]">
      <p className="ui-label text-fg!">{title}</p>
      <div className="mt-2 text-sm text-muted">{children}</div>
    </aside>
  );
}
