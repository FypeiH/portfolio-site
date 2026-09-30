import type { ReactNode } from "react";

export function Callout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <aside className="rounded-xl border border-border border-l-accent bg-surface p-5 [border-left-width:3px]">
      <p className="font-medium">{title}</p>
      <div className="mt-1 text-sm text-muted">{children}</div>
    </aside>
  );
}
