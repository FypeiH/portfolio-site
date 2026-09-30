import type { ReactNode } from "react";
import type { SectionId } from "@/lib/content/types";

interface SectionProps {
  id: SectionId;
  title: string;
  intro?: string;
  children: ReactNode;
}

export function Section({ id, title, intro, children }: SectionProps) {
  const headingId = `${id}-heading`;
  return (
    <section id={id} aria-labelledby={headingId} className="scroll-mt-16 py-20 md:py-28">
      <div className="mx-auto max-w-5xl px-5 md:px-8">
        <h2 id={headingId} className="ui-h2">
          {title}
        </h2>
        {intro && <p className="mt-3 max-w-2xl text-muted">{intro}</p>}
        <div className="mt-10">{children}</div>
      </div>
    </section>
  );
}
