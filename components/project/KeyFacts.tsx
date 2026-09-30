import type { Project } from "@/lib/content/types";

interface KeyFactsLabels {
  impactLabel: string;
  problemLabel?: string;
  solutionLabel?: string;
}

/** Label + value, styled like the Impact label; without a label the value is a plain paragraph. */
function Fact({ label, value, large }: { label?: string; value: string; large?: boolean }) {
  if (!label) return <p>{value}</p>;
  return (
    <p>
      <span className="block text-sm font-medium text-accent">{label}</span>
      <span className={large ? "mt-1 block text-lg text-fg" : "mt-1 block"}>{value}</span>
    </p>
  );
}

/**
 * Spec §3.4 (private/nda): problem → solution → impact, highlighted. Text comes only from the
 * project's frontmatter; labels from site.ui (problemLabel/solutionLabel are optional). Placed once
 * by CaseStudyLayout; rendered inside `prose-case-study`, which spaces the paragraphs.
 */
export function KeyFacts({ project, impact, labels }: { project: Project; impact?: string; labels: KeyFactsLabels }) {
  return (
    <div data-key-facts="" className="my-6 rounded-xl border border-accent/40 bg-surface px-5 py-1">
      <Fact label={labels.problemLabel} value={project.problem} />
      <Fact label={labels.solutionLabel} value={project.solution} />
      {impact && <Fact label={labels.impactLabel} value={impact} large />}
    </div>
  );
}
