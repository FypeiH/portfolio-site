import type { Project } from "@/lib/content/types";

interface KeyFactsLabels {
  impactLabel: string;
  problemLabel: string;
  solutionLabel: string;
}

/** Label + value; problem, solution and impact all use the same label style. */
function Fact({ label, value, large }: { label: string; value: string; large?: boolean }) {
  return (
    <p>
      <span className="ui-label block text-accent!">{label}</span>
      <span className={large ? "mt-1 block text-lead text-fg" : "mt-1 block"}>{value}</span>
    </p>
  );
}

/**
 * Spec §3.4 (private/nda): problem → solution → impact, highlighted. Text comes only from the
 * project's frontmatter; labels from site.ui. Placed once
 * by CaseStudyLayout; rendered inside `prose-case-study`, which spaces the paragraphs.
 */
export function KeyFacts({ project, impact, labels }: { project: Project; impact?: string; labels: KeyFactsLabels }) {
  return (
    <div data-key-facts="" className="ui-panel my-6 border-accent px-5 py-1">
      <Fact label={labels.problemLabel} value={project.problem} />
      <Fact label={labels.solutionLabel} value={project.solution} />
      {impact && <Fact label={labels.impactLabel} value={impact} large />}
    </div>
  );
}
