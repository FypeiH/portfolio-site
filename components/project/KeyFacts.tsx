import type { Project } from "@/lib/content/types";

/**
 * Spec §3.4 (private/nda): below the diagram at the top of Architecture, problem → solution →
 * impact, highlighted. Text comes only from the project's frontmatter; rendered inside
 * `prose-case-study`, which spaces the paragraphs.
 */
export function KeyFacts({ project, impact, impactLabel }: { project: Project; impact?: string; impactLabel: string }) {
  return (
    <div className="my-6 rounded-xl border border-accent/40 bg-surface px-5 py-1">
      <p>{project.problem}</p>
      <p>{project.solution}</p>
      {impact && (
        <p>
          <span className="block text-sm font-medium text-accent">{impactLabel}</span>
          <span className="mt-1 block text-lg text-fg">{impact}</span>
        </p>
      )}
    </div>
  );
}
